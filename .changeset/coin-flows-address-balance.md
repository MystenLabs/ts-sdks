---
'@mysten/wallet-sdk': minor
---

Transaction analyzer `coinFlows` rule now tracks flows per address under the hood. The existing `coinFlows` rule remains sender-scoped and its shape is a superset of the prior result: `{ outflows: CoinFlow[]; inflows: CoinFlow[] }` — consumers reading `coinFlows.outflows` keep working, and `coinFlows.inflows` is newly available.

New companion rules:

- `addressCoinFlows` — full per-address view: `{ byAddress: Record<string, { outflows, inflows }> }`. Use this when you care about a specific recipient or multiple parties.
- `sponsorFlows` — convenience alias for the sponsor (gas payer) when `gasData.owner` differs from `data.sender`.
- `coinReservations` — synthetic coin reservation refs (previously synthesized into `gasCoins`) are now exposed here: `{ owner, coinType, balance, ref }[]`. `gasCoins` returns only real on-chain coins.

The analyzer handles `FundsWithdrawal` inputs and the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`). Each tracked value is tagged with the address that owns it and movement events are charged / credited per address, so sponsor-paid gas and sponsor-redeemed value flowing to/from sender end up in the correct buckets rather than offsetting each other.

Object coin inputs are tagged with the coin's real `ownerAddress`; non-sender-owned inputs (unusual) no longer contribute to sender outflow. Empty entries (amount = 0) are filtered out of the result.
