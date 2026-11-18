import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "coverage");
mkdirSync(outDir, { recursive: true });

const sources = [
  { path: join(root, "apps/backend/coverage/lcov.info"), prefix: "apps/backend/" },
  { path: join(root, "apps/frontend/coverage/lcov.info"), prefix: "apps/frontend/" },
];

function normalize(content, prefix) {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      if (!line.startsWith("SF:")) return line;
      const raw = line.slice(3).replace(/\\/g, "/");
      const relative = raw.replace(/^\.\//, "");
      if (relative.startsWith("apps/")) return `SF:${relative}`;
      return `SF:${prefix}${relative}`;
    })
    .join("\n");
}

const parts = [];
for (const source of sources) {
  if (!existsSync(source.path)) continue;
  parts.push(normalize(readFileSync(source.path, "utf8"), source.prefix));
}

if (parts.length === 0) {
  console.error("No se encontró lcov.info en apps/*/coverage");
  process.exit(1);
}

writeFileSync(join(outDir, "lcov.info"), `${parts.join("\n")}\n`, "utf8");
console.log(`Cobertura combinada en coverage/lcov.info (${parts.length} reportes)`);
