---
'@mysten/sui': minor
---

Add resumable ledger streams. `CoreClient` now has `streamCheckpoints`, `streamTransactions` and `streamEvents`, and `SuiGrpcClient` implements them and exposes them as top-level methods. Streams read historical ranges in either order, follow new checkpoints live (`delivery: 'subscribe'` by default, or `'poll'`), and reconnect automatically from the last delivered position. Every item carries a `resumeToken` that resumes the stream exactly where it left off. Optional `frames.progress` and `frames.completion` add resumable progress and completion frames, `onStatus` reports connection and page diagnostics, and errors the stream raises itself are `SuiStreamError`s with a `code`. On `SuiGrpcClient`, `grpcFilter` accepts a native gRPC filter. Clients built on other transports throw `SuiStreamError('InvalidOptions')` until they add support.
