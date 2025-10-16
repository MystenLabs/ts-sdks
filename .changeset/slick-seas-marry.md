---
'@mysten/kiosk': minor
---

Add `return this` in some functions in file `packages/kiosk/src/client/kiosk-transaction.ts` to make it chainable. If chain calls are not supported, some of the usage in the document will not be implemented: line 117 in `packages/docs/content/kiosk/from-v1.mdx` and line 110 in `packages/docs/content/kiosk/kiosk-client/kiosk-transaction/examples.mdx`.
