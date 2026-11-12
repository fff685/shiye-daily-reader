import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return "";
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith("DATABASE_URL="));
  return line
    ? line.replace("DATABASE_URL=", "").replace(/^"|"$/g, "")
    : "";
}

const url = databaseUrl();
const args = url.startsWith("file:")
  ? ["prisma", "generate", "--schema", "prisma/schema.local.prisma"]
  : ["prisma", "generate"];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

execFileSync(npx, args, { stdio: "inherit", shell: true });
