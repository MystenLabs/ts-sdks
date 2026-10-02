---
'@mysten/walrus': minor
---

Make WAL payments resilient to on-chain price changes. Payment coins are no longer split as exact
change and destroyed with `destroy_zero` (which aborted whenever storage or write prices changed
between cost estimation and execution). Payments now fund the estimated cost plus a configurable
buffer (`costBufferBps`, default 10%), and since the walrus contracts only deduct the actual
on-chain cost, any unspent WAL is merged back into the provided `walCoin`, or returned to the
signer's address balance when paying from the signer's balance. Payment aborts caused by stale
cached prices reset the client's caches and surface as the new `StalePriceError` (a
`RetryableWalrusClientError`), so transactions built after the error use freshly loaded prices. The
new `isStalePriceAbort` helper classifies these aborts for transactions executed outside of the
client.
