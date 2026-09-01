# @mysten/hashi

## 0.6.12

## 0.6.11

## 0.6.10

## 0.6.9

### Patch Changes

- f2f7048: Upgrade workspace dependencies, remove the legacy dapp-kit package, and migrate the
  remaining consumers to the current gRPC-based dapp-kit. Remove the legacy API reference while
  retaining the migration guide and deprecation notice.

## 0.6.8

### Patch Changes

- c8d3046: Detect missing objects via the transport-neutral `ObjectError.reason` (`'notFound'`)
  introduced in `@mysten/sui`, restoring `findUsedUtxos`, deposit status, and withdrawal status
  behavior on the gRPC transport. The legacy JSON-RPC code and gRPC message checks remain as
  fallbacks for older `@mysten/sui` versions.

## 0.6.7

## 0.6.6

### Patch Changes

- 19e85a3: Regenerate contract bindings with the latest codegen utils template

## 0.6.5

### Patch Changes

- 4cee531: Fix `view.withdrawalFees()` reporting an absurd `worstCaseNetworkFeeSats` when governance
  raises `bitcoin_withdrawal_minimum` as a policy throttle. The value mirrors the on-chain per-user
  fee budget (`bitcoin_withdrawal_minimum - 546`), so a temporary 10 BTC minimum turned the
  "worst-case network fee" into ~10 BTC — UIs subtracting it from a 10.84 BTC withdrawal displayed
  "~0.84 BTC" as the estimated payout. The fee-estimation API now caps the reported bound at 100,000
  sats, a ceiling derived from validator consensus limits (5x the fleet's 30 sat/vB feerate clamp on
  a generous per-request weight share), so it stays safe to subtract for net-of-fee display. The raw
  protocol budget is still available unchanged via `view.all().worstCaseNetworkFee`, now documented
  as a budget rather than a fee expectation.

## 0.6.4

## 0.6.3

## 0.6.2

### Patch Changes

- ce4b2f2: Point default GraphQL URLs at the dedicated graphql.<network>.sui.io hosts. The
  fullnode-served /graphql endpoints are being retired — testnet already returns 404, which silently
  emptied the pending-request portion of `view.transactionHistory`. That failure now also logs a
  console warning instead of being swallowed. (Re-lands the fix from hashi-ts-sdk#46, which the
  monorepo migration predated.)

## 0.6.1

## 0.6.0

### Minor Changes

- d8f238e: Migrate the Hashi SDK into the ts-sdks monorepo and rename `@mysten-incubation/hashi` to
  `@mysten/hashi`. The `@mysten/sui` peer dependency now tracks the monorepo's current release line.
- d8f238e: **Breaking:** `hashi()` no longer accepts a `network` option — it's now derived from the
  Sui client being extended (`hashi()` instead of `hashi({ network: "testnet" })`), and throws if
  that client's network has no `NETWORK_CONFIG` entry and no custom `hashiObjectId`/`packageId` were
  provided.

## 0.5.0

### Minor Changes

- ff9a398: Wire up Sui testnet: add the testnet Hashi object and package ids to `NETWORK_CONFIG`
  (BTC signet), so `hashi({ network: "testnet" })` works out of the box

### Patch Changes

- ff9a398: Bump hashi submodule to cd2b81f (no contract or binding changes)

## 0.4.0

### Minor Changes

- 874ec08: feat: add a `client.hashi.guardian.*` namespace (`info`, `limiterStatus`, `canWithdraw`)
  that reads the guardian's rate-limiter headroom from its read-only `/info` endpoint, resolving the
  guardian URL from `guardianUrl`, a `guardianInfoProvider`, or the on-chain `guardian_url` config

### Patch Changes

- 8f7606f: Track the redeployed devnet contracts: regenerate bindings against hashi's `testnet` tip
  (`0e67b619`) (`config_value::Value` gained `U128`/`U256`, shifting the BCS tags the SDK decodes
  the on-chain config with), follow the `DepositRequested`/`WithdrawalRequested` event renames and
  request-object field renames, and point `NETWORK_CONFIG.devnet` at the new package and Hashi
  object.

## 0.3.1

### Patch Changes

- 0af8dfa: Derive Bitcoin deposit addresses with Hashi's delayed MPC recovery taproot leaf.

## 0.3.0

### Minor Changes

- ced85d2: Derive deposit addresses as 2-of-2 (guardian, MPC-child) taproot to match the on-chain
  bridge (hashi#609). `generateDepositAddress` (pure helper) now takes a named-args object including
  `guardianBtcXOnly`; `HashiClient.generateDepositAddress` reads the guardian key from on-chain and
  fails fast with `HashiConfigError` when the deployment is not guardian-provisioned.
  `GovernanceConfig` gains `guardianUrl`, `guardianPublicKey`, `guardianBtcPublicKey`. Adds
  `twoOfTwoTaprootScriptPathAddress` as a public primitive and removes the single-key
  `taprootScriptPathAddress` helper, which the bridge no longer accepts.

## 0.2.0

### Minor Changes

- 5f9f592: Surface deposit time delay: add `bitcoinDepositTimeDelayMs` to `GovernanceConfig`,
  `approvalTimestampMs` and `confirmableAtMs` to `DepositInfo`, and `confirmableAtMs` to
  `DepositHistoryItem`

## 0.1.1

### Patch Changes

- 5b3389e: Update README install instructions to use the published npm package
- 72b6efc: Expand README to document the status, balance, history, fee, polling, and Bitcoin RPC
  APIs

## 0.1.0

### Minor Changes

- 75fcdca: Fix btcTxid display values to strip the 0x prefix. Add GraphQL-based discovery of pending
  deposits to transaction history — confirmed requests still read from the on-chain user_requests
  index; in-flight deposits are discovered via DepositRequestedEvent queries and deduplicated. Bump
  GET_OBJECTS_BATCH to 500.

## 0.0.2

### Patch Changes

- 9422708: Add a package-level `README.md` so the npm landing page has a real overview (install, one
  quickstart snippet, link to the repo README for full docs). Also corrects stale `@mysten/hashi`
  references in the root README to the actual published name `@mysten-incubation/hashi`.
