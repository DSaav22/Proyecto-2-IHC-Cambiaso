import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lcov = join(root, "coverage/lcov.info");

if (!existsSync(lcov)) {
  console.error("Falta coverage/lcov.info. Corré primero: pnpm test:coverage");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

let compare = process.env.DIFF_COVER_COMPARE;
if (!compare) {
  try {
    compare = git(["merge-base", "HEAD", "upstream/master"]);
  } catch {
    try {
      compare = git(["merge-base", "HEAD", "origin/master"]);
    } catch {
      compare = git(["rev-list", "--max-parents=0", "HEAD"]);
    }
  }
}

console.log(`diff-cover contra ${compare}`);

const html = join(root, "coverage/diff-cover.html");
const toolArgs = [lcov, `--compare-branch=${compare}`, `--format=html:${html}`, "--format=markdown:stdout"];

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
}

try {
  run("diff-cover", toolArgs);
  process.exit(0);
} catch {
  // continue with Python module
}

const pyModule = ["-m", "diff_cover.diff_cover_tool", ...toolArgs];
const attempts =
  process.platform === "win32"
    ? [
        ["py", ["-3", ...pyModule]],
        ["python", pyModule],
      ]
    : [
        ["python3", pyModule],
        ["python", pyModule],
      ];

let lastError;
for (const [bin, args] of attempts) {
  try {
    run(bin, args);
    process.exit(0);
  } catch (error) {
    lastError = error;
  }
}

console.error(lastError instanceof Error ? lastError.message : lastError);
process.exit(1);
