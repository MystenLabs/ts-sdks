---
'@mysten/sui': patch
---

Avoid initializing Poseidon when importing keypairs or parsing signatures by separating zkLogin public-key encoding helpers from address-seed hashing.
