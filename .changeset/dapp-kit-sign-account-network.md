---
'@mysten/dapp-kit-core': minor
---

Allow `signTransaction`, `signAndExecuteTransaction`, and `signPersonalMessage` to take optional
`account` and `network` overrides.

- `account` (a `UiWalletAccount` belonging to the connected wallet) signs with a specific account
  without changing the globally selected account via `switchAccount`. Throws
  `WalletAccountNotFoundError` if the account does not belong to the connected wallet.
- `network` signs/executes against a specific configured network without changing the active
  network via `switchNetwork`, which is useful for apps that operate on multiple networks (for
  example mainnet and testnet) at once. The chain is derived from the network and the transaction is
  built against that network's client. Throws `ChainNotSupportedError` if the signing account does
  not support the requested network.

Both default to the currently connected account and active network, so existing call sites are
unaffected.
