---
'@mysten/sui': major
---

Align the BCS schemas with the Sui protocol so every system transaction decodes. Shared object inputs
encode `SharedObjectMutability`: settlement transactions that take non-exclusive write access now
parse as `{ mutable: false, mutability: 'NonExclusiveWrite' }` and re-serialize to the same bytes
(add `bcs.SharedObjectMutability`). `bcs.Owner` gains the `Party` variant, which BCS-decoded effects
report as an `Unknown` owner. `bcs.MoveObjectType` renames `AccumulatorBalanceWrapper` to
`SuiBalanceAccumulatorField` and adds `BalanceAccumulatorField`.
