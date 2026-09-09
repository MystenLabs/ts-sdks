---
'@mysten/deepbook-v3': patch
---

Predict: let `supplyPlp` and `withdrawPlp` set a price floor. Both hard-pinned the request's
floor to 0, so the SDK could only ever queue an LP request that accepts whatever mark the next
pool flush quotes. They now take an optional third argument — `{ minPlpOut }` (raw `bigint`
shares) and `{ minUsdcOut }` (USD decimals) — defaulting to the previous no-floor behaviour.
