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
