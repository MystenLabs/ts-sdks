---
'@mysten/deepbook-v3': minor
---

Point Predict at the fresh Testnet and Mainnet deployments and pick up the per-leg range fee.

Both networks were redeployed, so every Predict package and object id moved. The deployment records are regenerated from the deploy tooling's own manifests rather than hand-edited.

`pricing::range_price` now returns a `RangePrice` carrying both boundary probabilities instead of a single `u64`, so the chain can charge each leg of a range its own fee and floor. The generated bindings gain `RangePrice` with `lower_up`, `higher_up` and `probability` accessors, `block_scholes_store` gains `recent_spot_at` over a bounded spot-read ring buffer, and `read.price` composes `probability()` onto each `range_price` result. The combined range probability is unchanged (`lower_up.saturating_sub(higher_up)`), so `read.price` returns the same numbers it always did.

Callers using the generated `pricing.rangePrice` binding directly and parsing its return as a `u64` must now read `probability()` (or the individual legs) from the returned struct.
