---
'@mysten/sui': major
---

Behavior change (ships with 3.0): `normalizeSuiAddress` and `normalizeSuiObjectId` now throw
`Invalid Sui address: <input>` when the value, after removing an optional `0x` prefix, is empty,
contains non-hex characters, or is longer than 32 bytes (64 hex characters). Previously they padded
any input, so strings like `0xzz` or over-length hex produced a nonsense address. Short hex (padded),
input without `0x`, and uppercase hex (lowercased) are still accepted.

Because they normalize through it, `normalizeStructTag`/`parseStructTag` (for non-MVR addresses),
`tx.object(id)`, `Inputs.ObjectRef`/`SharedObjectRef`/`ReceivingRef`, `bcs.TypeTag`, and transaction
data validation (sender, gas owner, object IDs, package IDs) now reject such input instead of
silently producing an invalid address. `isValidSuiAddress` and `isValidSuiObjectId` are unchanged and
never throw.
