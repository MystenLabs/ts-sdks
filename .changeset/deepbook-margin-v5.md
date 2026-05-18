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
- The reduce-only v2 entries dropped the `DebtAsset` generic and the explicit
  `MarginPool<DebtAsset>` parameter; the package now dispatches on
  `margin_manager.has_base_debt()` to pick the typed pool from the
  `(base_margin_pool, quote_margin_pool)` pair. The SDK builders no longer take a debt-side margin
  pool or third type argument.
- Switch `executeConditionalOrders` to `margin_manager::execute_conditional_orders_v2`, which adds
  `base_margin_pool`/`quote_margin_pool` arguments and enforces the same post-fill solvency check.
- Fix `claimRebate` to target the actual Move entry name `pool_proxy::claim_rebates`. The previous
  target did not exist on-chain.
- Rename `MarginPoolConfigParams.referralSpread` to `protocolSpread`. The Move field was renamed
  upstream in the `protocol_config` module; the old SDK name was positionally correct but
  misleading.
- Add `registerMarginManager` and `unregisterMarginManager` builders.
- Add read-only margin_manager builders exposed in newer source: `balanceManagerId`,
  `getBalanceManagerReferralId`, `accountExists`, `account`, `accountOpenOrders`,
  `getAccountOrderDetails`, `lockedBalance`, `canPlaceLimitOrder`, `canPlaceMarketOrder`.
- Add `MarginAdminContract.setPriceTolerance`, `setMaxPriceAge`, and `setMaxOrderTtl` builders for
  the per-pool oracle and order-TTL admin entries on `margin_registry`. The `setMaxOrderTtl` entry
  configures the per-pool `max_order_ttl_ms` cap that `pool_proxy::place_limit_order_v2` and
  `place_reduce_only_limit_order_v2` use to clamp `expire_timestamp`.
- Add `DeepBookAdminContract.mintCorePauseCap`, `revokeCorePauseCap`,
  `disableVersionWithCorePauseCap`, and `corePauseCaps` builders for the new `DeepbookCorePauseCap`
  emergency-pause flow in the core spot `registry`. These mirror the existing margin-side pause-cap
  builders.
- Bump mainnet `MARGIN_PACKAGE_ID` to `0x7767428727629a08dfd196bd4fc00d8a060e30da33aa63f4087fb3271e615a98`
  (the current mainnet published-at, v4), updated from the stale v3 ID.
