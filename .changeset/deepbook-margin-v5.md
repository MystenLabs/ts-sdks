---
'@mysten/deepbook-v3': minor
---

Align margin SDK with `deepbook_margin` v5 on-chain source:

- Switch `pool_proxy` order placement builders (`placeLimitOrder`, `placeMarketOrder`,
  `placeReduceOnlyLimitOrder`, `placeReduceOnlyMarketOrder`) to the `_v2` Move entries. The v1
  entries are deprecated in the v5 package and abort with `EDeprecatedUseV2`. The v2 variants take
  additional `base_margin_pool`, `quote_margin_pool`, `base_oracle`, and `quote_oracle` arguments so
  the chain can enforce a post-trade `risk_ratio` invariant (borrow-floor for normal orders,
  monotonic improvement for reduce-only).
- Switch `executeConditionalOrders` to `margin_manager::execute_conditional_orders_v2`, which adds
  `base_margin_pool`/`quote_margin_pool` arguments and enforces the same post-fill solvency check.
- Fix `claimRebate` to target the actual Move entry name `pool_proxy::claim_rebates`. The previous
  target did not exist on-chain.
- Add `registerMarginManager` and `unregisterMarginManager` builders.
- Add read-only margin_manager builders exposed in newer source: `balanceManagerId`,
  `getBalanceManagerReferralId`, `accountExists`, `account`, `accountOpenOrders`,
  `getAccountOrderDetails`, `lockedBalance`, `canPlaceLimitOrder`, `canPlaceMarketOrder`.
- Bump mainnet `MARGIN_PACKAGE_ID` to `0x7767428727629a08dfd196bd4fc00d8a060e30da33aa63f4087fb3271e615a98`
  (the current mainnet published-at, v4), updated from the stale v3 ID.
