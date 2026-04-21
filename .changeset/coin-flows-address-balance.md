---
'@mysten/wallet-sdk': minor
---

Transaction analyzer supports `FundsWithdrawal` inputs, the `0x2::coin` / `0x2::balance` framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`, `take`, `withdraw_all`, `join`, `put`, `zero`), and sponsored transactions.

New `balanceFlows` rule exposes per-address signed balance deltas — negative = value left the address on net, positive = value arrived. Its result has three views:

- `byAddress: Record<string, CoinFlow[]>` — every address that touched tracked value.
- `sender: CoinFlow[]` — the transaction sender's signed flows (empty if the sender didn't move any tracked value).
- `sponsor: CoinFlow[] | null` — the gas payer's signed flows when `gasData.owner` differs from `data.sender`; `null` when the tx isn't sponsored.

Coin reservation refs are surfaced as synthetic entries in the `objects` / `coins` / `gasCoins` analyzers with `isCoinReservation: true` on the resulting `AnalyzedObject` and balance decoded from the digest. Gas-payment reservations (always `Coin<SUI>`) are synthesized locally. Reservation refs that appear as regular `Object` inputs — the backwards-compatible shape produced by old SDKs via `listCoins` — are resolved by unmasking the object ID (XOR with chain identifier) and batching the accumulator-field lookup into the same `getObjects` request; the coin type is parsed from the accumulator field's struct tag.

New `@mysten/sui/utils` exports to support this: `xorCoinReservationObjectId` and `parseAccumulatorFieldCoinType`.

The existing `coinFlows` rule is now deprecated — it returns sender-only outflows with the pre-PR sign convention (positive = spent). Migrate to `balanceFlows.sender` for signed flows, or iterate `balanceFlows.byAddress[senderAddress]`.

When `gasData.payment` is empty the gas budget is attributed to the gas payer's address balance (this is the shape transactions take when gas is paid from an address balance rather than coin objects).
