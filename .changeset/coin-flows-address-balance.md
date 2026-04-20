---
'@mysten/wallet-sdk': minor
---

**BREAKING:** The transaction analyzer's `coinFlows` result shape changed from `{ outflows: CoinFlow[] }` to `{ outflows: CoinFlow[]; inflows: CoinFlow[] }`. `outflows` still lists what left the sender; `inflows` is newly available and lists what arrived at the sender. Deep-equality checks against the old shape will break; `.outflows` reads keep working.

Flow accounting now happens per address under the hood. Each tracked coin carries origin *segments* — a list of `{ owner, amount }` pairs that are preserved through splits, joins, and conversions. On any movement event (transfer, `send_funds`, generic MoveCall consume, gas budget, MakeMoveVec) each segment is charged to its own owner and credited to the destination, so mixed-origin coins (e.g. a sender coin that a sponsor balance was merged into, later transferred to a third party) produce correct per-address outflows and inflows — including conservation of value across the transaction.

New companion rules:

- `addressCoinFlows` — full per-address view: `{ byAddress: Record<string, { outflows, inflows }> }`. Use this when you care about a specific recipient or multiple parties.
- `sponsorFlows` — convenience alias for the sponsor (gas payer) when `gasData.owner` differs from `data.sender`.
- `coinReservations` — synthetic coin reservation refs (previously synthesized into `gasCoins`) are now exposed here: `{ owner, coinType, balance, ref }[]`. `gasCoins` returns only real on-chain coins; `coinFlows` consumes both so reservation balances still back the gas coin's outflow accounting.

The analyzer handles `FundsWithdrawal` inputs and the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`).

Note: `inflows[coinType] - outflows[coinType]` is NOT a faithful "net position change" for an address — the analyzer only sees movements visible in the PTB, and a transfer-to-self on a mixed-origin coin reports each non-self origin segment as an inflow without a matching self-outflow. For exact per-address delta, reconcile with the transaction effects' balance changes.
