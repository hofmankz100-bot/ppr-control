"use strict";

const { selectAuthoritativePostgresNode } = require("./postgres-leader");

function clusterStatus(nodes, active = "") {
  return {
    active,
    nodes: nodes.map(node => ({
      name: node.name,
      healthy: Boolean(node.healthy),
      lastSuccessAt: node.lastSuccessAt || "",
      lastErrorAt: node.lastErrorAt || "",
      error: node.error || ""
    }))
  };
}

async function createPostgresCluster(configured, {
  Pool,
  MultiPostgres,
  allowFailover = true,
  useSsl = false,
  poolSize = 5,
  connectTimeoutMs = 8000,
  onStatus = () => {},
  onPoolError = () => {}
} = {}) {
  let nodes = configured.map(item => ({
    ...item,
    healthy: false,
    error: "",
    pool: new Pool({
      connectionString: item.connectionString,
      ssl: useSsl || /(?:neon\.tech|supabase\.(?:co|com)|pooler\.supabase\.com|aivencloud\.com)/i.test(item.connectionString)
        ? { rejectUnauthorized: false }
        : false,
      max: poolSize,
      connectionTimeoutMillis: connectTimeoutMs,
      idleTimeoutMillis: 30000
    })
  }));

  // pg-pool can emit an idle-client error as soon as a probe returns. Attach a
  // temporary listener before probing; MultiPostgres replaces it after leader
  // selection, so there is always exactly one error handler per pool.
  for (const node of nodes) {
    node.startupErrorListener = error => {
      node.healthy = false;
      node.error = String(error?.message || error);
      node.lastErrorAt = new Date().toISOString();
      onStatus(clusterStatus(nodes));
      onPoolError(error, node.name);
    };
    node.pool.on?.("error", node.startupErrorListener);
  }

  await Promise.allSettled(nodes.map(async node => {
    try {
      await node.pool.query("SELECT now()");
      node.healthy = true;
      node.error = "";
      node.lastSuccessAt = new Date().toISOString();
    } catch (error) {
      node.healthy = false;
      node.error = String(error?.message || error);
      node.lastErrorAt = new Date().toISOString();
    }
  }));

  let leader;
  try {
    leader = await selectAuthoritativePostgresNode(nodes, { allowFailover });
  } catch (error) {
    onStatus(clusterStatus(nodes));
    await Promise.allSettled(nodes.map(node => node.pool.end()));
    throw error;
  }
  nodes = leader.nodes;
  for (const node of nodes) {
    node.pool.removeListener?.("error", node.startupErrorListener);
    delete node.startupErrorListener;
  }
  const pool = new MultiPostgres(nodes, { onStatus, onPoolError });
  return { leader, nodes, pool };
}

module.exports = { clusterStatus, createPostgresCluster };
