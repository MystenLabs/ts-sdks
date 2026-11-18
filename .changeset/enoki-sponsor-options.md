---
'@mysten/enoki': minor
---

- `EnokiClient.prepareSponsoredTransaction({ transaction, network })` sets Enoki's sponsor as gas owner with an empty gas payment. It works with a public API key, so a browser can prepare a transaction, have the wallet sign it, and send it to your backend. `EnokiClient.getSponsorAddress({ network })` returns the cached address. The `enoki()` extension's `prepareSponsoredTransaction` and `getSponsorAddress` now use these.
- `client.enoki.getSponsorSigner()` returns a remote signer for the sponsor SDK's `createSponsor`, so a sponsor built with it uses Enoki. Transactions Enoki declines are returned as `Rejected`.
