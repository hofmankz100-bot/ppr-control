"use strict";

const TRANSIENT_CODES = new Set([
  "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN",
  "08000", "08001", "08003", "08004", "08006", "08007", "08P01",
  "57P01", "57P02", "57P03"
]);

function isTransientPostgresConnectionError(error) {
  if (TRANSIENT_CODES.has(String(error?.code || "").toUpperCase())) return true;
  return /connection (?:terminated|closed|ended)|socket hang up|getaddrinfo|server closed the connection/i.test(String(error?.message || error || ""));
}

module.exports = { isTransientPostgresConnectionError, TRANSIENT_CODES };
