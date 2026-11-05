---
'@mysten-incubation/sponsor': minor
---

`validSender()` now also rejects a sender in the gas owner's on-chain address alias set (`SENDER_IS_SPONSOR`). It loads the alias object through `client`, and a failed load surfaces as `ANALYSIS_FAILED`.
