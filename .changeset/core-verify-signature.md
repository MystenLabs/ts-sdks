---
'@mysten/sui': minor
---

Add `client.verifySignature`, which verifies a `personalMessage` or `transaction` signature on the
node without loading keypair code. With `address`, the signer may be `address` or one of its current
address aliases (`checkAddressAliases`, default `true`), and the call throws if the node didn't
apply that check. Add `client.getAddressAliases`. Both are available on `SuiGrpcClient`,
`SuiGraphQLClient` and the Core API (`client.core`). `verifyZkLoginSignature` is deprecated in
favour of `verifySignature`. `PublicKey.verifyAddress` now normalizes the address it is given.
