import { spawn } from "node:child_process";

const children = new Set();

function run(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`[startup] running: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, { stdio: "inherit" });
    children.add(child);

    child.once("exit", (code, signal) => {
      children.delete(child);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "null"} signal ${signal ?? "null"}`
        )
      );
    });
    child.once("error", (error) => {
      children.delete(child);
      reject(error);
    });
  });
}

function trimEnv(name) {
  return process.env[name]?.trim() || "";
}

function hasCuratorBotToken() {
  return Boolean(
    trimEnv("CURATOR_TELEGRAM_BOT_TOKEN") || trimEnv("TELEGRAM_BOT_TOKEN")
  );
}

function isCuratorPollingDisabled() {
  return trimEnv("CURATOR_TELEGRAM_POLLING_DISABLED") === "1";
}

function isProductionSeedEnabled() {
  return trimEnv("RUN_PRODUCTION_SEED") === "1";
}

function start(command, args, label, options = {}) {
  const restart = options.restart ?? false;
  const restartDelayMs = options.restartDelayMs ?? 5000;

  console.log(`[startup] starting ${label}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, { stdio: "inherit" });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    console.log(
      `[startup] ${label} exited with code ${code ?? "null"} signal ${signal ?? "null"}`
    );
    if (label === "server") {
      shutdown(code ?? 1);
      return;
    }

    if (restart && !shuttingDown) {
      console.log(`[startup] restarting ${label} in ${restartDelayMs}ms`);
      setTimeout(() => {
        if (!shuttingDown) {
          start(command, args, label, options);
        }
      }, restartDelayMs).unref();
    }
  });
  child.once("error", (error) => {
    children.delete(child);
    console.error(`[startup] ${label} failed`, error);
    if (label === "server") {
      shutdown(1);
    }
  });
  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 3000).unref();
}

process.once("SIGTERM", () => shutdown(0));
process.once("SIGINT", () => shutdown(0));

try {
  await run("node", ["scripts/repair-accounting-migration.mjs"]);
  await run("npx", ["prisma", "migrate", "deploy"]);
  if (isProductionSeedEnabled()) {
    await run("npx", ["prisma", "db", "seed"]);
  } else {
    console.log(
      "[startup] prisma db seed skipped: set RUN_PRODUCTION_SEED=1 to run it explicitly"
    );
  }
  if (hasCuratorBotToken() && !isCuratorPollingDisabled()) {
    start("node", ["scripts/curator-bot-poller.mjs"], "curator-poller", {
      restart: true
    });
  } else {
    console.log(
      "[startup] curator-poller skipped: token missing or polling disabled"
    );
  }
  start("node", ["server.js"], "server");
} catch (error) {
  console.error("[startup] failed", error);
  shutdown(1);
}
