---
'@mysten/sui': major
---

The `@mysten/sui/verify` helpers now need a `client` or `offline: true`. With a client, personal
message and transaction signatures are verified by the node. To verify a signature, prefer
`client.verifySignature`; the helpers remain for offline verification or when you need the signer's
public key. When `client.verifySignature` or a helper with a client is given an `address`, the
signer may be `address` or one of its current address aliases (`checkAddressAliases`, default
`true`), and the call throws if the node didn't apply that check. Pass `checkAddressAliases: false`
for a strict signer-equals-address check. `offline: true` verifies locally and can't verify zkLogin
signatures. The raw-bytes `verifySignature` export from `@mysten/sui/verify` and `isValidSignature`
now require `offline: true`. `verifyPersonalMessageSignature` and
`isValidPersonalMessageSignature` also accept a string message, UTF-8 encoded like
`client.verifySignature`. `CoreClient` has a new abstract `verifySignature` method.
