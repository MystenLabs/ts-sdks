---
'@mysten/deepbook-v3': patch
---

Bump mainnet `LIQUIDATION_PACKAGE_ID` to the `margin_liquidation` publication carrying the upgraded-Pyth entrypoints: `0xf17bff1b…` → `0xba2b39c026650fef52038c93c526fc5314a4286318a0d2a7054b65815178fb74`. This is what gives `liquidateBase` and `liquidateQuote` a mainnet target: they call `liquidation_vault::liquidate_base_upgraded` / `liquidate_quote_upgraded`, which the previous mainnet publication (v4, `0xf17bff1b…`) did not carry. Every other vault builder takes no oracle and is unaffected.
