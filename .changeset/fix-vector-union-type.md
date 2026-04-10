---
'@mysten/codegen': patch
---

Fix vector type codegen for union inner types (e.g. `vector<u64>`) by using `Array<T>` instead of `T[]` to prevent incorrect TypeScript type parsing when T is a union type.
