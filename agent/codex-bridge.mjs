import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const appUrl = String(process.env.PPR_APP_URL || "https://ppr-control-ramazan.onrender.com").replace(/\/+$/, "");
const token = String(process.env.CODEX_AGENT_TOKEN || "");
const agentId = String(process.env.CODEX_AGENT_ID || `ppr-codex-${process.env.COMPUTERNAME || "windows"}`);
const repoDir = resolve(process.env.PPR_REPO_DIR || process.cwd());
const codexBin = String(process.env.CODEX_BIN || "codex");
const pollMs = Math.max(5000, Number(process.env.CODEX_AGENT_POLL_MS) || 30000);
const runOnce = process.env.CODEX_AGENT_ONCE === "1";

if (!token) throw new Error("CODEX_AGENT_TOKEN is required");

async function agentApi(pathname, options = {}) {
  const response = await fetch(`${appUrl}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-codex-agent-token": token,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${body.error || response.statusText}`);
  return body;
}

async function patchTask(taskId, leaseId, patch) {
  return agentApi(`/api/agent/codex-tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, leaseId })
  });
}

async function downloadAttachments(task, taskDir) {
  const files = [];
  for (const attachment of task.attachments || []) {
    const url = new URL(String(attachment.url || ""), `${appUrl}/`);
    if (url.origin !== new URL(appUrl).origin) continue;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`attachment ${response.status}`);
    const fileName = basename(url.pathname) || "attachment";
    const filePath = join(taskDir, fileName);
    await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    files.push({ ...attachment, filePath });
  }
  return files;
}

function buildPrompt(task, attachments) {
  const attachmentText = attachments.length
    ? `\n\nВложения пользователя:\n${attachments.map(file => `- ${file.name || basename(file.filePath)}: ${file.filePath}`).join("\n")}`
    : "";
  return [
    "Задание пришло из приложения PPR-Control от основного администратора.",
    "Работай только в текущем репозитории. Сначала проверь состояние git и существующий код.",
    "Не публикуй, не объединяй PR и не меняй внешние сервисы без явного указания в самом задании.",
    "Выполни безопасные локальные изменения и проверки. В финале кратко сообщи результат и проверки.",
    "",
    task.text,
    attachmentText
  ].join("\n");
}

async function runCodex(task, attachments, taskDir) {
  const outputFile = join(taskDir, "final.txt");
  const imageArgs = attachments
    .filter(file => /^image\//i.test(String(file.type || "")))
    .flatMap(file => ["--image", file.filePath]);
  const args = [
    "exec",
    "--sandbox", "workspace-write",
    "--cd", repoDir,
    "--color", "never",
    "--output-last-message", outputFile,
    ...imageArgs,
    buildPrompt(task, attachments)
  ];
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(codexBin, args, {
      cwd: repoDir,
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true
    });
    let errorText = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => {
      errorText = `${errorText}${chunk}`.slice(-8000);
    });
    child.on("error", rejectRun);
    child.on("exit", code => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(errorText.trim() || `Codex exited with code ${code}`));
    });
  });
  return (await readFile(outputFile, "utf8")).trim();
}

async function processTask(task) {
  const safeId = String(task.id || "task").replace(/[^a-z0-9_-]/gi, "_");
  const taskDir = join(tmpdir(), "ppr-codex-agent", safeId);
  await mkdir(taskDir, { recursive: true });
  const leaseId = String(task.leaseId || "");
  let keepAlive;
  try {
    await patchTask(task.id, leaseId, {
      status: "analyzing",
      estimatedMinutes: 20,
      result: "Codex получил задание и начал проверку."
    });
    keepAlive = setInterval(() => {
      patchTask(task.id, leaseId, { status: "working" }).catch(() => {});
    }, 60000);
    const attachments = await downloadAttachments(task, taskDir);
    await patchTask(task.id, leaseId, { status: "working", result: "Codex выполняет задание." });
    const finalResponse = await runCodex(task, attachments, taskDir);
    await patchTask(task.id, leaseId, { status: "completed", result: finalResponse || "Задание завершено." });
  } catch (error) {
    await patchTask(task.id, leaseId, {
      status: "failed",
      result: `Агент остановился: ${String(error?.message || error).slice(0, 9000)}`
    }).catch(() => {});
  } finally {
    clearInterval(keepAlive);
    await rm(taskDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  console.log(`PPR Codex agent started: ${agentId}`);
  for (;;) {
    try {
      const claimed = await agentApi("/api/agent/codex-tasks/claim", {
        method: "POST",
        body: JSON.stringify({ agentId })
      });
      if (claimed.task) await processTask(claimed.task);
    } catch (error) {
      console.error(new Date().toISOString(), String(error?.message || error));
    }
    if (runOnce) break;
    await new Promise(resolveWait => setTimeout(resolveWait, pollMs));
  }
}

await main();
