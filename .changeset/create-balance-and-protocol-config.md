---
'@mysten/sui': minor
---

Add `createBalance` intent function and protocol config support via `getCurrentSystemState`.

- `createBalance({ type, balance })` produces `Balance<T>` instead of `Coin<T>`, sharing the same resolver as `coinWithBalance` so funds are managed together per coin type
- When `createBalance` is used for a type, the merged pool remainder is converted to Balance and sent back to the sender's address balance via `send_funds`
- `getCurrentSystemState({ include: { protocolConfig: true } })` now returns protocol config (feature flags and attributes) alongside system state data across all three transports
- Gas payment compatibility mode creates a coin reservation when GasCoin is used and the `coin_reservation` feature flag is enabled
- Moved `COIN_RESERVATION_MAGIC` to shared utility for use by both JSON-RPC client and core resolver
