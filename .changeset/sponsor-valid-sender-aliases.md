---
'@mysten-incubation/sponsor': minor
---

`validSender()` no longer reads the gas owner's address alias set; it rejects an unset sender and a
sender equal to the gas owner.
