---
'@mysten/seal': patch
---

`SessionKey.setPersonalMessageSignature` checks the signature against the session's address, and
network errors during verification are no longer reported as an invalid signature.
