---
'@mysten/window-wallet-core': minor
'@mysten/slush-wallet': patch
---

Preserve per-account signing features in web wallet sessions. Slush now honors an explicit empty or restricted feature list, while older sessions without the field retain their existing capabilities.
