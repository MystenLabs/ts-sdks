# @mysten/wallet-sdk

## 0.2.0

### Minor Changes

- 1ec49c4: Add an `excludeGasBudget` option to the `balanceFlows` analyzer. When true, the gas
  budget is not charged against the gas payer's per-address deltas — useful for UIs that display gas
  fees separately from value flows. The gas coin itself is still tracked, so splits / merges on
  `tx.gas` account correctly; only the budget deduction is suppressed.

  ```ts
  await analyze(
  	{ balanceFlows },
  	{ transaction, client, balanceFlows: { excludeGasBudget: true } },
  );
  ```

  Also exports `BalanceFlowsResult` and `BalanceFlowsAnalyzerOptions` from `@mysten/wallet-sdk`.

- a391d8d: Transaction analyzer supports `FundsWithdrawal` inputs, the `0x2::coin` / `0x2::balance`
  framework functions (`redeem_funds`, `send_funds`, `into_balance`, `from_balance`, `split`,
  `take`, `withdraw_all`, `join`, `put`, `zero`), and sponsored transactions.

  New `balanceFlows` rule exposes per-address signed balance deltas — negative = value left the
  address on net, positive = value arrived. Its result has three views:
  - `byAddress: Record<string, CoinFlow[]>` — every address that touched tracked value.
  - `sender: CoinFlow[]` — the transaction sender's signed flows (empty if the sender didn't move
    any tracked value).
  - `sponsor: CoinFlow[] | null` — the gas payer's signed flows when `gasData.owner` differs from
    `data.sender`; `null` when the tx isn't sponsored.

  Coin reservation refs are surfaced as synthetic entries in the `objects` / `coins` / `gasCoins`
  analyzers with `isCoinReservation: true` on the resulting `AnalyzedObject` and balance decoded
  from the digest. Gas-payment reservations (always `Coin<SUI>`) are synthesized locally.
  Reservation refs that appear as regular `Object` inputs — the backwards-compatible shape produced
  by old SDKs via `listCoins` — are resolved by unmasking the object ID (XOR with the chain
  identifier) and batching the accumulator-field lookup into the same `getObjects` request; the coin
  type is parsed from the accumulator field's struct tag.

  The existing `coinFlows` rule is now deprecated — it returns sender-only outflows with the pre-PR
  sign convention (positive = spent). Migrate to `balanceFlows.sender` for signed flows, or iterate
  `balanceFlows.byAddress[senderAddress]`.

  When `gasData.payment` is empty the gas budget is attributed to the gas payer's address balance
  (this is the shape transactions take when gas is paid from an address balance rather than coin
  objects). `tx.gas` itself is unusable in that mode; the analyzer flags any draw from it as an
  over-split against a zero-balance coin.

## 0.1.1

### Patch Changes

- 99d1e00: Add default export condition
- Updated dependencies [99d1e00]
  - @mysten/wallet-standard@0.20.1
  - @mysten/bcs@2.0.2

## 0.1.0

### Minor Changes

- e00788c: Update to @mysten/sui@2.0
- e00788c: Update to use SuiJsonRpcClient instead of SuiClient

  Updated all type signatures, internal usages, examples, and documentation to use
  `SuiJsonRpcClient` from `@mysten/sui/jsonRpc` instead of the deprecated `SuiClient` from
  `@mysten/sui/client`.

### Patch Changes

- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
  - @mysten/wallet-standard@0.20.0
  - @mysten/bcs@2.0.0

## 0.0.8

### Patch Changes

- Updated dependencies [29e8b92]
  - @mysten/sui@1.45.2
  - @mysten/wallet-standard@0.19.9

## 0.0.7

### Patch Changes

- e3811f1: update valibot
- Updated dependencies [e3811f1]
  - @mysten/sui@1.45.1
  - @mysten/wallet-standard@0.19.8

## 0.0.6

### Patch Changes

- a71f824: fix coin calculation in AutoApprovalManager.applyTransactionEffects

## 0.0.5

### Patch Changes

- Updated dependencies [88bdbac]
  - @mysten/sui@1.45.0
  - @mysten/wallet-standard@0.19.7

## 0.0.4

### Patch Changes

- Updated dependencies [44d9b4f]
  - @mysten/sui@1.44.0
  - @mysten/wallet-standard@0.19.6

## 0.0.3

### Patch Changes

- Updated dependencies [89fa2dc]
  - @mysten/bcs@1.9.2
  - @mysten/sui@1.43.2
  - @mysten/wallet-standard@0.19.5

## 0.0.2

### Patch Changes

- Updated dependencies [a37829f]
  - @mysten/bcs@1.9.1
  - @mysten/sui@1.43.1
  - @mysten/wallet-standard@0.19.4

## 0.0.1

### Patch Changes

- Updated dependencies [f3b19a7]
- Updated dependencies [f3b19a7]
- Updated dependencies [bf9f85c]
  - @mysten/sui@1.43.0
  - @mysten/bcs@1.9.0
  - @mysten/wallet-standard@0.19.3
