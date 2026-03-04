---
'@mysten/dapp-kit-core': patch
---

Clear persisted wallet session on explicit disconnect to prevent auto-reconnect after page refresh. Wallet removal (HMR, React strict mode) is unaffected.
