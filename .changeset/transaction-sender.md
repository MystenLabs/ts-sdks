---
'@mysten/sui': minor
---

Add `sender` to `SuiClientTypes.Transaction` on every client, without needing `include.transaction`. System transactions report `0x0`.
