---
'@mysten/sui': minor
---

Add `isValidSignature`, `isValidPersonalMessageSignature`, and `isValidTransactionSignature` to `@mysten/sui/verify` — boolean-returning siblings of the existing `verify*` functions, taking the same arguments. They return `false` for a malformed or invalid signature (or one that doesn't match a supplied `address`) instead of throwing, while still letting a genuine environmental failure during verification (e.g. a zkLogin JWK/epoch lookup) propagate. The `verify*` functions now delegate to these.
