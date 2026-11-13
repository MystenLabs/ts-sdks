---
'@mysten/wallet-sdk': minor
---

`restrictedMoveCalls` takes `{ restrictedMoveCalls? }` (`package`, `package::module` or
`package::module::function` entries, default `DEFAULT_RESTRICTED_MOVE_CALLS` from
`@mysten/sui/transactions`) in place of `addressAliases` and `targets`, and throws if passed any
other option. Results no longer have a `level`, `matchedBy` is a single string instead of
`string[]`, and the `RestrictionLevel`/`RestrictedTarget` types are gone; register the rule twice
for separate block and warn lists. The `'*'` + `except` allowlist mode is removed with no
replacement: to flag calls to packages the app doesn't know, inspect the transaction's `commands` in
a custom rule built with `createAnalyzer`. The `bytes` analyzer builds with `restrictedMoveCalls: []`
so analysis still sees restricted calls.
