---
'@mysten/seal': minor
---

Force scalar encoding in BLS to big-endian since versions >=1.9.6 of noble/curves changed the default encoding to little-endian.
Encryptions created by previous versions of Seal SDK and with noble/curves versions >=1.9.6 might fail to `decrypt` with the default call arguments. In case you need to decrypt such ciphertexts, set  `checkShareConsistency=false` and `checkLEEncoding=true` on `DecryptOptions`.
