import fs from "fs";
import os from "os";
import path from "path";
import util from "util";

import { PromisePool } from "@supercharge/promise-pool";
const findRoot = require("find-root");

import packageInfo from "./package.json";

const langArg = process.argv[2];
const exec = util.promisify(require("child_process").exec);
const outDir = path.join(__dirname, "out");

let hasErrors = false;

async function buildParserWASM(
    name: string,
    { subPath, generate }: { subPath?: string; generate?: boolean } = {}
) {
  const label = subPath ? path.join(name, subPath) : name;
  try {
    let packagePath;
    try {
      packagePath = findRoot(require.resolve(name));
    } catch (_) {
      packagePath = path.join(__dirname, "node_modules", name);
    }
    const cwd = subPath ? path.join(packagePath, subPath) : packagePath;
    if (generate) {
      await exec(`pnpm tree-sitter generate`, { cwd });
    }
    await exec(`pnpm tree-sitter build -w ${cwd}`);
    console.log(`✅ Finished building ${label}`);
  } catch (e) {
    console.error(`🔥 Failed to build ${label}:\n`, e);
    hasErrors = true;
  }
}

(async () => {
  // Setup the output directory.
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir);
  process.chdir(outDir);

  // Identify grammar packages from devDependencies.
  const grammars = Object.keys(packageInfo.devDependencies)
      .filter((n) => n.startsWith("tree-sitter-") && n !== "tree-sitter-cli")
      .filter((s) => !langArg || s.includes(langArg));

  // Build parsers concurrently.
  await PromisePool.withConcurrency(os.cpus().length)
      .for(grammars)
      .process(async (name) => {
        if (name === "tree-sitter-php") {
          await buildParserWASM(name, { subPath: "php" });
        } else if (name === "tree-sitter-typescript") {
          await buildParserWASM(name, { subPath: "typescript" });
          await buildParserWASM(name, { subPath: "tsx" });
        } else {
          await buildParserWASM(name);
        }
      });

  if (hasErrors) {
    process.exit(1);
  }

  // Move all generated .wasm files back to the original directory.
  await exec(`mv *.wasm ${outDir}`, { cwd: __dirname });
})();
