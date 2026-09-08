"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const push = require("../server/push-snapshot");
const { createStateTransactions } = require("../server/state-transactions");
const { createServerPermissions, activeUserPermission } = require("../server/permissions");

const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
const senders = [
  "sendRemarkPushNotifications", "sendPprApprovalPushNotifications", "clearPprApprovalPushNotifications",
  "sendResolutionPushNotifications", "clearRemarkPushNotifications", "sendDowntimePushNotifications"
];
const helpers = [
  "localizedPushPayloadServer", "ensurePushConfig", "pushDbSnapshot", "removeExpiredPushSubscriptions",
  "resolutionUserKeyServer", "sanitizeResolutionParticipant", "resolutionParticipantsServer",
  "ensureRemarkEntriesServer", "approvedResolutionUsersServer", "sameRemarkAreaServer",
  "normalizedUserAreasServer", "userHasAreaServer", "remarkConfirmationRuleServer",
  "actorCanConfirmRemarkServer", "remarkEquipmentAreaServer", "subscriptionMatchesRemarkServer",
  "subscriptionMatchesResolutionParticipant", "openRemarkCountForSubscription",
  "pendingPprCountForSubscription", "activeDowntimeCountForSubscription",
  "personalNotificationBreakdownServer", "personalNotificationCountServer"
];

function makeHarness(input, { serverSource = source, delivery = async () => {}, commit = async () => {} } = {}) {
  let db = input;
  const sent = [], writes = [], vapid = [], errors = [];
  const permissions = createServerPermissions({ primaryAdminEmployeeId: "87064091893" });
  const transactions = createStateTransactions({
    begin: async () => ({ state: db, commit, rollback: async () => {} }),
    committed: () => db,
    publish: state => { db = state; },
    onEffectError: error => errors.push(error)
  });
  const context = vm.createContext({
    require: name => require(path.resolve(__dirname, "..", name)),
    ...push, structuredClone, Set, console: { error: error => errors.push(error) },
    stateTransactions: transactions,
    enqueueStateWrite: transactions.run,
    readDb: transactions.read,
    writeDb: (state, detail) => { writes.push(structuredClone(detail)); transactions.stage(state); },
    webPush: {
      generateVAPIDKeys: () => ({ publicKey: "generated-public", privateKey: "generated-private" }),
      setVapidDetails: (...args) => vapid.push(args),
      sendNotification: (subscription, payload, options) => {
        const notification = JSON.parse(JSON.stringify({ subscription, payload: JSON.parse(payload), options }));
        sent.push(notification);
        return delivery(notification);
      }
    },
    translateExternal: async (text, language) => text ? language + ":" + text : "",
    permissionBaseRoleServer: permissions.permissionBaseRole,
    engineerPermissionRoleServer: permissions.engineerPermissionRole,
    activeUserPermission,
    remarkDeduplication: require("../server/remark-deduplication")
  });
  const snippets = [...helpers, ...senders].map(name => {
    const match = serverSource.match(new RegExp("(?:async )?function " + name + "\\([^]*?\\n\\}"));
    assert.ok(match, name);
    return match[0];
  });
  for (const name of ["REMARK_COLLABORATION_FIELDS_SERVER", "DEFAULT_EQUIPMENT_AREAS_SERVER"]) {
    const match = serverSource.match(new RegExp("const " + name + " = [^]*?\\n[\\]\\}][^\\n]*;"));
    assert.ok(match, name);
    snippets.unshift(match[0]);
  }
  vm.runInContext(snippets.join("\n"), context);
  return {
    sent, writes, vapid, errors, transactions, context,
    get db() { return db; },
    invoke(name, args) {
      const oldSignature = new RegExp("function " + name + "\\(db,").test(serverSource);
      return context[name](...(oldSignature ? [transactions.read(), ...args] : args));
    }
  };
}

