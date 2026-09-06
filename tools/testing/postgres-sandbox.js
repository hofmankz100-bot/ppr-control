"use strict";

const crypto = require("node:crypto");

function sandboxConnection(connectionString) {
  // Validate the original text, before URL normalization or pg parsing can turn
  // alternate hosts, encoded identifiers, or query parameters into a connection.
  const match = typeof connectionString === "string" && connectionString.match(
    /^(postgres|postgresql):\/\/ppr_e2e(?::([^@/?#\s\\]*))?@(127\.0\.0\.1|localhost|\[::1\])(?::([1-9]\d{0,4}))?\/postgres$/
  );
  const port = match ? Number(match[4] || 5432) : 0;
  if (!match || match[0] !== connectionString || port > 65535) {
    throw new Error("PPR_E2E_POSTGRES_URL must use ppr_e2e, a literal loopback host, and /postgres without query parameters.");
  }
  let password;
  try {
    password = decodeURIComponent(match[2] || "");
  } catch {
    throw new Error("PPR_E2E_POSTGRES_URL contains an invalid password encoding.");
  }
  // Resolve localhost ourselves: no DNS result may redirect this helper.
  const host = match[3] === "[::1]" ? "::1" : "127.0.0.1";
  const urlHost = host === "::1" ? "[::1]" : host;
  return {
    urlPrefix: `postgresql://ppr_e2e:${encodeURIComponent(password)}@${urlHost}:${port}/`,
    config: {
      host,
      port,
      user: "ppr_e2e",
      database: "postgres",
      // A callback also prevents pg from falling back to PGPASSWORD when empty.
      password: () => password,
      ssl: false,
      sslnegotiation: "postgres",
      options: "-c search_path=pg_catalog",
      application_name: "ppr-control-e2e-sandbox",
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000
    }
  };
}

async function createPostgresSandbox(connectionString, dependencies = {}) {
  const connection = sandboxConnection(connectionString);
  const createClient = dependencies.createClient || (config => new (require("pg").Client)(config));
  const databaseName = `ppr_e2e_${crypto.randomBytes(16).toString("hex")}`;
  let created = false;
  let disposePromise = null;

  async function withAdminClient(operation) {
    const client = createClient({ ...connection.config });
    let operationError;
    try {
      await client.connect();
      return await operation(client);
    } catch (error) {
      operationError = error;
      throw error;
    } finally {
      try {
        await client.end();
      } catch (error) {
        if (!operationError) throw error;
      }
    }
  }

  function dispose() {
    if (!created) return Promise.resolve();
    if (!disposePromise) {
      disposePromise = withAdminClient(async client => {
        // PostgreSQL 13+ terminates connections before dropping this one database.
        // Its identifier is generated here, never taken from a URL or caller.
        await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
        created = false;
      }).catch(error => {
        disposePromise = null;
        throw error;
      });
    }
    return disposePromise;
  }

  try {
    await withAdminClient(async client => {
      await client.query(`CREATE DATABASE "${databaseName}"`);
      created = true;
    });
  } catch (error) {
    if (created) {
      try {
        await dispose();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "PostgreSQL sandbox setup and cleanup failed.");
      }
    }
    throw error;
  }

  return { databaseUrl: `${connection.urlPrefix}${databaseName}`, dispose };
}

module.exports = { createPostgresSandbox };
