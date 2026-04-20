---
'@mysten/wallet-sdk': minor
---

Transaction analyzer `coinFlows` rule now tracks outflows per party. The rule tags each tracked value with its `origin` (`Sender`, `Sponsor`, or `Foreign`), propagates that origin through splits / joins / conversions, and emits outflow events only when value actually leaves its originating party. The result shape is now `{ outflows: { sender: CoinFlow[]; sponsor: CoinFlow[] } }` instead of a single flat `CoinFlow[]`. Consumers that previously iterated `coinFlows.outflows` should read `coinFlows.outflows.sender` (the auto-approvals budget manager has already been updated).

The rule also handles `FundsWithdrawal` inputs and the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`). Sponsor-withdrawn value returned to the sender is no longer incorrectly credited against the sender's outflow — it is now simply tracked as sponsor outflow to sender. Sponsor-paid gas is attributed to the sponsor's SUI outflow when `gasData.owner` differs from the sender.

Empty outflows (amount = 0) are filtered out of the result; previously some scenarios produced explicit zero entries.
