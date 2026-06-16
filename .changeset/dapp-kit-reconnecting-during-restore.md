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
wallet registers (default wallets such as Slush register asynchronously). It stays `reconnecting`
until both every configured wallet initializer has settled and a short grace period has elapsed (to
absorb late-registering wallets such as browser extensions, which have no deterministic "registered"
signal), then settles to `disconnected` if the saved session still hasn't restored — while never
interrupting an in-flight restore, so a slow-but-valid wallet always wins, and continuing to listen
so a very-late wallet can still restore. The `reconnecting` state also now reports
`isReconnecting: true` while the target wallet/account is still resolving, instead of being
suppressed to `disconnected`.

Adds an `autoConnectTimeout` option (default `5000` ms) to tune that grace period.

Consumers can rely on `isReconnecting` to distinguish restoring from logged-out, e.g.
`if (!isReconnecting && !account) redirect()`.
