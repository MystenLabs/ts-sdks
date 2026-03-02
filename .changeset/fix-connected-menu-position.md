---
'@mysten/dapp-kit-core': patch
---

Fix connected account menu dropdown positioning in Shadow DOM. Removed conflicting `autoPlacement()` middleware and added `composed-offset-position` ponyfill so floating-ui correctly resolves `offsetParent` across shadow boundaries.
