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
- Bump mainnet `MARGIN_PACKAGE_ID` to `0x124bb3d8105d6d301c0d40feaa54d65df6b301e4d8ddd5eb8475b0f8a18cff2e`
  to track the latest margin package upgrade on mainnet.
- Bump mainnet `DEEPBOOK_PACKAGE_ID` to `0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748`
  to track the latest core deepbook package upgrade on mainnet.
