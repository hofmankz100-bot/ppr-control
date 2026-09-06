"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { configuredDatabases } = require("../multi-postgres");
const { loadEnvFile } = require("../server/env");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");

const testDataDir = path.join(os.tmpdir(), "ppr-isolated-env-data");

test("integration environments cannot inherit database connections or TLS credentials", () => {
  const environment = createIsolatedServerEnv({ DATA_DIR: testDataDir }, {
    DATABASE_URL: "postgres://primary.invalid/live",
    NEON_DATABASE_URL: "postgres://neon.invalid/live",
    SUPABASE_DATABASE_URL: "postgres://supabase.invalid/live",
    Database_Url: "postgres://mixed-case.invalid/live",
    REQUIRE_POSTGRES: "true",
    HTTPS_PFX_FILE: "real.pfx",
    HTTPS_CERT_FILE: "real.crt",
    HTTPS_KEY_FILE: "real.key",
    HTTPS_PFX_PASS: "fake-live-passphrase",
    ADMIN_BOOTSTRAP_PASSWORD: "fake-live-bootstrap-password"
  });

  assert.deepEqual(configuredDatabases(environment), []);
  assert.equal(Object.hasOwn(environment, "Database_Url"), false);
  assert.equal(environment.REQUIRE_POSTGRES, "false");
  for (const name of ["HTTPS_PFX_FILE", "HTTPS_CERT_FILE", "HTTPS_KEY_FILE", "HTTPS_PFX_PASS", "ADMIN_BOOTSTRAP_PASSWORD"]) {
    assert.equal(environment[name], "");
  }
});

test("explicit test storage, ports and production authentication mode override inherited settings", () => {
  const environment = createIsolatedServerEnv({
    DATA_DIR: testDataDir,
    PORT: 32101,
    QR_PORT: "32102",
    NODE_ENV: "production"
  }, {
    DATA_DIR: "/live/data",
    PORT: "80",
    QR_PORT: "8081",
    HTTPS_PORT: "443",
    NODE_ENV: "development"
  });

  assert.equal(environment.DATA_DIR, testDataDir);
  assert.equal(environment.PORT, "32101");
  assert.equal(environment.QR_PORT, "32102");
  assert.equal(environment.HTTPS_PORT, "0");
  assert.equal(environment.NODE_ENV, "production");
});

test("omitted test ports cannot reuse a parent's service ports", () => {
  const environment = createIsolatedServerEnv({ DATA_DIR: testDataDir }, {
    PORT: "8080", QR_PORT: "8081", HTTPS_PORT: "8443", NODE_ENV: "production"
  });

  assert.equal(environment.PORT, "0");
  assert.equal(environment.QR_PORT, "0");
  assert.equal(environment.HTTPS_PORT, "0");
  assert.equal(environment.NODE_ENV, "test");
});

test("environment isolation preserves the parent and unrelated process settings", () => {
  const parent = Object.freeze({
    PATH: "test-runtime-path",
    TEMP: "test-temp-path",
    DATABASE_URL: "postgres://primary.invalid/live",
    QR_PORT: "8081"
  });
  const before = { ...parent };
  const environment = createIsolatedServerEnv({ DATA_DIR: testDataDir }, parent);

  assert.deepEqual(parent, before);
  assert.notEqual(environment, parent);
  assert.equal(environment.PATH, parent.PATH);
  assert.equal(environment.TEMP, parent.TEMP);
  environment.TEMP = "child-only-temp-path";
  assert.deepEqual(parent, before);
});

test("a project env file cannot restore database URLs, TLS files or live bind ports", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-isolated-env-test-"));
  try {
    fs.writeFileSync(path.join(temporaryRoot, ".env"), [
      "DATABASE_URL=postgres://primary.invalid/live",
      "NEON_DATABASE_URL=postgres://neon.invalid/live",
      "SUPABASE_DATABASE_URL=postgres://supabase.invalid/live",
      "REQUIRE_POSTGRES=true",
      "HTTPS_PFX_FILE=real.pfx",
      "HTTPS_CERT_FILE=real.crt",
      "HTTPS_KEY_FILE=real.key",
      "HTTPS_PFX_PASS=fake-live-passphrase",
      "HTTPS_PORT=443",
      "ADMIN_BOOTSTRAP_PASSWORD=fake-live-bootstrap-password",
      "DATA_DIR=/live/data",
      "PORT=80",
      "QR_PORT=8081",
      "NODE_ENV=production"
    ].join("\n"));
    const environment = createIsolatedServerEnv({ DATA_DIR: testDataDir }, {});
    const before = { ...environment };

    loadEnvFile(temporaryRoot, environment);

    assert.deepEqual(environment, before);
    assert.deepEqual(configuredDatabases(environment), []);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("missing storage paths and invalid ports fail before a server can use live defaults", () => {
  assert.throws(() => createIsolatedServerEnv(), /DATA_DIR/);
  assert.throws(() => createIsolatedServerEnv({ DATA_DIR: "" }), /DATA_DIR/);
  assert.throws(() => createIsolatedServerEnv({ DATA_DIR: "relative-data" }), /DATA_DIR/);
  assert.throws(() => createIsolatedServerEnv({ DATA_DIR: testDataDir, PORT: "" }), /PORT/);
  assert.throws(() => createIsolatedServerEnv({ DATA_DIR: testDataDir, QR_PORT: -1 }), /QR_PORT/);
  assert.throws(() => createIsolatedServerEnv({ DATA_DIR: testDataDir, PORT: 65536 }), /PORT/);
});
