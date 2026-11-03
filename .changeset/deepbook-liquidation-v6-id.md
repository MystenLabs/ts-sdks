---
'@mysten/deepbook-v3': patch
---

Bump the mainnet `LIQUIDATION_PACKAGE_ID` to `margin_liquidation` v6: `0xba2b39c0…` → `0xd61f264aaf707285a712347fccfb8e905e99d7dc72a6bd1053829ddebf420c2b`. v6 links core v9 and margin v8, the packages `DEEPBOOK_PACKAGE_ID` and `MARGIN_PACKAGE_ID` already point at. v5 links margin v7, so its liquidations stop working once margin version 7 is disabled. v6 keeps every public signature. It retires the legacy-Pyth `liquidate_base` and `liquidate_quote`, which now abort. No builder in this package calls them, because `liquidateBase` and `liquidateQuote` already target `liquidate_base_upgraded` and `liquidate_quote_upgraded`. The deployed vault and its `LIQUIDATION_VAULT` type are unchanged. Testnet is unchanged.
