---
'@mysten/seal': patch
---

Force scalar encoding in BLS to big-endian since versions >=1.9.6 of noble/curves changed the default encoding to little-endian.
Encryptions created by previous versions of Seal SDK and with noble/curves versions >=1.9.6 might fail to `decrypt` with the default call arguments. In case you need to decrypt such ciphertexts, set  `checkShareConsistency=fallse` and `checkLENonce=true` on `DecryptOptions`.
To fix this, enable the `checkLENonce=true` on `DecryptOptions`. However, these encryptions may not be decryptable using the Seal SDK when called with `checkShareConsistency=true`or by the onchain `decrypt` function.
