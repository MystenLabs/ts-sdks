---
'@mysten/create-dapp': minor
---

Update create-dapp templates:

- Migrate from `@mysten/dapp-kit` to `@mysten/dapp-kit-react`
- Upgrade React to version 19.2.1
- Remove forwardRef usage in favor of React 19 ref prop pattern
- Add TypeScript code generation support using `@mysten/codegen`
- Update UI components to use shadcn/ui-style card and button components
- Update to Tailwind CSS v4
- Update example code to use gRPC client and new SDK patterns
- Fix transaction result handling to properly unwrap TransactionResult types
- Add documentation and setup guides
- Fix dependency injection for devDependencies
