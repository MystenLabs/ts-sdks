---
'@mysten/dapp-kit-core': patch
---

Gracefully handle non-compliant wallet extensions (e.g. Bybit Wallet) that provide undefined values for required Wallet Standard fields like `accounts`, preventing an uncaught TypeError from crashing the app.
