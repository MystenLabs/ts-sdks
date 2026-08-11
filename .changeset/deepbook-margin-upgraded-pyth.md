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

Both networks ship as `'legacy'`, which is byte-identical to today's behaviour; consumers can move
ahead of that default with `new DeepBookClient({ marginPyth: 'upgraded', ... })`. Mainnet's upgraded
price objects are included for the five feeds that have them (XBTC has no upgraded feed object yet);
testnet ships none, because its upgraded Pyth deployment carries mainnet-style feed ids while the
testnet `MarginRegistry` is configured with Pyth's beta ids, and `oracle::read_price_upgraded`
asserts the two match.

Price update data is now fetched from Hermes v2 (`/v2/updates/price/latest`) instead of the
deprecated v1 `/api/latest_vaas`. Both return the same payload, so this is not a behaviour change
today, but v1 is going away. `PythConfig` also gains `hermesHeaders`, forwarded to every Hermes
request: the endpoint serving the upgraded Core requires an `Authorization` header and answers 401
without one. Supply the token at runtime — the SDK ships no default and no credential.

Testnet package ids move to `deepbook_margin` v16 and `margin_liquidation` v4, the first testnet
packages carrying the upgraded-Pyth surface. The previous testnet margin id was two upgrades behind
(v14).
