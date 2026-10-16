---
'@mysten/sui': major
---

Align the BCS schemas with Sui 1.82 so every system transaction decodes:

- `bcs.SharedObjectRef` encodes the new `bcs.SharedObjectMutability`. Non-exclusive write inputs in
  system transactions parse as `{ mutable: false, mutability: 'NonExclusiveWrite' }`.
- `bcs.Owner` adds the `Party` variant. BCS-decoded effects report party owners as `Unknown`.
- `bcs.MoveObjectType` renames `AccumulatorBalanceWrapper` to `SuiBalanceAccumulatorField` and adds
  `BalanceAccumulatorField`.
