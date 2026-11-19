---
'@mysten/walletconnect-wallet': minor
---

Send transactions to WalletConnect wallets as base64-encoded BCS bytes, as required by the WalletConnect Sui RPC spec, instead of the SDK's JSON format. Wallets that only accepted the previous non-spec JSON payload will no longer be able to sign transactions from this package.
