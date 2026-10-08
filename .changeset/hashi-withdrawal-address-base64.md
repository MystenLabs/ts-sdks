---
'@mysten/hashi': patch
---

Fix `view.withdrawalStatus` returning an empty `bitcoinAddress` on gRPC and GraphQL clients. Those
transports render the `WithdrawalRequested` event's `bitcoin_address` as a base64 string, which was
read as a number array; both encodings are now decoded.
