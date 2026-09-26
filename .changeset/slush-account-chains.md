---
'@mysten/window-wallet-core': minor
'@mysten/slush-wallet': minor
---

Preserve optional per-account chains in hosted wallet sessions and advertise only supported chains included in that list. Reject signing requests for chains excluded by the signed session. Older sessions that omit chains retain their existing behavior.
