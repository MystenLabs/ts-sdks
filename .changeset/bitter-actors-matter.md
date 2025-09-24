---
'@mysten/seal': patch
---

Force scalar encoding in BLS to big endian since versions >=1.9.6 of noble/curves changed the default encoding to little endian.
Encryptions created by previous versions of Seal SDK and with noble/curves versions >=1.9.6 might fail `decrypt()` if called with `checkShareConsistency=true`, and might not be decryptable by the onchain `decrypt` function.
