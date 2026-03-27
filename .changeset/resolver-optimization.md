---
'@mysten/sui': minor
---

Optimize transaction resolver to parallelize independent network requests (system state, balance, coins, protocol config) and add coin reservation compat mode for address balance gas payment when `coin_reservation` feature flag is enabled.
