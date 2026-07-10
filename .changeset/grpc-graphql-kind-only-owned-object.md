---
'@mysten/sui': patch
---

Fix kind-only transaction builds (`onlyTransactionKind: true`) that reference an owned
object without a sender set (e.g. the seal use-case). The gRPC and GraphQL clients now
disable simulation validation checks when resolving kind-only builds, so a transaction
that would fail to simulate can still be serialized. Kind-only builds also no longer leak
the dummy `0x0` sender used for resolution back into the transaction data, matching the
JSON-RPC client's behavior.
