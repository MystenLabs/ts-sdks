---
'@mysten/wallet-sdk': patch
---

The `bytes` and `transactionResponse` analyzers now include the underlying error in their failure
issues — the message carries the real cause (e.g. `Failed to dry run transaction: <detail>`) and the
caught `Error` is attached as `issue.error` — instead of a generic `Failed to build/dry run
transaction`. Many failures (object resolution, gas estimation, an unreachable node) throw during
build/simulation, and that detail was previously discarded.
