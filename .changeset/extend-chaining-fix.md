---
'@mysten/sui': patch
---

Fix `$extend` chaining so that `client.$extend(sdk1()).$extend(sdk2())` works correctly. Previously, the second `$extend` call would lose the extensions from the first call.
