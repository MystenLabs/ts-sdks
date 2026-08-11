---
'@mysten/hashi': patch
---

Fix `view.withdrawalFees()` reporting an absurd `worstCaseNetworkFeeSats` when governance raises
`bitcoin_withdrawal_minimum` as a policy throttle. The value mirrors the on-chain per-user fee
budget (`bitcoin_withdrawal_minimum - 546`), so a temporary 10 BTC minimum turned the "worst-case
network fee" into ~10 BTC — UIs subtracting it from a 10.84 BTC withdrawal displayed "~0.84 BTC"
as the estimated payout. The fee-estimation API now caps the reported bound at 100,000 sats, a
ceiling derived from validator consensus limits (5x the fleet's 30 sat/vB feerate clamp on a
generous per-request weight share), so it stays safe to subtract for net-of-fee display. The raw
protocol budget is still available unchanged via `view.all().worstCaseNetworkFee`, now documented
as a budget rather than a fee expectation.
