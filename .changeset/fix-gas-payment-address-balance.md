---
'@mysten/sui': patch
---

Fix gas payment resolution for transactions that use `tx.gas` with address balance. When a transaction uses `Argument::GasCoin` (e.g. `tx.splitCoins(tx.gas, [...])`) and the sender's SUI is held as address balance, the SDK now constructs a coin reservation reference and includes it in the gas payment so the validator can draw gas from address balance. This fixes "No valid gas coins found" errors for accounts whose SUI is entirely in address balance.
