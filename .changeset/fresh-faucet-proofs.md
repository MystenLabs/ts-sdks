---
'@mysten/sui': minor
---

Add `requestSuiFromFaucetV3` for proof-of-work faucets on devnet, testnet, and localnet. The helper fetches and validates a challenge, computes Argon2d proof-of-work, and submits it to `/v3/gas`, with cancellation and a configurable timeout. Export `FaucetResponseV3` and `FaucetError`, including server error codes and transaction digests.

Use Node's asynchronous native Argon2d when available, with Noble as the fallback for Node 22 and browsers.

Use V3 for devnet/testnet and local PoW faucets. Keep using `requestSuiFromFaucetV2` for local no-PoW faucets. V3 pays into address balances and returns `digest` and `amountMist` instead of `coins_sent`. Payout submissions are not automatically retried.
