"use strict";

const fs = require("fs");

const serverPath = "server.js";
let source = fs.readFileSync(serverPath, "utf8");

const oldProbe = `    await Promise.allSettled(nodes.map(async node => {\n      try {\n        await node.pool.query("SELECT now()")\n        node.healthy = true;\n        node.lastSuccessAt = new Date().toISOString();\n      } catch (error) {\n        node.error = String(error.message || error);\n        node.lastErrorAt = new Date().toISOString();\n      }\n    }));\n    if (!nodes[0].healthy) {\n      await Promise.allSettled(nodes.map(node => node.pool.end()));\n      throw new Error("Authoritative PostgreSQL database is unavailable; automatic state failover is disabled");\n    }\n    postgresClusterStatus = pool.status();`;

const newProbe = `    await Promise.allSettled(nodes.map(async node => {\n      try {\n        await node.pool.query("SELECT now()")\n        node.healthy = true;\n        node.lastSuccessAt = new Date().toISOString();\n      } catch (error) {\n        node.error = String(error.message || error);\n        node.lastErrorAt = new Date().toISOString();\n      }\n    }));\n    const automaticFailoverEnabled = !["0", "false", "off", "no"].includes(\n      String(process.env.PPR_AUTOMATIC_STATE_FAILOVER || "true").trim().toLowerCase()\n    );\n    let startupSourceIndex = 0;\n    if (!nodes[0].healthy) {\n      if (!automaticFailoverEnabled) {\n        await Promise.allSettled(nodes.map(node => node.pool.end()));\n        throw new Error("Authoritative PostgreSQL database is unavailable; automatic state failover is disabled");\n      }\n      const candidates = [];\n      for (let index = 1; index < nodes.length; index += 1) {\n        const node = nodes[index];\n        if (!node.healthy) continue;\n        try {\n          const result = await node.pool.query(\n            "SELECT state_revision FROM ppr_settings WHERE setting_key='full_state' LIMIT 1"\n          );\n          if (!result.rows[0]) continue;\n          const revision = Number(result.rows[0].state_revision || 0);\n          if (!Number.isFinite(revision)) continue;\n          candidates.push({ index, revision });\n        } catch (error) {\n          node.healthy = false;\n          node.error = String(error.message || error);\n          node.lastErrorAt = new Date().toISOString();\n        }\n      }\n      candidates.sort((a, b) => b.revision - a.revision || a.index - b.index);\n      const selected = candidates[0];\n      if (!selected) {\n        await Promise.allSettled(nodes.map(node => node.pool.end()));\n        throw new Error("Authoritative PostgreSQL database is unavailable and no revisioned mirror is safe to promote");\n      }\n      startupSourceIndex = selected.index;\n      pool.activeIndex = startupSourceIndex;\n      console.warn(\`PostgreSQL automatic state failover selected \${nodes[startupSourceIndex].name} at revision \${selected.revision}\`);\n    }\n    postgresClusterStatus = pool.status();`;

if (!source.includes(oldProbe)) throw new Error("startup probe block not found");
source = source.replace(oldProbe, newProbe);
source = source.replace(
  "    pool.activeIndex = 0;\n    const stateStore = createPostgresStateStore(pool, {",
  "    pool.activeIndex = startupSourceIndex;\n    const stateStore = createPostgresStateStore(pool, {"
);
source = source.replace(
  "    await seedEmptyPostgresReplicas(nodes, 0);",
  "    await seedEmptyPostgresReplicas(nodes, startupSourceIndex);"
);
source = source.replace(
  "  const sourceIndex = 0;\n  const source = postgresPool.nodes[sourceIndex];",
  "  const sourceIndex = Math.max(0, Number(postgresPool.activeIndex) || 0);\n  const source = postgresPool.nodes[sourceIndex];"
);
fs.writeFileSync(serverPath, source);

const testPath = "tests/postgres-startup-errors.test.js";
let test = fs.readFileSync(testPath, "utf8");
const oldEnv = 'process: { env: { DATABASE_URL: "postgres://primary.invalid/test", NEON_DATABASE_URL: "postgres://replica.invalid/test" } },';
const newEnv = 'process: { env: { DATABASE_URL: "postgres://primary.invalid/test", NEON_DATABASE_URL: "postgres://replica.invalid/test", PPR_AUTOMATIC_STATE_FAILOVER: "false" } },';
if (!test.includes(oldEnv)) throw new Error("startup error test env not found");
fs.writeFileSync(testPath, test.replace(oldEnv, newEnv));
