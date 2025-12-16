---
"@mysten/codegen": minor
---

Add automatic import aliasing to resolve naming conflicts and configurable import extensions.

**Import Conflict Resolution:**
When Move contracts define structs, enums, or functions with names that conflict with SDK imports (e.g., `Transaction`, `BcsType`, `bcs`, `MoveStruct`, `normalizeMoveArguments`), the codegen now automatically aliases the SDK imports to avoid TypeScript compilation errors while preserving the user's original type names.

**Import Extension Configuration:**
Added `importExtension` option to control file extensions in generated import statements:
- Config file: `importExtension: '.js' | '.ts' | ''`
- CLI: `--import-extension .js|.ts|none`

This allows compatibility with different bundler/runtime configurations:
- `.js` (default): ESM compatible for Node.js
- `.ts`: For Bun, Deno, or bundlers that handle .ts imports directly
- `''` (none): For bundlers that don't require extensions
