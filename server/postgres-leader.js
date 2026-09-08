"use strict";

function stateProbeSql() {
  return `SELECT state_revision::text AS state_revision,
    date_trunc('milliseconds', updated_at)::text AS updated_at
    FROM ppr_settings WHERE setting_key='full_state' LIMIT 1`;
}

function missingSchema(error) {
  return ["42P01", "42703"].includes(String(error?.code || ""));
}

async function inspectNode(node, index) {
  if (!node?.healthy || !node.pool?.query) return { node, index, reachable: false, hasState: false };
  try {
    const result = await node.pool.query(stateProbeSql());
    const row = result.rows?.[0];
    if (!row) return { node, index, reachable: true, hasState: false };
    return {
      node,
      index,
      reachable: true,
      hasState: true,
      revision: BigInt(row.state_revision || 0),
      updatedAt: String(row.updated_at || "")
    };
  } catch (error) {
    if (missingSchema(error)) return { node, index, reachable: true, hasState: false, schemaMissing: true };
    node.healthy = false;
    node.error = String(error?.message || error);
    node.lastErrorAt = new Date().toISOString();
    return { node, index, reachable: false, hasState: false, error };
  }
}

function unavailableError(message) {
  const error = new Error(message);
  error.code = "PPR_PRIMARY_PROBE_UNAVAILABLE";
  return error;
}

function compareReplicaVersions(source, target) {
  if (!target) return "copy";
  const sourceRevision = BigInt(source?.state_revision || 0);
  const targetRevision = BigInt(target?.state_revision || 0);
  if (targetRevision > sourceRevision) {
    const error = new Error(`Replica revision ${targetRevision} is newer than authoritative revision ${sourceRevision}; automatic repair is blocked`);
    error.code = "PPR_STATE_REPLICA_CONFLICT";
    throw error;
  }
  if (targetRevision < sourceRevision) return "copy";
  if (String(target.updated_at || "") !== String(source.updated_at || "")) {
    const error = new Error(`PostgreSQL replicas disagree at state revision ${sourceRevision}; automatic repair is blocked`);
    error.code = "PPR_STATE_REPLICA_CONFLICT";
    throw error;
  }
  return "current";
}

function assertMinimumStateRevision(revision, minimumRevision = 0n) {
  const minimum = BigInt(minimumRevision);
  if (minimum < 0n) throw new Error("Minimum PostgreSQL state revision must not be negative");
  if (BigInt(revision ?? 0) < minimum) {
    const error = new Error(`Available PostgreSQL revision ${revision ?? 0} is below required revision ${minimum}; automatic failover is blocked`);
    error.code = "PPR_STATE_REPLICA_STALE";
    error.statusCode = 503;
    throw error;
  }
}

async function selectAuthoritativePostgresNode(nodes, { allowFailover = true, minimumRevision = 0n } = {}) {
  if (!Array.isArray(nodes) || !nodes.length) throw unavailableError("No PostgreSQL databases are configured");
  const inspected = await Promise.all(nodes.map(inspectNode));
  const candidates = inspected.filter(item => item.reachable && item.hasState);

  if (!candidates.length) {
    if (nodes[0]?.healthy) {
      assertMinimumStateRevision(null, minimumRevision);
      return { nodes, selected: nodes[0], selectedIndex: 0, failedOver: false, revision: null, inspections: inspected };
    }
    throw unavailableError("Authoritative PostgreSQL database is unavailable and no current replica can be verified");
  }

  const highestRevision = candidates.reduce((highest, item) => item.revision > highest ? item.revision : highest, candidates[0].revision);
  assertMinimumStateRevision(highestRevision, minimumRevision);
  const newest = candidates.filter(item => item.revision === highestRevision);
  // Mirrors copy the authoritative commit timestamp with the revision. Comparing
  // this small token avoids materializing the potentially huge JSONB payload
  // during startup on memory-constrained database instances.
  const versions = new Set(newest.map(item => item.updatedAt));
  if (versions.size !== 1 || versions.has("")) {
    const error = new Error(`PostgreSQL replicas disagree at state revision ${highestRevision}; automatic failover is blocked`);
    error.code = "PPR_STATE_REPLICA_CONFLICT";
    throw error;
  }

  const chosen = newest.find(item => item.index === 0) || newest[0];
  if (chosen.index !== 0 && !allowFailover) {
    throw unavailableError("Authoritative PostgreSQL database is unavailable; verified automatic failover is disabled");
  }
  if (chosen.index === 0) {
    return { nodes, selected: chosen.node, selectedIndex: 0, failedOver: false, revision: highestRevision, inspections: inspected };
  }

  return {
    nodes: [chosen.node, ...nodes.filter((_, index) => index !== chosen.index)],
    selected: chosen.node,
    selectedIndex: chosen.index,
    failedOver: true,
    revision: highestRevision,
    inspections: inspected
  };
}

module.exports = { assertMinimumStateRevision, compareReplicaVersions, inspectNode, selectAuthoritativePostgresNode, stateProbeSql };