function fixture() {
  const users = [
    { id: "engineer", name: "Engineer", role: "engineer", language: "ru" },
    { id: "shop", name: "Shop", role: "shop", area: "A", areas: ["B"], language: "uz" },
    { id: "worker", name: "Worker", role: "mechanic", language: "kk" },
    { id: "editor", name: "Editor", role: "editor", language: "ru" },
    { id: "pending", name: "Pending", role: "shop", area: "C", pendingApproval: true },
    { id: "override", name: "Override", role: "engineer", permissionOverrides: { remarkGlobalConfirm: { enabled: true } } }
  ];
  return {
    users, catalog: { equipment: { 90: { area: "A" }, 91: { area: "C" } } },
    checks: {
      "90:0:date": { to: { resolutionParticipants: [users[2]], commentLog: [
        { text: "Legacy", photo: "legacy-photo", name: "Operator", role: "operator", at: "2026-09-08" },
        { text: "Resolved", resolved: true },
        { text: "Confirm", resolved: false, resolutionPendingConfirmation: true, confirmationArea: "A" },
        { text: "Returned", resolved: false, resolutionReturnedAt: "now", resolutionSubmittedByKey: "id:worker" }
      ] } },
      "91:0:date": { to: { commentLog: [{ photo: "photo-only", at: "2026-09-08", resolved: false }] } }
    },
    pprSheets: {
      pending: { approvalRequestedAt: "now", rows: [{ work: "Inspect", mark: "done" }] },
      approved: { approvalRequestedAt: "now", approvedAt: "now", rows: [{ work: "Done" }] },
      empty: { approvalRequestedAt: "now", rows: [{ work: "  " }] }
    },
    downtimes: [
      { id: "down 1", area: "B", authorId: "worker", participants: [users[0]] },
      { id: "ended", area: "A", endedAt: "now" },
      { id: "deleted", area: "A", deleted: true }
    ],
    pushNotifications: {
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      subscriptions: users.map(profile => ({
        clientId: profile.id,
        profile,
        subscription: { endpoint: "https://push.invalid/" + profile.id, keys: { p256dh: "public", auth: "auth" }, expirationTime: null }
      }))
    },
    backupPhotos: "unrelated-large-photo"
  };
}

function calls(db) {
  const participants = [db.users[2], db.users[1]];
  const sheet = { date: "2026-09-08", photo: "sheet-photo", rows: [
    { work: "Inspect", equipment: "Press", photo: "row-photo" },
    { work: "Inspect", equipment: "Press" }, { work: " ", equipment: "Excluded" }
  ] };
  return [
    [senders[0], [1, 99, "shop", "/?remark=r1", "r1", [{ recordKey: "91:0:date", entry: { photo: "remark-photo" } }]]],
    [senders[1], [sheet, "override"]],
    [senders[2], [sheet, "override"]],
    [senders[3], [participants, "worker", "Title", "Body", "/?remark=r1", "r1"]],
    [senders[4], [participants, "worker", "r1"]],
    [senders[5], ["Down", "Body", "override", null, "down 1"]]
  ];
}

