"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPostgresSandbox } = require("../tools/testing/postgres-sandbox");

function fakeClients(options = {}) {
  const clients = [];
  return {
    clients,
    createClient(config) {
      const index = clients.length;
      const client = {
        config,
        queries: [],
        connected: false,
        ended: false,
        async connect() {
          if (options.connect) await options.connect(index);
          this.connected = true;
        },
        async query(sql) {
          this.queries.push(sql);
          if (options.query) await options.query(sql, index);
          return { rows: [] };
        },
        async end() {
          this.ended = true;
          if (options.end) await options.end(index);
        }
      };
      clients.push(client);
      return client;
    }
  };
}

test("sandbox refuses unsafe or ambiguous URLs before opening any client", async () => {
  const fake = fakeClients();
  const invalid = [
    undefined, null, "", {},
    "postgres://ppr_e2e:test@example.com/postgres",
    "postgres://ppr_e2e:test@127.0.0.2/postgres",
    "postgres://ppr_e2e:test@127.1/postgres",
    "postgres://ppr_e2e:test@2130706433/postgres",
    "postgres://ppr_e2e:test@0x7f000001/postgres",
    "postgres://ppr_e2e:test@localhost.example.com/postgres",
    "postgres://ppr_e2e:test@localhost./postgres",
    "postgres://ppr_e2e:test@%6cocalhost/postgres",
    "postgres://ppr_e2e:test@[::ffff:127.0.0.1]/postgres",
    "postgres://ppr_e2e:test@/postgres",
    "postgres://ppr_e2e:test@localhost/production",
    "postgres://ppr_e2e:test@localhost/ppr_e2e_existing",
    "postgres://ppr_e2e:test@localhost/%70ostgres",
    "postgres://ppr_e2e:test@localhost/other/../postgres",
    "postgres://ppr_e2e:test@localhost/postgres/",
    "postgres://postgres:test@localhost/postgres",
    "postgres://%70pr_e2e:test@localhost/postgres",
    "postgres://ppr_e2e@test@localhost/postgres",
    "postgres://ppr_e2e:test@localhost/postgres?host=example.com",
    "postgres://ppr_e2e:test@localhost/postgres?host=/tmp",
    "postgres://ppr_e2e:test@localhost/postgres?user=postgres",
    "postgres://ppr_e2e:test@localhost/postgres?",
    "postgres://ppr_e2e:test@localhost/postgres#fragment",
    "postgres://ppr_e2e:test@localhost/postgres#",
    "postgres://ppr_e2e:test@localhost:0/postgres",
    "postgres://ppr_e2e:test@localhost:65536/postgres",
    "postgres://ppr_e2e:test@localhost:05432/postgres",
    "https://ppr_e2e:test@localhost/postgres",
    " postgres://ppr_e2e:test@localhost/postgres",
    "postgres://ppr_e2e:test@local\nhost/postgres",
    "postgres://ppr_e2e:test@localhost/postgres\n",
    "postgres://ppr_e2e:bad%password@localhost/postgres",
    "postgres://ppr_e2e:test\\@localhost/postgres"
  ];
  for (const value of invalid) {
    await assert.rejects(createPostgresSandbox(value, fake), /PPR_E2E_POSTGRES_URL/);
  }
  assert.equal(fake.clients.length, 0);
});

test("sandbox creates unique databases and disposes only the generated database", async () => {
  const fake = fakeClients();
  const first = await createPostgresSandbox("postgres://ppr_e2e:test@localhost:5439/postgres", fake);
  const second = await createPostgresSandbox("postgresql://ppr_e2e:test@127.0.0.1:5439/postgres", fake);
  const firstUrl = new URL(first.databaseUrl);
  const name = firstUrl.pathname.slice(1);
  assert.match(name, /^ppr_e2e_[a-f0-9]{32}$/);
  assert.notEqual(first.databaseUrl, second.databaseUrl);
  assert.equal(firstUrl.hostname, "127.0.0.1");
  assert.equal(firstUrl.port, "5439");
  assert.equal(firstUrl.username, "ppr_e2e");
  assert.equal(fake.clients[0].config.database, "postgres");
  assert.equal(fake.clients[0].config.host, "127.0.0.1");
  assert.equal(fake.clients[0].config.ssl, false);
  assert.equal(await fake.clients[0].config.password(), "test");
  assert.deepEqual(fake.clients[0].queries, [`CREATE DATABASE "${name}"`]);
  assert.ok(fake.clients[0].ended);

  await Promise.all([first.dispose(), first.dispose()]);
  await first.dispose();
  assert.equal(fake.clients.length, 3);
  assert.deepEqual(fake.clients[2].queries, [`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`]);
  assert.equal(fake.clients[2].config.database, "postgres");
  assert.ok(fake.clients[2].ended);
  await second.dispose();
});

