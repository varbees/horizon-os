import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "api"], { stdio: "inherit", shell: false }),
  spawn("npm", ["run", "dev"], { stdio: "inherit", shell: false }),
];

function shutdown(signal) {
  for (const child of children) child.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
