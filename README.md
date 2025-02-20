[![CI][ci]](https://github.com/bobqianic/tree-sitter-wasms-cline/actions/workflows/build.yml)
[![npm][npm]](https://www.npmjs.com/package/tree-sitter-wasms-cline)

[ci]: https://img.shields.io/github/actions/workflow/status/bobqianic/tree-sitter-wasms-cline/build.yml?logo=github&label=CI
[npm]: https://img.shields.io/npm/v/tree-sitter-wasms-cline?logo=npm

# tree-sitter-wasms-cline
Prebuilt WASM Binaries of tree-sitter's Language Parsers for Cline. Forked from [https://github.com/Gregoor/tree-sitter-wasms](https://github.com/Gregoor/tree-sitter-wasms)

## Installation

```bash
pnpm add tree-sitter-wasms
# or
yarn add tree-sitter-wasms
# or
npm install tree-sitter-wasms
```

## Usage

```ts
import treeSitterRust from "tree-sitter-wasms-cline/out/tree-sitter-rust.wasm"
parser.setLanguage(treeSitterCpp);
```

## Supported Languages

| Language   |
|------------|
| c          |
| c-sharp    |
| cpp        |
| go         |
| java       |
| julia      |
| javascript |
| kotlin     |
| lua        |
| php        |
| python     |
| ruby       |
| rust       |
| swift      |
| typescript |


## Add Languages
We welcome everyone to contribute! If you find a new tree-sitter parser, please create a PR.
However, be aware that combining multiple parsers can be challenging. Currently, to add a new parser, it must meet **ALL** of the following criteria:
> [!IMPORTANT]  
> 1. The parser is open-source on GitHub (not on a private GitLab).
> 2. The parser is actively maintained.
> 3. The version provided uses tree-sitter `0.21.x`.
> 4. The version provided includes a `tree-sitter.json` file.