test("sandbox supports literal IPv6 and escaped passwords without URL options", async () => {
  const fake = fakeClients();
  const sandbox = await createPostgresSandbox("postgres://ppr_e2e:p%40ss%2F%3F%23%25@[::1]/postgres", fake);
  const parsed = new URL(sandbox.databaseUrl);
  assert.equal(parsed.hostname, "[::1]");
  assert.equal(parsed.search, "");
  assert.equal(parsed.hash, "");
  assert.equal(fake.clients[0].config.host, "::1");
  assert.equal(fake.clients[0].config.port, 5432);
  assert.equal(await fake.clients[0].config.password(), "p@ss/?#%");
  assert.equal(decodeURIComponent(parsed.password), "p@ss/?#%");
  await sandbox.dispose();
});

test("an omitted URL never falls back to DATABASE_URL and an empty password is explicit", async () => {
  const fake = fakeClients();
  await assert.rejects(createPostgresSandbox(undefined, fake), /PPR_E2E_POSTGRES_URL/);
  assert.equal(fake.clients.length, 0);
  const sandbox = await createPostgresSandbox("postgres://ppr_e2e@127.0.0.1/postgres", fake);
  assert.equal(await fake.clients[0].config.password(), "");
  await sandbox.dispose();
});

test("failed CREATE never drops a database that this invocation did not create", async () => {
  const fake = fakeClients({ query: async () => { throw new Error("create rejected"); } });
  await assert.rejects(createPostgresSandbox("postgres://ppr_e2e:test@localhost/postgres", fake), /create rejected/);
  assert.equal(fake.clients.length, 1);
  assert.equal(fake.clients[0].queries.length, 1);
  assert.match(fake.clients[0].queries[0], /^CREATE DATABASE /);
  assert.ok(fake.clients[0].ended);
});

test("failed connection is closed without issuing SQL", async () => {
  const fake = fakeClients({ connect: async () => { throw new Error("connection failed"); } });
  await assert.rejects(createPostgresSandbox("postgres://ppr_e2e:test@localhost/postgres", fake), /connection failed/);
  assert.equal(fake.clients.length, 1);
  assert.deepEqual(fake.clients[0].queries, []);
  assert.ok(fake.clients[0].ended);
});

test("failed disposal can be retried against the same generated database", async () => {
  const fake = fakeClients({ query: async (sql, index) => {
    if (index === 1) throw new Error("temporary cleanup failure");
  } });
  const sandbox = await createPostgresSandbox("postgres://ppr_e2e:test@localhost/postgres", fake);
  await assert.rejects(sandbox.dispose(), /temporary cleanup failure/);
  assert.ok(fake.clients[1].ended);
  await sandbox.dispose();
  assert.deepEqual(fake.clients[2].queries, fake.clients[1].queries);
  assert.ok(fake.clients[2].ended);
});

test("setup cleans up its created database if closing the first client fails", async () => {
  const fake = fakeClients({ end: async index => {
    if (index === 0) throw new Error("client close failed");
  } });
  await assert.rejects(createPostgresSandbox("postgres://ppr_e2e:test@localhost/postgres", fake), /client close failed/);
  assert.equal(fake.clients.length, 2);
  const name = fake.clients[0].queries[0].match(/"(ppr_e2e_[a-f0-9]{32})"/)[1];
  assert.deepEqual(fake.clients[1].queries, [`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`]);
  assert.ok(fake.clients[1].ended);
});
