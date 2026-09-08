"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
function functions(source, names) {
  return names.map(name => {
    const match = source.match(new RegExp("function " + name + "\\([^]*?\\n\\}"));
    assert.ok(match, name); return match[0];
  }).join("\n");
}
function client(actor, users) {
  const context = vm.createContext({ profile: actor, authenticatedProfile: actor,
    approvedRemarkUsers: () => users, resolutionActor: () => actor,
    canConfirmRemarksAcrossShops: () => actor.role === "editor", isPrimaryAdminEngineer: () => false,
    resolutionParticipants: () => [], catalogEditorRole: () => actor.role,
    activeUserPermission: require("../server/permissions").activeUserPermission,
    isEquipmentCatalogEditingEnabled: eq => eq.editingEnabled === true });
  vm.runInContext(functions(app, ["equipmentEmployeeArea", "sameRemarkArea", "userAreas", "userHasArea",
    "remarkConfirmationRule", "canCurrentUserConfirmRemark", "remarkNotificationVisibleToCurrentUser", "canEditEquipmentCatalog"]), context);
  return context;
}
const chief = { id: "chief", role: "shop", area: "Основной", areas: ["НЗП", "Второй"] };
const engineer = { id: "engineer", role: "engineer" };
const custom = { id: 17, name: "НЗП", area: "Резерв", editingEnabled: true };

test("actual push routing and pending badges use the canonical custom workshop", () => {
  const { makeHarness } = require("./push-snapshot.test");
  const entry = { id: "pending", text: "Ремонт", resolved: false, resolutionPendingConfirmation: true, confirmationArea: "Резерв" };
  const db = { users: [chief, engineer], catalog: { equipment: { 17: custom } }, checks: { "17:0:2026-09-08": { to: { commentLog: [entry] } } } };
  const h = makeHarness(db);
  const record = { recordKey: "17:0:2026-09-08", entry: { ...entry, area: "Чужой" } };
  assert.equal(h.context.subscriptionMatchesRemarkServer(db, { profile: chief }, record), true);
  assert.equal(h.context.subscriptionMatchesRemarkServer(db, { profile: engineer }, record), false);
  assert.equal(h.context.openRemarkCountForSubscription(db, { profile: chief }), 1);
  assert.equal(h.context.openRemarkCountForSubscription(db, { profile: engineer }), 0);
  assert.equal(entry.confirmationArea, "Резерв");
  db.users = [engineer];
  assert.equal(h.context.openRemarkCountForSubscription(db, { profile: engineer }), 1);
});

test("custom reserve workshop uses its assigned employee area for confirmation and notifications", () => {
  const entry = { resolutionPendingConfirmation: true, confirmationArea: "Резерв" };
  const before = JSON.stringify({ custom, entry, chief });
  const c = client(chief, [chief, engineer]);
  assert.equal(c.remarkConfirmationRule(entry, custom).area, "НЗП");
  assert.equal(c.remarkConfirmationRule(entry, custom).role, "shop");
  assert.equal(c.canCurrentUserConfirmRemark(entry, custom), true);
  assert.equal(c.remarkNotificationVisibleToCurrentUser(entry, custom), true);
  assert.equal(client({ ...chief, areas: [] }, [chief, engineer]).canCurrentUserConfirmRemark(entry, custom), false);
  assert.equal(client(engineer, [chief, engineer]).canCurrentUserConfirmRemark(entry, custom), false);
  assert.equal(client(engineer, [engineer]).canCurrentUserConfirmRemark(entry, custom), true);
  assert.equal(JSON.stringify({ custom, entry, chief }), before);
});

test("catalog editing accepts every assigned workshop without bypassing its editing switch or individual expiry", () => {
  const c = client(chief, [chief]);
  for (const area of ["Основной", "Второй", " второй "]) assert.equal(c.canEditEquipmentCatalog({ area, editingEnabled: true }), true);
  assert.equal(c.canEditEquipmentCatalog({ area: "Чужой", editingEnabled: true }), false);
  assert.equal(c.canEditEquipmentCatalog({ area: "Второй", editingEnabled: false }), false);
  const override = { role: "mechanic", permissionOverrides: { equipmentEdit: { enabled: true } } };
  assert.equal(client(override, []).canEditEquipmentCatalog({ area: "Чужой" }), true);
  override.permissionOverrides.equipmentEdit.expiresAt = "2000-01-01";
  assert.equal(client(override, []).canEditEquipmentCatalog({ area: "Чужой", editingEnabled: true }), false);
  assert.equal(client({ role: "editor" }, []).canEditEquipmentCatalog({ area: "Чужой" }), true);
});

test("server derives the same canonical workshop and ignores a forged request area", () => {
  const context = vm.createContext({ DEFAULT_EQUIPMENT_AREAS_SERVER: { 17: "Резерв", 1: "Прессовый участок" } });
  vm.runInContext(functions(server, ["remarkEquipmentAreaServer"]), context);
  const db = { catalog: { equipment: { 17: custom } }, checks: {} }, before = JSON.stringify(db);
  assert.equal(context.remarkEquipmentAreaServer(db, "17:0:2026-09-08", "Чужой"), "НЗП");
  assert.equal(context.remarkEquipmentAreaServer(db, "1:0:2026-09-08", "НЗП"), "Прессовый участок");
  assert.equal(context.remarkEquipmentAreaServer({ catalog: { equipment: { 17: { area: "Резерв", name: "оборудование 17" } } } }, "17:0:2026-09-08"), "Резерв");
  assert.equal(context.remarkEquipmentAreaServer({ checks: { "90:0:2026-09-08": { area: "Исторический" } } }, "90:0:2026-09-08"), "Исторический");
  assert.equal(JSON.stringify(db), before);
});
