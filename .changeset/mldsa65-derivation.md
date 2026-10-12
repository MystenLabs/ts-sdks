---
'@mysten/sui': minor
---

Add mnemonic derivation for ML-DSA-65: `MLDSA65Keypair.deriveKeypair` and `deriveKeypairFromSeed` derive keys at `m/94'/784'/0'/0'/0'` with SLIP-0010 (hardened only, `ML-DSA-65 seed` master key), matching `sui keytool`.
