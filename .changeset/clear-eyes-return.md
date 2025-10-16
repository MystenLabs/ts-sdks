---
'@mysten/payment-kit': patch
---

- `getRegistryIdFromName` is now an exposed method on `PaymentKitClient`
- `registryName` is now an optional parameter if `registryId` is not provided. If `registryName` is `undefined` than the default registry name is used.
