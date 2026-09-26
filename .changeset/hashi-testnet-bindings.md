---
'@mysten/hashi': patch
---

Regenerate the Hashi Move bindings from hashi's `testnet` branch, which matches the deployed testnet
package. `call.deposit`'s `utxo` and `call.requestWithdrawal`'s `btc` are now typed as
`TransactionArgument`: both are Move values that must come from an earlier command in the same
transaction, so an object ID string was never valid.
