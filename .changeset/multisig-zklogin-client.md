---
'@mysten/sui': patch
---

Fix verifying multisig signatures with zkLogin members: the client passed to `verifyTransactionSignature`, `verifyPersonalMessageSignature`, `publicKeyFromSuiBytes`, or `MultiSigPublicKey.fromPublicKeys` is now used to verify each zkLogin member.
