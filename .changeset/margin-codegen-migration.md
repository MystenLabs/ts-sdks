---
'@mysten/deepbook-v3': patch
---

Internal refactor: the margin transaction builders now delegate to generated codegen bindings with
named arguments instead of positional `moveCall` argument arrays, removing the risk of transposing
same-typed arguments (base/quote oracles, base/quote margin pools). `deepbook_margin` and
`margin_liquidation` were added to `sui-codegen.config.ts`; human-unit conversion and coin plumbing
stay in the facade, so this is a pure construction-layer change.

No API or behavior change: every migrated builder emits a byte-identical transaction, verified by a
new PTB snapshot test (`test/unit/transactions/margin-ptb-snapshot.test.ts`). Two builders whose
command/input interleaving does not reduce cleanly (`marginPool.supplyToMarginPool`,
`marginAdmin.revokeMaintainerCap`) are intentionally left as positional `moveCall`s.
