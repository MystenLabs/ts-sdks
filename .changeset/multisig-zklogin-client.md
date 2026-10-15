---
'@mysten/sui': minor
---

Fix verifying multisig signatures with zkLogin members: the client passed to `verifyTransactionSignature`, `verifyPersonalMessageSignature`, `publicKeyFromSuiBytes`, or `MultiSigPublicKey.fromPublicKeys` (new optional `client` option) is now used to verify each zkLogin member. zkLogin signatures are now verified against the identifier's own address rather than one derived from the signature, so a member's signature must come from that member's zkLogin identity.
