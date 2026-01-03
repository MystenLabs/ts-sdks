---
"@mysten/dapp-kit-core": patch
"@mysten/dapp-kit-react": patch
---

Fix type declaration resolution issues in dapp-kit packages

- Add explicit `types` field to package.json exports for proper TypeScript module resolution
- Set `hash: false` in tsdown config to prevent hashed output filenames that break type resolution
- Export hook options types from dapp-kit-react for better DX
- Fix file extensions in dapp-kit-core exports (`.mjs` → `.js`)
