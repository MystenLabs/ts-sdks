---
'@mysten/wallet-sdk': minor
---

**BREAKING:** The transaction analyzer's `coinFlows` result shape changed from `{ outflows: CoinFlow[] }` to `{ outflows: CoinFlow[]; inflows: CoinFlow[] }`, and reported amounts are now **net** balance deltas rather than gross outflows. `outflows` lists value that left the address net of what it received back; `inflows` lists value that arrived net of what it started by giving up. An address has either an outflow or an inflow per coin type, never both. Deep-equality checks against the old shape will break; `.outflows` reads still work but the amounts may differ when an address both sent and received the same coin type in the same transaction.

The analyzer tracks a single signed delta per `(address, coinType)`:

- A coin entering tracking (input Object, gas coin, reservation, `redeem_funds`) deducts its balance from its owner.
- A transfer or `send_funds` to a destination credits the destination's delta.
- Tracked coins still alive at the end of the PTB implicitly credit their owner — modeling the Move semantics where an input Object stays at its owner's address with the PTB's balance changes applied.
- The gas budget is taken off the gas coin's tracked balance without crediting anyone, so the gas owner's SUI delta is `-budget` in the simple case.

Conservation holds: for each coin type, the sum of all addresses' deltas is zero (every transfer has an origin deduction and destination credit), modulo coins consumed to an unknown destination which leave a net negative on the origin with no matching credit.

New companion rules:

- `addressCoinFlows` — full per-address view: `{ byAddress: Record<string, { outflows, inflows }> }`. Use this when you care about specific recipients or multiple parties.
- `sponsorFlows` — convenience alias for the sponsor (gas payer) when `gasData.owner` differs from `data.sender`.
- `coinReservations` — synthetic coin reservation refs (previously synthesized into `gasCoins`) now live here: `{ owner, coinType, balance, ref }[]`. `gasCoins` returns only real on-chain coins.

The analyzer handles `FundsWithdrawal` inputs and the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`).
