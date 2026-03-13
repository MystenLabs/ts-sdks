---
'@mysten/sui': minor
---

Add optional `ownerKind` and `type` fields to `UnresolvedObject` for validating object owner kind and Move type during transaction resolution. Both fields accept arrays with OR semantics. Replaces the previous `kind` field (unreleased).
