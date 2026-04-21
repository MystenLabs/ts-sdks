---
'@mysten/wallet-sdk': minor
---

Transaction analyzer `coinFlows` rule now supports `FundsWithdrawal` inputs, the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`), and sponsored transactions.

The `coinFlows` result shape is unchanged (`{ outflows: CoinFlow[] }` with positive amounts) but the numbers reflect net outflows per coin type: if the sender both sends value out and receives value back (e.g. via a sponsor-funded `redeem_funds` transferred to them) in the same transaction, the net is reported. A coin type with a non-positive net is omitted. This fixes a prior bug where non-SUI value returned to the sender was mis-attributed to SUI via the gas coin.

Each tracked coin now carries its real `ownerAddress` instead of a boolean `owned` flag, allowing per-address accounting for multi-party transactions.

New companion rules:

- `addressCoinFlows` — full per-address view: `{ byAddress: Record<string, CoinFlow[]> }` with signed amounts (negative = net outflow, positive = net inflow). Use this when you care about third-party recipients or want to see both directions.
- `sponsorFlows` — convenience alias for the sponsor (gas payer) when `gasData.owner` differs from `data.sender`. Same shape as `coinFlows`.
- `coinReservations` — synthetic coin reservation refs in gas payment are now exposed here as `{ owner, coinType, balance, ref }[]` instead of being synthesized into `gasCoins`. `gasCoins` returns only real on-chain coins.
