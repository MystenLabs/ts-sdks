---
'@mysten/sui': patch
---

Error when mixing SUI CoinWithBalance intents that use the gas coin with ones that set useGasCoin: false in the same transaction, preventing potential double-counting of address balance.