if (require.main === module) {
test("push projection uses existing counts, isolates legacy normalization, and returns no state/photo references", () => {
  const db = fixture(), before = structuredClone(db);
  const h = makeHarness(db);
  const expected = db.pushNotifications.subscriptions.map(entry =>
    h.context.personalNotificationCountServer(structuredClone(db), entry));
  const snapshot = push.createPushSnapshot(db, () => true, h.context.personalNotificationCountServer);
  assert.deepEqual(snapshot.targets.map(entry => entry.badgeCount), expected);
  assert.deepEqual(db, before);
  assert.equal(JSON.stringify(snapshot).includes("photo"), false);
  snapshot.targets[0].subscription.keys.auth = "changed";
  snapshot.vapid.publicKey = "changed";
  assert.deepEqual(db, before);
  assert.deepEqual(expected, [3, 2, 3, 2, 1, 4]);
});

test("all six actual senders preserve routing, payload, locale, badges, and transport options", async () => {
  const db = fixture();
  const expectedRecipients = [
    ["engineer", "pending", "override"], ["engineer"], ["engineer"], ["shop"], ["shop"],
    ["engineer", "shop", "worker", "editor"]
  ];
  const types = ["remark", "ppr-approval", "ppr-approval-cleared", "remark", "remark-cleared", "downtime"];
  const ttls = [3600, 86400, 300, 3600, 300, 3600];
  const badges = { engineer: 3, shop: 2, worker: 3, editor: 2, pending: 1, override: 4 };
  for (const [index, [name, args]] of calls(db).entries()) {
    const h = makeHarness(structuredClone(db));
    await h.invoke(name, args);
    assert.deepEqual(h.errors, []);
    assert.deepEqual(h.sent.map(item => item.subscription.endpoint.split("/").at(-1)).sort(), expectedRecipients[index].slice().sort(), name);
    for (const item of h.sent) {
      const id = item.subscription.endpoint.split("/").at(-1);
      assert.equal(item.payload.type, types[index]);
      assert.equal(item.payload.badgeCount, badges[id]);
      assert.deepEqual(item.options, { TTL: ttls[index], urgency: [2, 4].includes(index) ? "normal" : "high", timeout: 10000 });
      if (index === 0) assert.deepEqual(item.payload, {
        type: "remark", title: "ALKZ — новое замечание", body: "Поступило новое замечание",
        badgeCount: badges[id], url: "/?remark=r1", entityId: "r1", tag: "remark:r1"
      });
      if (index === 1) assert.equal(item.payload.body, "Press: требуется подтверждение инженера");
      if (index === 2) assert.equal(item.payload.clearTag, "ppr-approval:ppr-sheet:2026-09-08");
      if (index === 3) assert.equal(item.payload.title, "uz:Title");
      if (index === 4) assert.deepEqual(item.payload, { type: "remark-cleared", badgeCount: 2, clearTag: "remark:r1", silentUpdate: true });
      if (index === 5) assert.equal(item.payload.url, "/?downtime=down%201");
    }
    assert.deepEqual(h.db, db, name + " must not normalize persisted state");
    assert.deepEqual(h.writes, []);
  }
});

test("deferred senders detach photo-bearing inputs before delivery and preserve new VAPID creation", async () => {
  for (const [name, args] of calls(fixture())) {
    const db = fixture();
    delete db.pushNotifications.vapid;
    const before = structuredClone(db);
    const h = makeHarness(db);
    await h.transactions.run(() => h.invoke(name, args));
    await h.transactions.idle();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(h.sent.length, name);
    assert.deepEqual(h.errors, []);
    assert.deepEqual(h.db.checks, before.checks);
    assert.deepEqual(h.writes, [{ action: "push_config_created" }]);
  }
});

test("expired subscriptions are removed from fresh state, ordinary failures are not removed", async () => {
  for (const statusCode of [404, 410, 500]) {
    const h = makeHarness(fixture(), { delivery: async () => { throw Object.assign(new Error("synthetic"), { statusCode }); } });
    await h.invoke("sendPprApprovalPushNotifications", [{ id: "s", rows: [] }, "override"]);
    assert.equal(h.db.pushNotifications.subscriptions.some(item => item.clientId === "engineer"), statusCode === 500);
    assert.equal(h.writes.length, statusCode === 500 ? 0 : 1);
  }
});

test("downtime explicit empty recipients stay empty; identity fallbacks are preserved", async () => {
  const h = makeHarness(fixture());
  await h.invoke("sendDowntimePushNotifications", ["Title", "Body", "", [], "down 1"]);
  assert.equal(h.sent.length, 0);
  for (const participant of [
    { employeeId: "  Employee  " }, { phone: "+7 123" }, { name: " Person ", role: " mechanic " }, {}
  ]) {
    assert.equal(h.context.resolutionUserKeyServer(push.pushParticipants([participant])[0]), h.context.resolutionUserKeyServer(participant));
  }
});

test("public-key snapshot returns only the key, without legacy counting; all seven sends have transport timeout", async () => {
  const db = fixture(), before = structuredClone(db), h = makeHarness(db);
  assert.equal(await h.context.pushDbSnapshot(state => state.pushNotifications.vapid.publicKey), "test-public");
  assert.deepEqual(h.db, before);
  assert.equal((source.match(/timeout: PUSH_TIMEOUT_MS/g) || []).length, 7);
  for (const name of senders.slice(1)) assert.equal(new RegExp(name + "\\(readDb\\(\\)").test(source), false);
});

test("pending deliveries retain neither transaction snapshots nor original photo-bearing arguments", { skip: !global.gc }, async () => {
  for (let index = 0; index < senders.length; index += 1) {
    const pending = [], references = [];
    const h = makeHarness(fixture(), { delivery: () => new Promise(resolve => pending.push(resolve)) });
    h.context.createPushSnapshot = (db, ...args) => {
      references.push(new WeakRef(db));
      return push.createPushSnapshot(db, ...args);
    };
    const task = (() => {
      const [name, args] = calls(fixture())[index];
      if (index === 5) args[3] = fixture().users;
      const raw = index === 0 ? args[5] : index === 5 ? args[3] : args[0];
      if (raw) references.push(new WeakRef(raw));
      return h.invoke(name, args);
    })();
    await h.transactions.idle();
    for (let turn = 0; turn < 4; turn += 1) {
      await new Promise(resolve => setImmediate(resolve));
      global.gc();
    }
    assert.ok(pending.length, senders[index]);
    for (const reference of references) assert.equal(reference.deref(), undefined, senders[index]);
    pending.forEach(resolve => resolve());
    await task;
  }
});

}

module.exports = { makeHarness, fixture, calls, source };
