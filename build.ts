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
// Assert that devDependencies is a Record of string keys and string values.
const devDeps = packageInfo.devDependencies as Record<string, string>;

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

// New function to download tree-sitter.json from the GitHub repo
async function addTreeSitterJSON(packageName: string) {
  let packagePath;
  try {
    packagePath = findRoot(require.resolve(packageName));
  } catch (_) {
    packagePath = path.join(__dirname, "node_modules", packageName);
  }

  const devDep = devDeps[packageName];
  if (!devDep || !devDep.startsWith("github:")) {
    console.error(
        `No valid GitHub repository URL found for package ${packageName}`
    );
    return;
  }

  // Remove the "github:" prefix.
  const repoSpec = devDep.replace("github:", "");
  let username: string, repo: string, commitOrBranch: string;

  // Check if the URL uses a hash to denote the commit or branch.
  if (repoSpec.includes("#")) {
    const [repoPart, ref] = repoSpec.split("#");
    const parts = repoPart.split("/");
    if (parts.length !== 2) {
      console.error(
          `Unexpected GitHub URL format for package ${packageName}: ${devDep}`
      );
      return;
    }
    username = parts[0];
    repo = parts[1];
    commitOrBranch = ref;
  } else {
    console.error(
        `Unexpected GitHub URL format for package ${packageName}: ${devDep}`
    );
    return;
  }

  // Construct the raw URL for the tree-sitter.json file.
  // The URL format is:
  // https://raw.githubusercontent.com/username/repo/commitOrBranch/tree-sitter.json
  const rawUrl = `https://raw.githubusercontent.com/${username}/${repo}/${commitOrBranch}/tree-sitter.json`;
  console.log(
      `Fetching tree-sitter.json from ${rawUrl} for package ${packageName}`
  );

  try {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error(
          `Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`
      );
    }
    const content = await response.text();
    const filePath = path.join(packagePath, "tree-sitter.json");
    await fs.promises.writeFile(filePath, content, "utf8");
    console.log(
        `✅ Downloaded tree-sitter.json for ${packageName} to ${filePath}`
    );
  } catch (error) {
    console.error(
        `🔥 Failed to download tree-sitter.json for ${packageName}:`,
        error
    );
    hasErrors = true;
  }
}

(async () => {
  // First: Run the patch to add tree-sitter.json for specified packages.
  if (packageInfo.patch && Array.isArray(packageInfo.patch.addTreeSitterJSON)) {
    for (const pkg of packageInfo.patch.addTreeSitterJSON) {
      await addTreeSitterJSON(pkg);
    }
  }

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
