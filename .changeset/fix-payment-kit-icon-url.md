---
'@mysten/payment-kit': patch
---

Fix `parsePaymentTransactionUri` to read `iconUrl` parameter correctly. The `createPaymentTransactionUri` function writes the key as `iconUrl`, but `parsePaymentTransactionUri` was reading it as `icon`, causing the icon URL to be lost during URI round-trips.
