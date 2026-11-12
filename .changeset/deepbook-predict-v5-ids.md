---
'@mysten/deepbook-v3': minor
---

Point Mainnet at Predict v5 `0xb0aaafe0…`, `deepbook_predict_orders` v2 `0x48e78879…` and
`deepbook_predict_math` v2 `0x2919b07a…`, and call `account` v2 `0x3dbf966f…` through the new
`accountPackageIdLatest` / `packages.accountLatest` ids while type tags and derived addresses keep
the original `account` id. The Mainnet version pins move to Predict 5 and orders 2. Mainnet Sessions
stays at v3.

Point Testnet at Predict v10 `0xbb6a1595…`, `deepbook_predict_orders` v5 `0xc43f12fe…` and Sessions
v9 `0x3bb8b2db…`, built from deepbookv3 main. The regenerated bindings add Predict's
`protocol_config::set_template_fee_bands` and its `FeeBandsUpdated` event,
`registry::create_and_share_expiry_market_with_band`, and the Sessions spot pool allowlist
(`session_config::allowed_pools`, `admin_allow_pool`, `admin_disallow_pool`). Session spot orders
through Sessions v9 abort with `EPoolNotAllowed` (code 2) on a pool outside the allowlist. The
version constants are unchanged (Predict 5, orders 2).

`decodeMoveAbort` and `describePredictError` now name the Version 5 aborts:
`session_config::EPoolNotAllowed` (with readable text), `protocol_config::ESettledRedeemRetired`,
and Predict's `config_constants` setter bounds, including `EInvalidFeeBands`.
