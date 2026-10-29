---
'@mysten/sui': major
---

The `@mysten/sui/verify` helpers now need a `client` or `offline: true`. With a client, personal
message and transaction signatures are verified by the node. To verify a signature, prefer
`client.verifySignature`; the helpers remain for offline verification or when you need the signer's
public key. When `address` is given, the signer may be `address` or one
of its current address aliases (`checkAddressAliases`, default `true`). Pass
`checkAddressAliases: false` for the previous strict check. `offline: true` verifies locally and
can't verify zkLogin signatures. The raw-bytes `verifySignature` export from `@mysten/sui/verify`
and `isValidSignature` only verify offline. `CoreClient` has a new abstract `verifySignature` method.
