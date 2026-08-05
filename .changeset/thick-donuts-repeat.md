---
'@mysten/sui': patch
---

Fix `effects.gasObject` being populated with an invalid all-null object for transactions that have no gas object (system transactions, or transactions paying gas from an address balance). The gRPC transport and the JSON-RPC simulation path now return `null`, matching the declared `TransactionEffects` type and the BCS-based effects parsing used by the other code paths.
