---
'@mysten/pas': minor
'@mysten/suins': minor
'@mysten/walrus': patch
'@mysten/kiosk': patch
'@mysten/payment-kit': patch
'@mysten/deepbook-v3': patch
---

Regenerate generated Move types against the latest contract sources. The generated
`utils/index.ts` `GetOptions` / `GetManyOptions` are now exported as type aliases (intersection)
instead of interfaces. SuiNS gains `SubnamePrunedEvent`, `pruneExpiredSubname`, and
`pruneExpiredSubnames`.
