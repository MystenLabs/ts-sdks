---
'@mysten/deepbook-v3': patch
---

Point Testnet at the P-33 SVI-decimals packages: Predict v9 `0x481215e2…`, `deepbook_predict_orders` v4 `0xcd6ff112…` and Sessions v6 `0x8b3e5c2a…`. The regenerated bindings add Propbook's `block_scholes_store::svi_decimals` and `registry::set_block_scholes_svi_decimals`, and the `BlockScholesSVIDecimalsSet` event. Every Testnet store is still at 9 decimals, so pricing is unchanged. The version constants are unchanged (Predict 5, orders 2), and Mainnet ids are unchanged.
