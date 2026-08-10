---
'@mysten/deepbook-predict': minor
---

Add facade capabilities and minimal composition exports. `MarketDescriptor` becomes a
discriminated union that also accepts two-strike range positions (`side: 'range'` with
`lower`/`upper` bounds) and an optional `marketId` pin that mints against an exact
`ExpiryMarket` object instead of resolving by underlying+expiry.
`tx.deposit` gains a `create: true`
option that composes first-time funding into one PTB (create the account wrapper,
deposit through the fresh handle, share last). The root entry now exports `generateAuth`,
`deriveAccountWrapperId`, `ACCUMULATOR_ROOT_ID`, and `POSITION_LOT_SIZE` for PTBs that
compose predict accounts with foreign packages.
