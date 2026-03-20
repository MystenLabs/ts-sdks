---
'@mysten/sui': patch
---

Add `pollInterval` option to `waitForTransaction` with exponential backoff (starts at 200ms, caps at 2s)
