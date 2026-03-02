---
'@mysten/dapp-kit-core': patch
---

Fix connected account menu dropdown positioning in Shadow DOM. Removed conflicting `autoPlacement()` middleware and switched to fixed positioning strategy to bypass Shadow DOM `offsetParent` issues.
