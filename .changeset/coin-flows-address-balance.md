---
'@mysten/wallet-sdk': minor
---

**BREAKING:** Transaction analyzer `coinFlows` result shape changed from a flat `CoinFlow[]` to `{ sender: CoinFlow[]; sponsor: CoinFlow[] }`. Consumers that previously iterated `coinFlows.outflows` should read `coinFlows.outflows.sender` (the auto-approvals budget manager has been updated). Empty outflows (amount = 0) are now filtered out of the result; previously some scenarios produced explicit zero entries.

Each tracked value is now tagged with its `origin` (`Sender`, `Sponsor`, or `Foreign`), which propagates through splits / joins / conversions. Outflow events fire only when value actually leaves its originating party. Sponsor-paid gas (`gasData.owner` differs from sender) is now attributed to sponsor SUI outflow instead of silently folded into sender's outflow, and sponsor-withdrawn value returned to the sender no longer offsets the sender's outflow.

The rule also handles `FundsWithdrawal` inputs and the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`). Object inputs are tagged `Sender` only when the input's `ownerAddress` matches `data.sender`; non-sender coin inputs (unusual) no longer contribute to sender outflow.
