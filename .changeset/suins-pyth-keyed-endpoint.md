---
'@mysten/suins': minor
---

`SuinsClient` now accepts an optional `pyth` config (`endpoint`, `accessToken`) to point the Pyth Hermes price service at a custom or keyed endpoint. Price update data now uses the Hermes v2 API (`/v2/updates/price/latest`); the deprecated v1 `/api/latest_vaas` endpoint is no longer used. The Pyth and Wormhole on-chain state objects are now read via layout-agnostic JSON fields instead of BCS struct decoding, keeping the client compatible across both the current and Pro-compatible Pyth package layouts.
