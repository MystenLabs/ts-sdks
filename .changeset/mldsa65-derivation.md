---
'@mysten/sui': minor
---

Add mnemonic derivation for ML-DSA-65: `MLDSA65Keypair.deriveKeypair` and `deriveKeypairFromSeed` derive keys at `m/94'/784'/0'/0'/0'` with SLIP-0010 (hardened only, `ML-DSA-65 seed` master key), matching `sui keytool`.

Ed25519 and ML-DSA-65 share one SLIP-0010 implementation. Derivation paths for both now reject indices of 2^31 and above and non-canonical index spellings, which would otherwise wrap onto another account, and seeds outside the SLIP-0010 range of 16 to 64 bytes.
