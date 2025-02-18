import fs from "fs";
import path from "path";

const findRoot = require("find-root");


// New function to download tree-sitter.json from the GitHub repo
import packageInfo from "./package.json";

// Assert that devDependencies is a Record of string keys and string values.
const devDeps = packageInfo.devDependencies as Record<string, string>;

let hasErrors = false;


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
    // Resolve the absolute path of the 'swift-parser' relative to the current file.
    const folderPath = path.resolve(__dirname, 'swift-parser');

    if (fs.existsSync(folderPath)) {
        console.log(`Folder exists at: ${folderPath}`);
    } else {
        console.error('Folder not found!');
    }

    // First: Run the patch to add tree-sitter.json for specified packages.
    if (packageInfo.patch && Array.isArray(packageInfo.patch.addTreeSitterJSON)) {
        for (const pkg of packageInfo.patch.addTreeSitterJSON) {
            await addTreeSitterJSON(pkg);
        }
    }

    if (hasErrors) {
        process.exit(1);
    }
})();