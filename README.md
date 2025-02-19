# tree-sitter-wasms-cline
Prebuilt WASM Binaries of Tree-sitter's Language Parsers for Cline. Forked from [https://github.com/Gregoor/tree-sitter-wasms](https://github.com/Gregoor/tree-sitter-wasms)

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

