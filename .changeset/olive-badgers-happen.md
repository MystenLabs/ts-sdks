---
'@mysten/window-wallet-core': patch
---

improve verifyJwtSession

- remove opener origin check as it's not possible to access it
- add extra CryptoKey type to verifyJwtSession secretKey
