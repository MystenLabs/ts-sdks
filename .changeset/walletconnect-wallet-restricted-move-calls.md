---
'@mysten/walletconnect-wallet': patch
---

Serialize and build with `restrictedMoveCalls: []` for both `signTransaction` and `signAndExecuteTransaction`, since
the bytes go to the remote wallet to approve, so the adapter doesn't refuse calls on the wallet's behalf.
