import { spawnSync } from "node:child_process";

const currentOpts = process.env.NODE_OPTIONS || "";
const hasHeapLimit = currentOpts.includes("--max-old-space-size");
const nodeOptions = hasHeapLimit
  ? currentOpts
  : `${currentOpts} --max-old-space-size=1536`.trim();

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "build"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
  }
);

process.exit(result.status ?? 1);
