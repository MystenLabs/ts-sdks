---
'@mysten/wallet-sdk': minor
---

The `transactionResponse` analyzer now dry-runs with `include: { effects: true }`, so its result
carries the simulated `effects` (including execution status). This lets consumers tell whether a
transaction would succeed without a second simulation.
