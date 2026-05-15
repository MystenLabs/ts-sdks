---
'@mysten/sui': patch
---

Set a `ValidDuring` expiration before simulating gasless transactions so the
resolver works over JSON-RPC. Previously, calling `tx.setGasPrice(0)` on a PTB
with no address-owned inputs would fail at the `setGasBudget` dryRun with
"Transactions must either have address-owned inputs, or a ValidDuring
expiration with at most two epochs of validity". The gRPC server fills in the
expiration on its own (sui#26576) but JSON-RPC's dryRun does not, so the SDK
now sets it client-side whenever `gasData.price === 0`.
