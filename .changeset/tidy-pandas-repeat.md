---
'@mysten/walrus': minor
---

Make WAL payments resilient to on-chain price changes. Payment coins are no longer split as exact
change and destroyed with `destroy_zero` (which aborted whenever storage or write prices changed
between cost estimation and execution). Instead, provided `walCoin` sources are used directly (only
the actual on-chain cost is deducted), and payments funded from the signer's balance include a
configurable buffer (`costBufferBps`, default 10%) with any unspent WAL returned to the signer's
address balance. Payment aborts caused by stale cached prices now reset the client's caches, are
retried once automatically, and surface as the new `StalePriceError` (a
`RetryableWalrusClientError`).
