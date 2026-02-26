---
'@mysten/enoki': patch
---

Fix deadlock in enoki wallet connect by replacing `allTasks()` with direct hydration awaiting, and make zkLogin state hydration lazy but safely awaitable via `ensureHydrated()`.
