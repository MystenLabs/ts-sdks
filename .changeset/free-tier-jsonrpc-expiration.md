---
'@mysten/sui': patch
---

Pass a `ValidDuring` expiration as a simulate-only override when the resolver's
budget computation is about to dryRun a gasless transaction. Previously,
calling `tx.setGasPrice(0)` on a PTB with no address-owned inputs would fail
at the `setGasBudget` dryRun on JSON-RPC with "Transactions must either have
address-owned inputs, or a ValidDuring expiration with at most two epochs of
validity". The gRPC server fills the expiration in on its own (sui#26576) but
JSON-RPC's dryRun does not, so the SDK now provides one client-side. The
override only affects the simulate request — the final transaction's
expiration is unchanged.
