---
'@mysten/deepbook-predict': patch
---

Add a client-side board pricer for painting a whole board without a chain call per strike. `client.predict.read.pricer(market)` does one simulate of the chain's resolved pricer and returns a `BoardPricer` (`up`/`down`/`range`/`strikeAtProbability`/`forward`) that evaluates every strike locally. The underlying math — a faithful float port of the deployed `pricing::compute_nd2` (SVI with skew correction, signed params, remaining-time roll-down) — is also exported under the `pricing` namespace (`upProbability`, `downProbability`, `rangeProbability`, `probability`, `strikeAtProbability`, `boardPricer`, `rollDown`, `forward`) for callers that already hold their own oracle inputs and want zero chain calls. Agreement with the on-chain price is bounded live to ~1e-7 by `tests/testnet/pricing-parity`.
