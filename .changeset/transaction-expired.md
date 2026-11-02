---
'@mysten/sui': minor
---

Add the `TransactionExpired` execution error, which Sui returns when a transaction's consensus commit timestamp is outside its `ValidDuring` or `Validity` timestamp window. Raise `MAX_PROTOCOL_VERSION` to 141.
