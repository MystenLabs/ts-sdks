---
'@mysten/hashi': minor
---

**Breaking:** `hashi()` no longer accepts a `network` option — it's now derived from the Sui client being
extended (`hashi()` instead of `hashi({ network: "testnet" })`), and throws if that client's
network has no `NETWORK_CONFIG` entry and no custom `hashiObjectId`/`packageId` were provided.
