---
'@mysten/dapp-kit-core': patch
---

Fix crash when a connected wallet is unregistered and re-registered (e.g. during HMR). The `$connection` store now gracefully returns a disconnected state instead of throwing, and storage is preserved on disconnect so autoconnect can reconnect after re-registration.
