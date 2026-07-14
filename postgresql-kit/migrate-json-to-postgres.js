const fs = require("fs");
const path = require("path");
const { createPostgresStore } = require("./db-postgres");

async function main() {
  const source = process.argv[2] || process.env.JSON_DB_PATH;
  if (!source) throw new Error("Укажите путь к db.json первым аргументом или JSON_DB_PATH");
  const db = JSON.parse(fs.readFileSync(path.resolve(source), "utf8"));
  const store = createPostgresStore();
  const patch = {
    checks: db.checks || {},
    requests: db.requests || {},
    inventory: db.inventory || {},
    catalog: db.catalog || { equipment: {} },
    directorMessages: db.directorMessages || [],
    downtimes: db.downtimes || [],
    compressorJournal: db.compressorJournal || {},
    gasJournal: db.gasJournal || {},
    journalDueSince: db.journalDueSince || {},
    auditHistory: db.auditHistory || []
  };
  await store.applyPatch(patch, {
    actionId: `migration:${Date.now()}`,
    clientId: "migration",
    user: { name: "Миграция JSON", role: "system" }
  });
  const users = db.users || [];
  for (const user of users) {
    await store.pool.query(
      `INSERT INTO ppr_users(id, employee_id, phone, name, role, area, password_hash, approved, pending_approval, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
       ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload, updated_at=now()`,
      [
        user.id || `user:${user.employeeId || user.phone || Date.now()}`,
        user.employeeId || "", user.phone || "", user.name || "Сотрудник",
        user.role || "", user.area || "", user.passwordHash || "",
        user.approved !== false, user.pendingApproval === true, JSON.stringify(user)
      ]
    );
  }
  console.log(`Миграция завершена. Записей пользователей: ${users.length}`);
  await store.pool.end();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
