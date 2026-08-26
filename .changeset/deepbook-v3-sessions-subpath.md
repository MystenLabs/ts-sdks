---
'@mysten/deepbook-v3': minor
---

Add the `@mysten/deepbook-v3/sessions` subpath: time-limited trading sessions over a canonical Account. An owner authorizes an ephemeral address to act for the Account until a fixed expiry, and the session key never holds a reusable `Auth` — each wrapper mints app authorization internally and consumes it in the same call.

`SessionsContract` covers the session lifecycle (`authorizeSession`, `revokeSession`, `sessionExpirationMs`) and the DeepBook Predict wrappers (`mintExactQuantity`, `mintExactAmount`, `redeemLive`, `redeemSettled`), plus `deriveAccountId` / `deriveSessionsFieldId` / `decodeSessions` / `activeSessions` for enumerating an Account's grants — there is no bulk on-chain read, and expired grants keep occupying slots against a 20-address cap.

The DeepBook spot session wrappers are generated and reachable from `sessionsMoveCalls`, but are not wrapped on `SessionsContract` yet — the surrounding spot-over-Account workflow is not modelled.

The package root is unchanged, and subpaths are separate module graphs — importing `/sessions` loads no spot or margin code.

`getSessionsConfig(network)` returns the deployed sessions ids — package, `SessionsConfig` object, and the account ids sessions shares — plus `deepbookRegistry` and the `deepbook_core_account` package id for the generated spot wrappers. It reads the same generated deployment record `/account` and `/predict` use, so a redeploy moves every subpath together. Testnet only for now; other networks throw.
