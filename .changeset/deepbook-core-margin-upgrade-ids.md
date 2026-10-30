---
'@mysten/deepbook-v3': patch
---

Bump the mainnet package ids to DeepBook core v9 and margin v8: `DEEPBOOK_PACKAGE_ID` `0x0e735f8c…` → `0xbca0cefe720330e7bb4f2283438b68de6a0e656688db4ac90d61e71fe6151fe8`, and `MARGIN_PACKAGE_ID` `0x55ee8099…` → `0x40fa183b5602cd0f6c4d7b16c08766ad8d7d581608fbe3b2570fe72ab4f5625f`. The two move together. Margin v8 links core v9, and a transaction that calls core v8 directly next to margin v8 fails with `InvalidLinkage`. Both upgrades keep their public signatures. Margin v8 retires the legacy-Pyth entrypoints in `margin_manager` and `pool_proxy`, and no builder in this package calls them, since every oracle-taking builder already targets the `_upgraded` modules. Testnet moves the same way, to core v21 `0x4b1c2a827983d8fa73f6dc366cfab23636ae52e81e499d8724b71408fe6a00a4` and margin v17 `0x0ad965f35189c7eca57d4718c8f5bf1b7f9f7eb4ced6d5b7aa6496a16d71e8d2`, built from the same source. `LIQUIDATION_PACKAGE_ID` is unchanged on both networks.
