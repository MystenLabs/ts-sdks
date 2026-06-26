---
'@mysten/aws-kms-signer': minor
---

Add Ed25519 support to `AwsKmsSigner`.

`AwsKmsClient.getPublicKey` now recognizes the `ECC_NIST_EDWARDS25519` key spec and
returns an `Ed25519PublicKey`, and `AwsKmsSigner.sign` signs with the `ED25519_SHA_512`
algorithm for Ed25519 keys. Ed25519 signatures are returned as raw 64-byte values, so the
DER parsing and low-S normalization used for the ECDSA curves is skipped.

This lets AWS KMS sign for Sui's native Ed25519 scheme — previously only `Secp256k1`
(`ECC_SECG_P256K1`) and `Secp256r1` (`ECC_NIST_P256`) keys were supported.
