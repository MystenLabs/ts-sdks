---
'@mysten/walletconnect-wallet': patch
---

Fix a race where a silent reconnect attempted before the WalletConnect connector finished initializing threw `Cannot read properties of undefined (reading 'map')` and could start a new connection instead of restoring the saved session. The wallet now retains its initialization promise and awaits it in `connect`, a silent reconnect with no existing Sui session returns no accounts without opening a new connection, and an account lookup that returns nothing resolves to an empty account list instead of throwing.
