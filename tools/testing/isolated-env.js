"use strict";

const path = require("node:path");

function testPort(value, name) {
  if (!/^[0-9]+$/.test(String(value)) || Number(value) > 65535) {
    throw new TypeError(`${name} must be a port from 0 to 65535`);
  }
  return String(value);
}

function createIsolatedServerEnv({ DATA_DIR, PORT = 0, QR_PORT = 0, NODE_ENV = "test" } = {}, parentEnv = process.env) {
  if (typeof DATA_DIR !== "string" || !path.isAbsolute(DATA_DIR)) {
    throw new TypeError("DATA_DIR must be an absolute test storage path");
  }

  // Empty values must remain defined: deleting them would let server/env.js
  // restore real database connections and TLS files from the project's .env.
  const overrides = {
    DATABASE_URL: "",
    NEON_DATABASE_URL: "",
    SUPABASE_DATABASE_URL: "",
    REQUIRE_POSTGRES: "false",
    HTTPS_PFX_FILE: "",
    HTTPS_CERT_FILE: "",
    HTTPS_KEY_FILE: "",
    HTTPS_PFX_PASS: "",
    HTTPS_PORT: "0",
    ADMIN_BOOTSTRAP_PASSWORD: "",
    DATA_DIR,
    PORT: testPort(PORT, "PORT"),
    QR_PORT: testPort(QR_PORT, "QR_PORT"),
    NODE_ENV: String(NODE_ENV)
  };

  // Windows treats environment names without regard to case. Avoid forwarding
  // aliases such as Database_Url alongside the sanitized uppercase name.
  const environment = Object.fromEntries(Object.entries(parentEnv)
    .filter(([name]) => !Object.hasOwn(overrides, name.toUpperCase())));
  return { ...environment, ...overrides };
}

module.exports = { createIsolatedServerEnv };
