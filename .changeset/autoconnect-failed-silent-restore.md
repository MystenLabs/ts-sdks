---
'@mysten/dapp-kit-core': patch
---

Fix auto-connect when the saved wallet rejects the silent `standard:connect` call. A failed restore attempt now counts as no saved session, so the connection settles to `disconnected` and the rejection is no longer left unhandled.
