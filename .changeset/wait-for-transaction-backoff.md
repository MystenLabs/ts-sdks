---
'@mysten/sui': patch
---

Improve `waitForTransaction` polling with schedule-based timing tuned to actual indexing latency. Default schedule polls at 0, 300, 600, 1500, 3500ms then every 2s. Add `pollSchedule` option for custom absolute-time schedules.
