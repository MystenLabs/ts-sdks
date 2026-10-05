---
'@mysten/walletconnect-wallet': patch
---

Wait for WalletConnect initialization, including retries, before connecting to prevent automatic reconnection from throwing. Silent reconnection without an existing Sui session now returns no accounts without starting a new connection, and empty account lookup results are handled safely.
