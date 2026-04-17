---
'@mysten/zksend': minor
---

Add `ZkSendLink.claimFlow()` — returns `{ init, assets, finalize }` for composing a caller-driven claim into an existing transaction. `init` is the `init_claim` (or `reclaim`) thunk, each `asset.argument` is a lazy `TransactionObjectArgument` that emits the backing `claim<T>` move call the first time it's used, and `finalize` closes out the claim proof. Enables flows like claiming an NFT and passing it directly into another on-chain object in the same transaction. Apps using this API must provide their own sponsorship for non-standard claim transactions.
