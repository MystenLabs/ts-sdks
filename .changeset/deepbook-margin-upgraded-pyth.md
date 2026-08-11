---
'@mysten/deepbook-v3': minor
---

Add support for the margin surface against Pyth's upgraded Core. Pyth is replacing Core with a
separately published Sui package rather than upgrading it in place, so its `PriceInfoObject` is a
distinct Move type that the existing margin entrypoints can never accept — their signatures are
frozen by the `compatible` upgrade policy. `deepbook_margin` therefore exposes the upgraded surface
as parallel modules (`margin_manager_upgraded`, `pool_proxy_upgraded`) and `margin_liquidation` as
parallel entrypoints (`liquidate_base_upgraded`, `liquidate_quote_upgraded`), all under the same
function names.

The SDK follows suit without changing its own surface: every margin method keeps its name and
signature, and a new `marginPyth` setting (`'legacy' | 'upgraded'`) decides which module it targets
and whether it passes `priceInfoObjectId` or the new `priceInfoObjectIdUpgraded`. Price feed pushes
follow the same setting, via a new `pythUpgraded` state config. Entrypoints that take no oracle —
manager creation, repayment, referrals, cancels, staking, governance and every getter — stay on the
base modules in both modes, because the upgraded modules do not carry them.

**Testnet now defaults to `'upgraded'`, which changes every margin transaction the SDK emits on
that network.** Its `MarginRegistry` was migrated onto the feed ids upgraded Pyth Core carries;
because `oracle::validate_feed_id` checks both readers against the configured id, that migration
also retired legacy testnet margin. Testnet callers who pass no `marginPyth` now target
`margin_manager_upgraded` / `pool_proxy_upgraded` and pass upgraded price objects. The testnet coin
map carries the upgraded identity only — the superseded beta feed ids and their legacy price
objects were removed rather than retained, so forcing `marginPyth: 'legacy'` on testnet now throws
naming the coin instead of pairing one deployment's feed with another's object.

**Mainnet is unchanged and still defaults to `'legacy'`** — byte-identical to today's behaviour.
Its upgraded price objects are included for all six feeds that have them (DEEP, SUI, USDC, WAL,
SUIUSDE, USDSUI), each read off the upgraded price table on chain; XBTC has no upgraded
`PriceInfoObject` yet.

Price update data is now fetched from Hermes v2 (`/v2/updates/price/latest`) instead of the
deprecated v1 `/api/latest_vaas`. Both return the same payload, so this is not a behaviour change
today, but v1 is going away. `PythConfig` gains `hermesHeaders`, forwarded to every Hermes request:
the endpoint serving the upgraded Core requires an `Authorization` header and answers 401 without
one. Supply the token at runtime — no credential ships with the SDK. Consumers who supply none fall
back to a DeepBook-operated proxy, which is not yet deployed; until it is, `'upgraded'` mode without
credentials throws a `ConfigurationError` naming the field to set.

Testnet package ids move to `deepbook_margin` v16 and `margin_liquidation` v4, the first testnet
packages carrying the upgraded-Pyth surface. The previous testnet margin id was two upgrades behind
(v14).
