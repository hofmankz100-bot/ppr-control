"use strict";

const WRITE_SQL = /^\s*(?:insert|update|delete|create|alter|drop|truncate|grant|revoke)\b/i;

function safeError(error) {
  return String(error?.message || error || "Unknown PostgreSQL error");
}

class MultiPostgres {
  constructor(nodes, options = {}) {
    this.nodes = nodes;
    this.activeIndex = Math.max(0, nodes.findIndex(node => node.healthy));
    this.onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
    this.onPoolError = typeof options.onPoolError === "function" ? options.onPoolError : () => {};
    this.mirrorJobs = new Set();
    this.nodes.forEach((node, index) => {
      if (typeof node.pool?.on !== "function") return;
      node.pool.on("error", error => {
        this.markFailure(index, error);
        this.onStatus(this.status());
        this.onPoolError(error, node.name);
      });
    });
  }

  activeNode() {
    return this.nodes[this.activeIndex] || this.nodes[0] || null;
  }

  status() {
    const active = this.activeNode();
    return {
      active: active?.name || "",
      nodes: this.nodes.map(node => ({
        name: node.name,
        healthy: Boolean(node.healthy),
        lastSuccessAt: node.lastSuccessAt || "",
        lastErrorAt: node.lastErrorAt || "",
        error: node.error || ""
      }))
    };
  }

  markSuccess(index) {
    const node = this.nodes[index];
    node.healthy = true;
    node.error = "";
    node.lastSuccessAt = new Date().toISOString();
  }

  markFailure(index, error) {
    const node = this.nodes[index];
    node.healthy = false;
    node.error = safeError(error);
    node.lastErrorAt = new Date().toISOString();
  }

  orderedIndexes() {
    const indexes = this.nodes.map((_, index) => index);
    return [this.activeIndex, ...indexes.filter(index => index !== this.activeIndex)];
  }

  async query(sql, params) {
    if (!this.nodes.length) throw new Error("PostgreSQL databases are not configured");
    if (!WRITE_SQL.test(String(sql || ""))) return this.read(sql, params);
    return this.write(sql, params);
  }

  async read(sql, params) {
    let lastError = null;
    for (const index of this.orderedIndexes()) {
      try {
        const result = await this.nodes[index].pool.query(sql, params);
        this.markSuccess(index);
        if (index !== this.activeIndex) this.activeIndex = index;
        this.onStatus(this.status());
        return result;
      } catch (error) {
        lastError = error;
        this.markFailure(index, error);
      }
    }
    this.onStatus(this.status());
    throw lastError || new Error("All PostgreSQL databases are unavailable");
  }

  async write(sql, params) {
    let chosen = null;
    let lastError = null;
    for (const index of this.orderedIndexes()) {
      try {
        const result = await this.nodes[index].pool.query(sql, params);
        this.markSuccess(index);
        chosen = { result, index };
        break;
      } catch (error) {
        lastError = error;
        this.markFailure(index, error);
      }
    }
    if (!chosen) {
      this.onStatus(this.status());
      throw lastError || new Error("Write failed in all PostgreSQL databases");
    }
    this.activeIndex = chosen.index;
    this.onStatus(this.status());
    // A failed replica is checked by the recovery monitor. Retrying the same
    // known-bad database after every user mutation wastes sockets and can create
    // an error storm (for example while a hosted database quota is exhausted).
    for (const index of this.nodes
      .map((_, index) => index)
      .filter(index => index !== chosen.index && this.nodes[index].healthy)) {
      const job = this.nodes[index].pool.query(sql, params)
        .then(() => this.markSuccess(index))
        .catch(error => this.markFailure(index, error))
        .finally(() => {
          this.mirrorJobs.delete(job);
          this.onStatus(this.status());
        });
      this.mirrorJobs.add(job);
    }
    return chosen.result;
  }

  async flushMirrors() {
    await Promise.allSettled([...this.mirrorJobs]);
  }

  async end() {
    await this.flushMirrors();
    await Promise.allSettled(this.nodes.map(node => node.pool.end()));
  }
}

function configuredDatabases(env = process.env) {
  const definitions = [
    ["primary", env.DATABASE_URL],
    ["neon", env.NEON_DATABASE_URL],
    ["supabase", env.SUPABASE_DATABASE_URL]
  ];
  const seen = new Set();
  return definitions.flatMap(([name, value]) => {
    const connectionString = String(value || "").trim();
    if (!connectionString || seen.has(connectionString)) return [];
    seen.add(connectionString);
    return [{ name, connectionString }];
  });
}

module.exports = { MultiPostgres, configuredDatabases, WRITE_SQL };
