"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isTransientPostgresConnectionError } = require("../server/postgres-errors");

test("only transient PostgreSQL connection failures enter startup retry", () => {
  for (const value of [
    Object.assign(new Error("connect failed"), { code: "ECONNRESET" }),
    Object.assign(new Error("database is starting"), { code: "57P03" }),
    new Error("Connection terminated unexpectedly")
  ]) assert.equal(isTransientPostgresConnectionError(value), true);
  for (const value of [
    Object.assign(new Error("syntax error"), { code: "42601" }),
    Object.assign(new Error("permission denied"), { code: "42501" }),
    new Error("Authoritative state conflict")
  ]) assert.equal(isTransientPostgresConnectionError(value), false);
});
