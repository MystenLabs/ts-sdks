---
'@mysten/sui': minor
---

Add `client.verifySignature`, which verifies a `personalMessage` or `transaction` signature on the
node without loading keypair code, and `client.getAddressAliases`. Both are available on
`SuiGrpcClient`, `SuiGraphQLClient` and the Core API (`client.core`). `verifyZkLoginSignature` is
deprecated in favor of `verifySignature`. `PublicKey.verifyAddress` now normalizes the address it is
given.
