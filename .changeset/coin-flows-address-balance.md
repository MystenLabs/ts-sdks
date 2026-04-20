---
'@mysten/wallet-sdk': minor
---

Transaction analyzer `coinFlows` rule now tracks value through `FundsWithdrawal` inputs and the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`). The `AnalyzedCommandInput` union adds a `Withdrawal` variant that exposes the reservation amount, coin type, and source (`Sender` / `Sponsor`). Sponsor-withdrawn value returned to the sender no longer spuriously offsets the sender's own outflow for that coin type.
