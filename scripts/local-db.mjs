import { execFileSync } from "node:child_process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const options = { stdio: "inherit", shell: true };

execFileSync(
  npx,
  ["prisma", "db", "push", "--schema", "prisma/schema.local.prisma"],
  options,
);
execFileSync(
  npx,
  ["prisma", "generate", "--schema", "prisma/schema.local.prisma"],
  options,
);

console.log("Local SQLite database is ready at prisma/dev.db");
