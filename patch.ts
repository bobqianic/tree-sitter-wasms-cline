import fs from "fs";
import path from "path";

const findRoot = require("find-root");


// New function to download tree-sitter.json from the GitHub repo
import packageInfo from "./package.json";

// Assert that devDependencies is a Record of string keys and string values.
const devDeps = packageInfo.devDependencies as Record<string, string>;
const patch_addTreeSitterSrc = packageInfo.patch.addTreeSitterSrc as Record<string, string>;

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

function isPlainObject(obj: unknown): obj is Record<string, unknown> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        obj.constructor === Object
    );
}

/**
 * Recursively copies all files and subdirectories from src to dest.
 * If a file already exists in dest, it will be overridden.
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
    // Create the destination directory (and its parents) if it doesn't exist.
    await fs.promises.mkdir(dest, { recursive: true });
    // Read the contents of the source directory.
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            // Recursively copy subdirectories.
            await copyDirectory(srcPath, destPath);
        } else {
            // Copy files (overwriting if necessary).
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
}

async function addTreeSitterSrc() {
    // Here, the key is the local source folder, and the value is the destination folder in node_modules.
    for (const srcKey in patch_addTreeSitterSrc) {
        const destValue = patch_addTreeSitterSrc[srcKey];

        // Resolve the source folder relative to the current directory.
        const srcFolder = path.resolve(__dirname, srcKey);

        // Process the destination specification.
        // The first part is the package name, and the rest is the subdirectory path.
        const [destPackage, ...destSubDirs] = destValue.split("/");
        let packageRoot: string;
        try {
            packageRoot = findRoot(require.resolve(destPackage));
        } catch (_) {
            packageRoot = path.join(__dirname, "node_modules", destPackage);
        }
        const destFolder = path.join(packageRoot, ...destSubDirs);

        console.log(`Copying from source ${srcFolder} to destination ${destFolder}`);
        try {
            await copyDirectory(srcFolder, destFolder);
            console.log(`✅ Successfully copied from ${srcKey} to ${destValue}`);
        } catch (error) {
            console.error(`🔥 Failed to copy from ${srcKey} to ${destValue}:`, error);
            hasErrors = true;
        }
    }
}

(async () => {
    // First: Run the patch to add tree-sitter.json for specified packages.
    if (packageInfo.patch && Array.isArray(packageInfo.patch.addTreeSitterJSON)) {
        for (const pkg of packageInfo.patch.addTreeSitterJSON) {
            await addTreeSitterJSON(pkg);
        }
    }

    // Second: Copy tree-sitter parser source to the specified location.
    if (packageInfo.patch && isPlainObject(packageInfo.patch.addTreeSitterSrc)) {
        await addTreeSitterSrc();
    }

    if (hasErrors) {
        process.exit(1);
    }
})();