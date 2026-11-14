---
'@mysten/walletconnect-wallet': patch
---

Build with `restrictedMoveCalls: []` when reporting the bytes of a transaction the remote wallet signs
and executes, so the adapter doesn't refuse calls that the wallet is asked to approve.
