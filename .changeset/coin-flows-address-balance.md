---
'@mysten/wallet-sdk': minor
---

Transaction analyzer supports `FundsWithdrawal` inputs, the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`), and sponsored transactions.

New `balanceFlows` rule exposes per-address signed balance deltas — negative = value left the address on net, positive = value arrived. Its result has three views:

- `byAddress: Record<string, CoinFlow[]>` — every address that touched tracked value.
- `sender: CoinFlow[]` — the transaction sender's signed flows (empty if the sender didn't move any tracked value).
- `sponsor: CoinFlow[] | null` — the gas payer's signed flows when `gasData.owner` differs from `data.sender`; `null` when the tx isn't sponsored.

Also new:

- `coinReservations` — synthetic coin reservation refs in gas payment are exposed here as `{ owner, coinType, balance, ref }[]` instead of being synthesized into `gasCoins`.

The existing `coinFlows` rule is now deprecated — it returns sender-only outflows with the pre-PR sign convention (positive = spent). Migrate to `balanceFlows.sender` for signed flows, or iterate `balanceFlows.byAddress[senderAddress]`.

When `gasData.payment` is empty the budget is attributed to the sender (rather than relying on `gasData.owner`, which may not be meaningful yet for an unresolved transaction).
