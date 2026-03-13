---
'@mysten/sui': minor
---

Add optional `credentialId` parameter to `PasskeyKeypair` constructor and new `getCredentialId()` method. The credential ID is automatically captured when creating a passkey via `getPasskeyInstance` and used to constrain which credential the browser selects during signing.
