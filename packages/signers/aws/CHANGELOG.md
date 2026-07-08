# @mysten/aws-kms-signer

## 0.3.1

## 0.3.0

### Minor Changes

- 9db8f64: Support a pluggable credential provider in `AwsKmsClient` / `AwsKmsSigner`.

  `AwsClientOptions` now accepts an optional async `credentials` provider (compatible with the
  providers from `@aws-sdk/credential-providers`, e.g. `fromNodeProviderChain()`). When supplied,
  credentials are resolved before each request instead of being captured statically at construction.
  This enables the standard AWS credential provider chain (SSO, IAM roles, container/instance
  metadata) and lets temporary credentials refresh automatically — previously the only option was
  static `accessKeyId`/`secretAccessKey`, which cannot refresh and break when the underlying session
  expires.

  Static credentials continue to work unchanged, so this is fully backwards compatible. New
  `AwsCredentialIdentity` and `AwsCredentialProvider` types are exported.

- 9db8f64: Add Ed25519 support to `AwsKmsSigner`.

  `AwsKmsClient.getPublicKey` now recognizes the `ECC_NIST_EDWARDS25519` key spec and returns an
  `Ed25519PublicKey`, and `AwsKmsSigner.sign` signs with the `ED25519_SHA_512` algorithm for Ed25519
  keys. Ed25519 signatures are returned as raw 64-byte values, so the DER parsing and low-S
  normalization used for the ECDSA curves is skipped.

  This lets AWS KMS sign for Sui's native Ed25519 scheme — previously only `Secp256k1`
  (`ECC_SECG_P256K1`) and `Secp256r1` (`ECC_NIST_P256`) keys were supported.

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- bbf63cb: Updated dependencies

## 0.1.2

### Patch Changes

- f7de3e5: Restore docs in published tarballs.
- Updated dependencies [f7de3e5]
  - @mysten/sui@2.16.2

## 0.1.1

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.
- Updated dependencies [9e067cf]
  - @mysten/sui@2.16.1

## 0.1.0

### Minor Changes

- 75a32c1: Initial release. Sui signer using AWS KMS, previously available via
  `@mysten/signers/aws`.
