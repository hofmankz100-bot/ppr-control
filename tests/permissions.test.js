"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ADMIN_PERMISSION_KEYS,
  activeUserPermission,
  qrPermissionRoles,
  createServerPermissions
} = require("../server/permissions");

const permissions = createServerPermissions({ primaryAdminEmployeeId: "87064091893" });

test("specialized roles inherit their agreed permission base", () => {
  assert.equal(permissions.permissionBaseRole("electrician"), "mechanic");
  assert.equal(permissions.permissionBaseRole("welder"), "mechanic");
  assert.equal(permissions.permissionBaseRole("safetyEngineer"), "engineer");
  assert.equal(permissions.permissionBaseRole("generalDirector"), "productionDirector");
  assert.equal(permissions.permissionBaseRole("operator"), "operator");
  assert.equal(permissions.samePermissionRole("electrician", "mechanic"), true);
  assert.equal(permissions.samePermissionRole("operator", "mechanic"), false);
});

test("QR access honors the administrator-assigned job role", () => {
  assert.deepEqual(qrPermissionRoles({ role: "operator", jobRole: "electrician" }), ["operator", "mechanic"]);
  assert.deepEqual(qrPermissionRoles({ role: "operator", jobRole: "engineer" }), ["operator", "engineer"]);
  assert.deepEqual(qrPermissionRoles({ role: "shop", jobRole: "turner" }), ["shop", "mechanic"]);
  assert.deepEqual(qrPermissionRoles({ role: "operator" }), ["operator"]);
});

test("only the configured editor receives the primary engineer capability", () => {
  assert.equal(permissions.isPrimaryAdminEngineer({ employeeId: "87064091893", role: "editor" }), true);
  assert.equal(permissions.isPrimaryAdminEngineer({ employeeId: "87064091893", role: "engineer" }), false);
  assert.equal(permissions.engineerPermissionRole({ employeeId: "87064091893", role: "editor" }), "engineer");
  assert.equal(permissions.engineerPermissionRole({ employeeId: "other", role: "editor" }), "editor");
});

test("remark resolution executors stay restricted to field worker roles", () => {
  for (const role of ["mechanic", "electrician", "welder", "turner", "forkliftDriver"]) {
    assert.equal(permissions.isResolutionExecutorRole(role), true);
  }
  for (const role of ["operator", "shop", "engineer", "editor"]) {
    assert.equal(permissions.isResolutionExecutorRole(role), false);
  }
});

test("individual permissions only activate when enabled and unexpired", () => {
  const now = Date.parse("2026-08-23T12:00:00.000Z");
  assert.equal(activeUserPermission({}, "instructionEdit", now), false);
  assert.equal(activeUserPermission({ permissionOverrides: { instructionEdit: { enabled: false } } }, "instructionEdit", now), false);
  assert.equal(activeUserPermission({ permissionOverrides: { instructionEdit: { enabled: true } } }, "instructionEdit", now), true);
  assert.equal(activeUserPermission({ permissionOverrides: { instructionEdit: { enabled: true, expiresAt: "2026-08-23T11:59:59.000Z" } } }, "instructionEdit", now), false);
  assert.equal(activeUserPermission({ permissionOverrides: { instructionEdit: { enabled: true, expiresAt: "2026-08-23T12:00:01.000Z" } } }, "instructionEdit", now), true);
  assert.equal(activeUserPermission({ permissionOverrides: { instructionEdit: { enabled: true, expiresAt: "invalid" } } }, "instructionEdit", now), false);
});

test("admin permission allowlist contains only supported individual capabilities", () => {
  assert.equal(ADMIN_PERMISSION_KEYS.has("instructionEdit"), true);
  assert.equal(ADMIN_PERMISSION_KEYS.has("remarkGlobalConfirm"), true);
  assert.equal(ADMIN_PERMISSION_KEYS.has("remarkDefer"), true);
  assert.equal(ADMIN_PERMISSION_KEYS.has("monthCloseManage"), false);
  assert.equal(ADMIN_PERMISSION_KEYS.size, 10);
});
