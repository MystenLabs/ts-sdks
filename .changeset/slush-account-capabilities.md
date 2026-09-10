---
'@mysten/window-wallet-core': minor
'@mysten/slush-wallet': patch
---

Preserve per-account signing features in web wallet sessions. Slush now honors an explicit empty or restricted feature list, while older sessions without the field retain their existing capabilities.

Enforce signed account capabilities during wallet-side request verification, advertise only implemented features, and refresh account capabilities when another tab replaces the hosted session.
