---
'@mysten/deepbook-v3': patch
---

Point Predict at its latest published packages and pick up `add_usdc_to_plp`:

- Mainnet Predict: `0x1cacb9bf…a837` (v2) → `0x08fa3ef1b047d87b0b4ce1c7e5f8b42d8bfdea9a70547efe3cce5d8d6e47ee53` (v3)
- Testnet Predict: `0x30a03c33…25ce` (v2) → `0x6c2c2d3c2394cf282f4b8462a99c2e814bda0c223796de10b47b36d35fd878f5` (v4)

`predictV1` keeps the original ids, and Sessions is already on its latest package on both networks.

The regenerated Predict bindings add `plpMoveCalls.addUsdcToPlp`, which pays USDC into the pool
without minting PLP, and the `vaultEvents.UsdcAddedToPlp` event layout.
