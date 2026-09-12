"use strict";

const { clusterStatus } = require("./postgres-cluster");
const { assertMinimumStateRevision, selectAuthoritativePostgresNode } = require("./postgres-leader");

function stateCluster(nodes, onStatus) {
  const cluster = {
    nodes,
    onStatus,
    markSuccess(index) {
      const node = nodes[index];
      node.healthy = true;
      node.error = "";
      node.lastSuccessAt = new Date().toISOString();
    },
    markFailure(index, error) {
      const node = nodes[index];
      node.healthy = false;
      node.error = String(error?.message || error);
      node.lastErrorAt = new Date().toISOString();
    },
    status: () => clusterStatus(nodes, nodes[0]?.name || "")
  };
  return cluster;
}

function createRuntimePostgresFailover({ nodes, createStore, storeOptions, onPromote, allowFailover = true, getMinimumRevision = () => 0n, canPromote = () => true, onStatus = () => {}, onError = () => {} }) {
  let currentNodes = nodes;
  let running = null;

  function requireIdleWriter() {
    if (canPromote()) return;
    const error = new Error("PostgreSQL transaction is still active; runtime failover must wait for its outcome");
    error.code = "PPR_STATE_WRITE_IN_FLIGHT";
    error.statusCode = 503;
    throw error;
  }

  async function promote() {
    if (!allowFailover) {
      const error = new Error("Automatic PostgreSQL runtime failover is disabled");
      error.code = "PPR_PRIMARY_PROBE_UNAVAILABLE";
      throw error;
    }
    requireIdleWriter();
    const selection = await selectAuthoritativePostgresNode(currentNodes, { minimumRevision: getMinimumRevision() });
    if (!selection.failedOver) throw new Error("No verified PostgreSQL replica is ready for runtime failover");
    const cluster = stateCluster(selection.nodes, onStatus);
    let published = false;
    const store = createStore(cluster, { ...storeOptions, onExternalState(state, sourceStore) {
      // Loading a candidate must not publish its state before the final guards.
      if (published) storeOptions?.onExternalState?.(state, sourceStore);
    } });
    const state = typeof store.sharedSnapshot === "function"
      ? await store.sharedSnapshot()
      : await store.snapshot();
    // A primary commit can finish while the replica probe/read is in flight.
    // Recheck the current floor immediately before replacing the active store.
    const revision = typeof store.failoverRevision === "function" ? store.failoverRevision() : selection.revision;
    requireIdleWriter();
    assertMinimumStateRevision(revision, getMinimumRevision());
    selection.revision = revision;
    currentNodes = selection.nodes;
    await onPromote({ node: selection.selected, revision: selection.revision, state, store });
    published = true;
    storeOptions?.onExternalState?.(state, store);
    return selection;
  }

  function schedule() {
    if (running) return running;
    running = new Promise(resolve => setTimeout(resolve, 0))
      .then(promote)
      .catch(onError)
      .finally(() => { running = null; });
    return running;
  }

  return { promote, schedule, running: () => running };
}

module.exports = { createRuntimePostgresFailover, stateCluster };
