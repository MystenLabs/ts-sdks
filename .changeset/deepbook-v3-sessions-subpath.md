---
'@mysten/deepbook-v3': minor
---

Add the `@mysten/deepbook-v3/sessions` subpath: time-limited trading sessions over a canonical Account. An owner authorizes an ephemeral address to act for the Account until a fixed expiry, and the session key never holds a reusable `Auth` — each wrapper mints app authorization internally and consumes it in the same call.

`SessionsContract` covers the session lifecycle (`authorizeSession`, `revokeSession`, `sessionExpirationMs`) and the DeepBook Predict wrappers (`mintExactQuantity`, `mintExactAmount`, `redeemLive`, `redeemSettled`), plus `decodeSessions` / `activeSessions` for enumerating an Account's grants — there is no bulk on-chain read, and expired grants keep occupying slots against a 20-address cap.

The DeepBook spot session wrappers exist on chain but are not surfaced yet: using them also requires `deepbook_core_account`'s read surface, which this SDK does not model.

The package root is unchanged, and subpaths are separate module graphs — importing `/sessions` loads no spot or margin code.
