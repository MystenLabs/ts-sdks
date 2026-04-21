# @mysten/wallet-sdk

## 0.3.0

### Minor Changes

- bf0843b: Improve issue handling on `analyze()`:
  - Each analyzer result now carries an additional `ownIssues` field — the issues this analyzer's
    own `analyze()` emitted, excluding anything inherited from failing dependencies. The existing
    `issues` field is unchanged (own + inherited).
  - The `analyze()` return object now exposes a top-level `issues` array — the concatenation of
    every analyzer's `ownIssues` across the whole run (including transitive deps). Each analyzer
    runs once (memoized by cacheKey), so each issue appears exactly once without needing to dedup.
  - New `AnalyzerOutput<T>` type exported from `@mysten/wallet-sdk`, returned by individual analyzer
    `analyze()` callbacks (the old union shape). `AnalyzerResult<T>` is what `analyze()` produces
    per analyzer, with the new `ownIssues` field added to the failure branch.

  ```ts
  const r = await analyze({ balanceFlows, coinFlows }, { ... });

  r.balanceFlows.result      // unchanged
  r.balanceFlows.issues      // unchanged (own + inherited)
  r.balanceFlows.ownIssues   // NEW — only what balanceFlows emitted
  r.issues                   // NEW — every issue, each appearing exactly once
  ```

- 10564cf: Add a `moveCallHandlers` option to the `balanceFlows` analyzer for teaching it about
  protocol-specific Move calls without hard-coding package addresses into the core rule. Each entry
  is a factory invoked once per `analyze()` run so handlers can hold per-PTB state in a closure; the
  returned handler participates in the same tracking model as the built-in `0x2::coin` /
  `0x2::balance` framework handler — it can look up tracked balances for command arguments, emit
  per-address deltas, and register tracked results at result slots — but it fires only for MoveCalls
  the built-in handler doesn't recognize.

  ```ts
  import { analyze, balanceFlows, createPASMoveCallHandler } from '@mysten/wallet-sdk';

  await analyze(
  	{ balanceFlows },
  	{
  		transaction,
  		client,
  		balanceFlows: {
  			moveCallHandlers: [createPASMoveCallHandler({ packageId, namespaceId })],
  		},
  	},
  );
  ```

  New exports:
  - `BalanceFlowsMoveCallHandler`, `BalanceFlowsMoveCallHandlerContext`,
    `BalanceFlowsMoveCallHandlerFactory` — the handler signature, the context passed to it (exposes
    `getTrackedBalance`, `keyFor`, `outputKey`, `trackCoinResult`, `trackBalanceResult`,
    `recordFlow`, and `addIssue`), and the factory type the `moveCallHandlers` option accepts.
  - `TrackedBalance` — exported as a type so handlers can annotate values returned by
    `getTrackedBalance`; handlers don't construct them directly.
  - `AnalyzedMoveCallCommand` — hoisted from the `AnalyzedCommand` union so handlers can type their
    first argument.
  - `createPASMoveCallHandler({ packageId, namespaceId })` — **experimental** — a handler factory
    for the Permissioned Assets Standard. PAS is still evolving, so expect the supported Move
    signatures and the resulting delta shape to change alongside the standard. Handles
    `account::deposit_balance`, `account::send_balance`, `account::unlock_balance`,
    `account::clawback_balance`, `account::unsafe_send_balance`, `account::create`, and the
    `unlock_funds::resolve` / `unlock_funds::resolve_unrestricted_balance` /
    `clawback_funds::resolve` / `send_funds::resolve_balance` resolvers. Deltas are keyed on each
    PAS account's on-chain address (the shared Account object's id for existing accounts, or the
    `(namespace, owner)`-derived address for accounts created earlier in the same PTB via
    `account::create`) so they match the actual accumulator mutations on chain. The credit for
    `send_balance` / `unsafe_send_balance` is emitted when `send_funds::resolve_balance` runs,
    matching where the on-chain `balance::send_funds` call lives. Hot-potato state (pending sends,
    unlocked/clawed-back balances waiting on a resolver) lives in the handler's closure — the
    generic consume loop never sees these intermediate results, so template MoveCalls that take a
    `&mut Request<...>` between a send and its resolver don't wipe the pending credit. Dynamic `u64`
    amounts (Result args instead of Pure) are flagged as analysis issues rather than guessed — PAS
    withdrawals source from an account address with no tracked starting balance, so there is no safe
    worst-case default and the caller needs to decide how to surface the uncertainty.

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
