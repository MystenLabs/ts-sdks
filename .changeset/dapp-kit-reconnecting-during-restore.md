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
wallet registers (e.g. async-registered zkLogin wallets) — and settles back to `disconnected` if
the restore can't complete. The `reconnecting` state also now reports `isReconnecting: true` while
the target wallet/account is still resolving, instead of being suppressed to `disconnected`.

Consumers can rely on `isReconnecting` to distinguish restoring from logged-out, e.g.
`if (!isReconnecting && !account) redirect()`.
