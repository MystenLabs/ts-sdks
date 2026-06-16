---
'@mysten/dapp-kit-core': minor
---

Report `isReconnecting` during the initial auto-connect session restore.

Previously, restoring a persisted session on page load jumped the connection straight from
`disconnected` to `connected`, so for the entire async restore window the connection looked
identical to a logged-out user (`account: null`, `isConnecting: false`, `isReconnecting: false`,
`status: "disconnected"`). Consumers had no way to tell "restoring a saved session" apart from
"logged out", which caused auth gates to incorrectly redirect logged-in users on hard refresh.

Auto-connect now eagerly enters the `reconnecting` state on mount whenever a persisted session
exists — independent of wallet-registration timing, so the window is covered even before the saved
wallet registers (default wallets such as Slush register asynchronously). The restore window is
bounded by a real lifecycle signal — it stays `reconnecting` until every configured wallet
initializer has finished registering, then settles to `disconnected` if the saved session still
hasn't been restored — rather than a wall-clock timeout, so a slow-but-valid wallet is never cut off
and a genuinely-absent wallet never hangs. The `reconnecting` state also now reports
`isReconnecting: true` while the target wallet/account is still resolving, instead of being
suppressed to `disconnected`.

Consumers can rely on `isReconnecting` to distinguish restoring from logged-out, e.g.
`if (!isReconnecting && !account) redirect()`.
