---
'@mysten/deepbook-v3': patch
---

Bump the testnet `LIQUIDATION_PACKAGE_ID` to `margin_liquidation` v5: `0x29bccec5…` → `0x4f4916fc38892fe335a8aab45e3f42700060eb2d20f854607489ad88a88393a9`. v5 links testnet core v21 and margin v17, the packages `DEEPBOOK_PACKAGE_ID` and `MARGIN_PACKAGE_ID` already point at. It is built from the same source as mainnet v6. It keeps every public signature and retires the legacy-Pyth `liquidate_base` and `liquidate_quote`, which no builder here calls. Mainnet is unchanged.
