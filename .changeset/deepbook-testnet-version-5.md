---
'@mysten/deepbook-v3': minor
---

Point Testnet at the Predict Version 5 rehearsal packages and add account v2's coin receive.

- Testnet ids: Predict v8 `0x7fc9677d…`, `deepbook_predict_orders` v3 `0xc5869f5b…`, Sessions v5 `0x13108df3…` and account v2 `0x4401eae9…`. Mainnet ids are unchanged.
- `PREDICT_PACKAGE_VERSION` is now 5 and `ORDER_FLOW_PACKAGE_VERSION` is 2. These are the code's version constants, which follow the Mainnet package numbers, so the SDK keeps trading when the Predict and order-desk watermarks move to 5 and 2.
- Account calls go to the latest account package, through the new optional `accountPackageIdLatest` (`/account` and `/sessions` ids) and `packages.accountLatest` (Predict). A transaction can't call a package at an older version than another package in it links, so an account call at v1 next to Predict v8 aborts `InvalidLinkage`. `accountPackageId` and `packages.account` stay the original id, which every derived address and type tag uses.
- `AccountContract.receiveCoin` and `receiveCoinAtAccountId` move a `Coin<T>` sent to an account's wrapper address (or its canonical id) into its balance. They are permissionless and need account v2.
- The Predict, `deepbook_predict_orders`, Sessions and account bindings are regenerated from the Version 5 sources, so they include the builder-fee calls. `expiryMarketMoveCalls.redeemSettled`, `redeemSettledPermissionless` and `quoteClose`, and `queueMoveCalls.quoteRedeemOpen`, keep their shipped argument keys, because Version 5 underscore-prefixed those parameters. `redeemSettled` and `redeemSettledPermissionless` always abort from Predict v5.
- Abort names for the builder-fee codes: `protocol_config` 16 `EBuilderFeeCutoverNotReached`, and `sessions` 3–5 `EBuilderNotApproved`, `EBuilderFeeAboveApproved` and `EBuilderApprovalsNotEnabled`.
