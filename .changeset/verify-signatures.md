---
'@mysten/sui': major
---

Add `client.verifySignature`, which verifies a `personalMessage` or `transaction` signature for an
`address` on the node, accepting signatures from the address's current address aliases
(`checkAddressAliases: false` for a strict check), and `client.getAddressAliases`. Both are on
`SuiGrpcClient`, `SuiGraphQLClient` and `client.core`, and `CoreClient` has a new abstract
`verifySignature` method. `verifySignature` requires `address` and throws for transaction bytes that
are not `TransactionData`. `verifyZkLoginSignature` is deprecated in favor of `verifySignature`.

The `@mysten/sui/verify` helpers need a `client` or `offline: true`. With a client, the node verifies
personal message and transaction signatures, and checks address aliases when an `address` is given;
`offline: true` verifies locally and can't verify zkLogin signatures. The raw-bytes `verifySignature`
and `isValidSignature` require `offline: true`. `verifyPersonalMessageSignature` and
`isValidPersonalMessageSignature` accept a string message, and `PublicKey.verifyAddress` normalizes
the address it is given.
