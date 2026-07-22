---
'@mysten/deepbook-v3': patch
---

Internal refactor: the core transaction builders (`deepbook`, `balanceManager`, `deepbookAdmin`,
`flashLoans`, `governance`) now delegate to generated `@deepbook/core` codegen bindings with named
arguments instead of positional `moveCall` argument arrays, removing the risk of transposing
same-typed arguments. This completes the codegen migration begun for the margin surface; unit
conversion, coin plumbing, and trade-proof composition stay in the facade, so it is a pure
construction-layer change.

No API or behavior change: every migrated builder emits a byte-identical transaction, verified by a
new PTB snapshot test (`test/unit/transactions/core-ptb-snapshot.test.ts`). Two builders whose
calls don't map to a generated binding (`createAndShareBalanceManager` — `balance_manager::new` is
called zero-arg but the current-source binding adds an `Owner`; and `shareBalanceManager` — a
`0x2::transfer` framework call) are intentionally left as positional `moveCall`s.
