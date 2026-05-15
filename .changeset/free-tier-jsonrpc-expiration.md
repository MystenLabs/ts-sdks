---
'@mysten/sui': patch
---

Always pass a `ValidDuring` expiration as a simulate-only override when the
resolver has to compute a gas budget and the caller hasn't set an expiration.
The simulate inside `setGasBudget` runs with `payment: []`, and the validator's
replay-protection check rejects payment-less transactions that lack both a
`ValidDuring` expiration and an address-owned input. Previously this affected
gasless / free-tier PTBs over JSON-RPC ("Transactions must either have
address-owned inputs, or a ValidDuring expiration with at most two epochs of
validity"); it also affects any PTB whose only inputs are shared objects,
pure args, or balance withdrawals. The override is scoped to the simulate
request — the final transaction's expiration is unchanged.
