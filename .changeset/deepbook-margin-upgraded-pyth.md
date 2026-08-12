---
'@mysten/deepbook-v3': major
---

Move the margin surface onto Pyth's upgraded Core and drop the legacy Pyth surface.

Pyth is replacing Core with a separately published Sui package rather than upgrading it in place, so
its `PriceInfoObject` is a distinct Move type that the existing margin entrypoints can never accept
— their signatures are frozen by the `compatible` upgrade policy. `deepbook_margin` therefore
exposes the upgraded surface as parallel modules (`margin_manager_upgraded`, `pool_proxy_upgraded`)
and `margin_liquidation` as parallel entrypoints (`liquidate_base_upgraded`,
`liquidate_quote_upgraded`), all under the same function names.

**This SDK now targets only the upgraded deployment.** Legacy Core is being retired, so carrying
both was short-lived complexity: there is no `marginPyth` switch, no `pythUpgraded` config and no
`priceInfoObjectIdUpgraded` field. `pyth` is the upgraded deployment's state objects and
`priceInfoObjectId` is its price object. Every margin method keeps its name and signature; what
changes is the module each one targets and the price object it passes. Entrypoints that take no
oracle — manager creation, repayment, referrals, cancels, staking, governance and every getter —
stay on the base modules, which is the only place they exist.

**Requires the upgraded margin package on the target network.** The upgraded modules do not exist in
earlier `deepbook_margin` publications, so this release must not be used against a network whose
margin package predates them.

Price update data is now fetched from Hermes v2 (`/v2/updates/price/latest`) instead of the
deprecated v1 `/api/latest_vaas`; both return the same payload. The client gains a `pythAccessToken` option (and `pyth.accessToken` beneath it), sent as
`Authorization: Bearer`: the endpoint serving the upgraded Core answers 401 without it, so price
updates cannot work otherwise. It is named to match `@mysten/suins`, which takes the same
credential, and it composes with the built-in Pyth state objects rather than replacing them the
way a whole `pyth` config does. Supply the token at runtime; no credential ships with the SDK. Consumers who supply none are intended to
fall back to a DeepBook-operated proxy, which is not deployed yet, so that path currently throws a
`ConfigurationError` naming the field to set.

Testnet package ids move to `deepbook_margin` v16 and `margin_liquidation` v4, and testnet coins
carry the feed ids its migrated `MarginRegistry` is configured with — DBTC prices off BTC/USD, as
the upgraded deployment carries no distinct DBTC feed. Mainnet XBTC has no upgraded price object
yet, so pricing it throws until one is created.
