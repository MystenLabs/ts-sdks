---
'@mysten/sui': major
---

Add `client.verifySignature`, which verifies a `personalMessage` or `transaction` signature for an
`address` on the node, accepting signatures from the address's current address aliases
(`checkAddressAliases: false` for a strict check), and `client.getAddressAliases`. Both are on
`SuiGrpcClient`, `SuiGraphQLClient` and `client.core`, and `CoreClient` has a new abstract
`verifySignature` method. `verifySignature` requires `address` and throws for transaction bytes that
are not `TransactionData`. `verifyZkLoginSignature` is deprecated in favor of `verifySignature`,
now checks address aliases too, and throws for undecodable transaction bytes instead of returning
`success: false`.

The personal message and transaction helpers in `@mysten/sui/verify` need a `client` or
`offline: true`. With a client, the node verifies signatures and checks address aliases when an
`address` is given; `offline: true` verifies locally and throws for zkLogin signatures.
`verifyPersonalMessageSignature` and `isValidPersonalMessageSignature` accept a string message, and
`PublicKey.verifyAddress` normalizes the address it is given.
