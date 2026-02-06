---
'@mysten/sui': patch
---

Add `isPreparedForSerialization` method to Transaction class for checking if a transaction is ready for JSON serialization. Update `Transaction.from` to validate that transactions are prepared before copying and automatically register the CoinWithBalance intent resolver when needed.
