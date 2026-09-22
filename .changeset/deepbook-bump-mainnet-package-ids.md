---
'@mysten/deepbook-v3': patch
---

Bump the mainnet Predict and Sessions package ids to their latest published-at:

- Predict: `0x89aea622…bbba` → `0x1cacb9bf963b1b62139d0ad94cc8ce0d9e5792011932df9925ce07aa3c70a837`
- Sessions: `0x9a068bef…5e2a` → `0xec678aee98cd161bdce62ff3dcf4893574df29d927dc8b573f6b4563ec960a1a`

`predictV1` and `sessionsPackageIdV1` keep the original ids, since the type tags built from
them (`coinTypes.plp`, Predict event types, the `DataKey<…::sessions::SessionsApp>` dynamic
field) stay with the package their types were published under.
