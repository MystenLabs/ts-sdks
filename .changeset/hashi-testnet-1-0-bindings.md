---
'@mysten/hashi': patch
---

Regenerate the Hashi Move bindings from hashi's `testnet-1.0` tag and point the testnet defaults at
the package published from it. The earlier bindings could not decode that package's `Hashi` object,
so every read failed with `HashiFetchError`. Withdrawal status is now derived from the request and
its `WithdrawalTransaction`, because the chain no longer stores a status field; the values
`view.withdrawalStatus` and `view.transactionHistory` report are unchanged. `call.deposit`'s `utxo`
and `call.requestWithdrawal`'s `btc` are now typed as `TransactionArgument`: both are Move values
that must come from an earlier command in the same transaction, so an object ID string was never
valid.
