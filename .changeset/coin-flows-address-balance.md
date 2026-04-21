---
'@mysten/wallet-sdk': minor
---

Transaction analyzer supports `FundsWithdrawal` inputs, the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`), and sponsored transactions.

The `coinFlows` result shape is unchanged (`{ outflows: CoinFlow[] }`) and still sender-scoped. Its numbers now reflect net outflows per coin type: if the sender both sent and received the same coin type in one transaction (e.g. via a sponsor-funded `redeem_funds` transferred back), the net is reported. Entries where the sender gained on net are included with a negative `amount`; callers that only care about spending should skip non-positive entries.

New companion rules:

- `balanceFlows` (new file `balance-flows.ts`) — per-address signed deltas: `{ byAddress: Record<string, CoinFlow[]> }` where `amount < 0` means the address lost value and `amount > 0` means it received. Use this to see third-party recipients or the sponsor in addition to the sender.
- `sponsorFlows` — sponsor-scoped view with the same shape as `coinFlows`.
- `coinReservations` — synthetic coin reservation refs in gas payment are now exposed here as `{ owner, coinType, balance, ref }[]`. `gasCoins` returns only real on-chain coins.

When `gasData.payment` is empty the budget is attributed to the sender (rather than relying on `gasData.owner`, which may not be meaningful yet for an unresolved transaction).
