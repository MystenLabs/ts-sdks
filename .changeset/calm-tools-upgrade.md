---
'@mysten/aws-kms-signer': patch
'@mysten/bcs': patch
'@mysten/codegen': patch
'@mysten/create-dapp': patch
'@mysten/dapp-kit-core': patch
'@mysten/dapp-kit-react': patch
'@mysten/deepbook-v3': patch
'@mysten/docs': patch
'@mysten/enoki': patch
'@mysten/gcp-kms-signer': patch
'@mysten/hashi': patch
'@mysten/ledgerjs-hw-app-sui': patch
'@mysten/mvr-static': patch
'@mysten/seal': patch
'@mysten/sui': patch
'@mysten/suins': patch
'@mysten/utils': patch
'@mysten/walletconnect-wallet': patch
'@mysten/webcrypto-signer': patch
'@mysten/window-wallet-core': patch
'@mysten/zksend': patch
---

Upgrade workspace dependencies, remove the legacy dapp-kit package, and migrate the remaining
consumers to the current gRPC-based dapp-kit. Remove the legacy API reference while retaining the
migration guide and deprecation notice.
