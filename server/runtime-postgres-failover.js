"use strict";

const { clusterStatus } = require("./postgres-cluster");
const { selectAuthoritativePostgresNode } = require("./postgres-leader");

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

function createRuntimePostgresFailover({ nodes, createStore, storeOptions, onPromote, onStatus = () => {}, onError = () => {} }) {
  let currentNodes = nodes;
  let running = null;

  async function promote() {
    const selection = await selectAuthoritativePostgresNode(currentNodes);
    if (!selection.failedOver) throw new Error("No verified PostgreSQL replica is ready for runtime failover");
    const cluster = stateCluster(selection.nodes, onStatus);
    const store = createStore(cluster, storeOptions);
    const state = typeof store.sharedSnapshot === "function"
      ? await store.sharedSnapshot()
      : await store.snapshot();
    currentNodes = selection.nodes;
    await onPromote({ node: selection.selected, revision: selection.revision, state, store });
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
