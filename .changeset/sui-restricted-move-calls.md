---
'@mysten/sui': major
---

Building or serializing a transaction that calls `0x2::address_alias` now throws. Configure the
restricted list with the new `restrictedMoveCalls` option on `SuiGrpcClient` and `SuiGraphQLClient`
(`package`, `package::module` or `package::module::function` entries; default
`DEFAULT_RESTRICTED_MOVE_CALLS`), which applies wherever a transaction is built with that client,
including `signAndExecuteTransaction`, `simulateTransaction`, the executors and dapp-kit. `build`,
`toJSON`, `sign` and `getDigest` also take `restrictedMoveCalls`, which takes precedence; pass `[]`
to allow all calls. `findRestrictedMoveCalls` runs the same check on a transaction's data without
throwing, and `validateRestrictedMoveCalls` checks a list's entries.
