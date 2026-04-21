import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function spawnProcess(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    shell: true,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] finalizado com sinal ${signal}`);
      return;
    }

    console.log(`[${name}] finalizado com código ${code ?? 0}`);
  });

  return child;
}

const fileEnv = parseEnvFile(envPath);
const sharedEnv = { ...process.env, ...fileEnv };
const apiPort = sharedEnv.PORT || "3001";
const webPort = sharedEnv.FRONTEND_PORT || "5173";
const apiBaseUrl = sharedEnv.VITE_API_BASE_URL || "";
const apiProxyTarget = `http://127.0.0.1:${apiPort}`;

const apiEnv = {
  ...sharedEnv,
  NODE_ENV: sharedEnv.NODE_ENV || "development",
  PORT: apiPort,
};

const webEnv = {
  ...sharedEnv,
  NODE_ENV: sharedEnv.NODE_ENV || "development",
  PORT: webPort,
  VITE_API_BASE_URL: apiBaseUrl,
  VITE_DEV_API_PROXY_TARGET: apiProxyTarget,
};

console.log("Subindo ambiente local...");
console.log(`API: http://127.0.0.1:${apiPort}`);
console.log(`Frontend: http://127.0.0.1:${webPort}`);
console.log(
  `API base no frontend: ${apiBaseUrl || "(mesmo origin via proxy /api)"}`,
);
console.log(`Proxy local do frontend: /api -> ${apiProxyTarget}`);
if (!fs.existsSync(envPath)) {
  console.log(
    "Aviso: .env.local não encontrado. O ambiente atual do shell será usado.",
  );
}

const apiProcess = spawnProcess(
  "api",
  "pnpm",
  ["--filter", "@workspace/api-server", "run", "dev"],
  apiEnv,
);

const webProcess = spawnProcess(
  "web",
  "pnpm",
  ["--filter", "@workspace/estoque-cdd", "run", "dev"],
  webEnv,
);

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Encerrando ambiente local (${signal})...`);

  for (const child of [apiProcess, webProcess]) {
    if (child && !child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
