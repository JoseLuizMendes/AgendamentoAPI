import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptFile);
const projectRoot = dirname(scriptsDir);

async function copy(fromRel, toRel) {
  const from = join(projectRoot, fromRel);
  const to = join(projectRoot, toRel);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
}

await copy("docs/index.html", "dist/docs/index.html");
await copy("openapi.json", "dist/openapi.json");
