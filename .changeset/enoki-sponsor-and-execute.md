---
'@mysten/enoki': minor
---

Add Enoki sponsorship in one request:

- `enoki()` client extension: `client.enoki.sponsorAndExecuteTransaction({ transaction, signer })` builds the transaction with Enoki as gas owner, signs it, and has Enoki sponsor and execute it. It also accepts already-built bytes with a `signature`. `client.enoki.prepareSponsoredTransaction({ transaction })` sets Enoki as gas owner without building, for signing with a wallet or running your own checks first, and `client.enoki.getSponsorAddress()` returns the sponsor address.
- `EnokiClient.sponsorAndExecuteTransaction`, and `sponsorAddresses` on `getApp`'s response.
- `EnokiClientError#requiresRebuild` and `isStaleTransactionError`, for errors where the transaction must be built and signed again before retrying.
