---
'@mysten/deepbook-v3': patch
---

Record the Mainnet Predict v4 rollout (delayed execution) in the Mainnet config:

- Predict: `0x08fa3ef1…ee53` (v3) →
  `0x98235c5842831c9b5f51dc637cf34c91db2aca5510802eb6ebfec63f5b71a7bb` (v4), which is also
  `packages.predictDelayedExecution`
- `deepbook_predict_orders`: `0x7cd41de311f8f3efb2c239b38773a4010fce3bef0120cd55f479843077c98903`
  (v1), with its `OrderDesk` `0x87b0a87262aacf58eaff567eed2fb7cb0f9cbc1f5ce33ef79216cd26d13a1b5b`
  and `QueueRegistry` `0x8d4f0c671862f065ac7f2c2cb24abc47cf75ed8fc8e5e52c1d4bdfa53eee164f`
- `deepbook_predict_math`: `0x19262d18a3ce9f1c304defbacc89f36585152acde73e626231200d10617fb9a7`
  (v1)
- Pyth Lazer `State`: `0xd0db9c1e9212a98120384bf78d8b8c985d87b9ee6921dffcf9d1394062911573`
- Sessions: TODO(DBU-899) PLACEHOLDER. The Mainnet Sessions v3 upgrade has not executed yet, so
  this still records v2 (`0xec678aee…0a1a`). Regenerate from its `Published.toml` record and fill
  in the v3 ID here before release.

`getConfig('mainnet')` now turns on the queued-order surface. `read.executionMode()` reads
`'awaiting-cutover'` until Mainnet's version watermark reaches 4, and Predict's admission refuses
enqueues until then. `predictV1` keeps the original ID.
