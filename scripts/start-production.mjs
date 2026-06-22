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
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "null"} signal ${signal ?? "null"}`));
    });
    child.once("error", (error) => {
      children.delete(child);
      reject(error);
    });
  });
}

function start(command, args, label) {
  console.log(`[startup] starting ${label}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, { stdio: "inherit" });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    console.log(`[startup] ${label} exited with code ${code ?? "null"} signal ${signal ?? "null"}`);
    if (label === "server") {
      shutdown(code ?? 1);
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
  await run("npx", ["prisma", "migrate", "deploy"]);
  await run("npx", ["prisma", "db", "seed"]);
  start("node", ["scripts/curator-bot-poller.mjs"], "curator-poller");
  start("node", ["server.js"], "server");
} catch (error) {
  console.error("[startup] failed", error);
  shutdown(1);
}
