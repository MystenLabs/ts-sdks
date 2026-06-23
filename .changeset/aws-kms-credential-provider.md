---
'@mysten/aws-kms-signer': minor
---

Support a pluggable credential provider in `AwsKmsClient` / `AwsKmsSigner`.

`AwsClientOptions` now accepts an optional async `credentials` provider (compatible with the
providers from `@aws-sdk/credential-providers`, e.g. `fromNodeProviderChain()`). When supplied,
credentials are resolved before each request instead of being captured statically at
construction. This enables the standard AWS credential provider chain (SSO, IAM roles,
container/instance metadata) and lets temporary credentials refresh automatically — previously
the only option was static `accessKeyId`/`secretAccessKey`, which cannot refresh and break when
the underlying session expires.

Static credentials continue to work unchanged, so this is fully backwards compatible. New
`AwsCredentialIdentity` and `AwsCredentialProvider` types are exported.
