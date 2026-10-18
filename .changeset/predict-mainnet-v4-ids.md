---
'@mysten/deepbook-v3': minor
---

Record the Mainnet Predict v4 rollout (delayed execution) in the Mainnet config. Mainnet Predict
trading moves to queued orders, as Testnet did in 2.7.0.

- Predict: `0x08fa3ef1…ee53` (v3) →
  `0x98235c5842831c9b5f51dc637cf34c91db2aca5510802eb6ebfec63f5b71a7bb` (v4), which is also
  `packages.predictDelayedExecution`
- `deepbook_predict_orders`: `0x7cd41de311f8f3efb2c239b38773a4010fce3bef0120cd55f479843077c98903`
  (v1), with its `OrderDesk` `0x87b0a87262aacf58eaff567eed2fb7cb0f9cbc1f5ce33ef79216cd26d13a1b5b`
  and `QueueRegistry` `0x8d4f0c671862f065ac7f2c2cb24abc47cf75ed8fc8e5e52c1d4bdfa53eee164f`
- `deepbook_predict_math`: `0x19262d18a3ce9f1c304defbacc89f36585152acde73e626231200d10617fb9a7`
  (v1)
- Pyth Lazer `State`: `0xd0db9c1e9212a98120384bf78d8b8c985d87b9ee6921dffcf9d1394062911573`
- Sessions: `0xec678aee…0a1a` (v2) →
  `0xfd9ef53ca443517d6a3a4d8742e00eaa1e7f35b0997697caab8c3e62870c0ce5` (v3)

`predictV1` and `sessionsPackageIdV1` keep the original IDs.

**Move every Mainnet session client to this release before the cutover, spot included.** The
Mainnet cutover transaction raises the Sessions version watermark to 3. From then on, every call
into Sessions v1 or v2 aborts with `session_config::EPackageVersionDisabled`. That includes spot
session-key trading (`sessionsMoveCalls.placeLimitOrder`, `placeMarketOrder`, `cancelLiveOrder`,
`cancelLiveOrders` and `withdrawSettledAmounts`), `authorizeSession` and the Predict wrappers. Older
releases call v2. This release calls v3 for every Sessions builder: the `SessionsContract`
wrappers, and the `sessionsMoveCalls` builders given `getSessionsConfig('mainnet')`. v3 is a
compatible upgrade, so the spot builders' arguments are unchanged. Only `revokeSession` and
`sessionExpirationMs` aren't version-gated, so they keep working on every version. Queued Predict
orders through a session key need v3 too, because the `enqueue*` wrappers exist only there.

**Migrate off the immediate trades.** The Mainnet call target is now Predict v4, which always aborts
them with `EDelayedExecutionRequired`. On Mainnet, `tx.mint`, `tx.mintAmount`, `tx.mintCost`,
`tx.redeem` and `read.quoteRedeem` stop working, and so do the `SessionsContract` wrappers
`mintExactQuantity`, `mintExactAmount`, `mintExactCost` and `redeemLive`. Place orders with
`tx.enqueueMint`, `tx.enqueueMintAmount`, `tx.enqueueMintCost` and `tx.enqueueSell`, or with
`read.planMint` / `read.planSell` and `tx.enqueuePlan`. Follow each order with `read.order` or
`read.waitForOutcome`. Session keys use the `SessionsContract` `enqueue*` wrappers. `tx.claimSettled`
is unchanged. Staying on an older release doesn't keep the immediate trades: the cutover raises
Predict's version watermark to 4, which retires the v3 package those releases call.

`getConfig('mainnet')` now turns on the queued-order surface. Until the cutover, neither path trades
on Mainnet. Trading is paused, `read.executionMode()` reads `'awaiting-cutover'` until Mainnet's
version watermark reaches 4, and Predict's admission refuses enqueues until then.
