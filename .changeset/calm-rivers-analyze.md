---
'@mysten/wallet-sdk': minor
'@mysten-incubation/sponsor': minor
---

Add explicit transaction analyzer result statuses and a uniform dependency shape.

Analyzer results now include `status`, and top-level analysis includes an overall status.
Dependencies are now declared with a uniform shape: a bare analyzer is a required edge whose value
is the unwrapped result, while the explicit `{ analyzer, required?, transform? }` form lets a
dependency opt out of short-circuiting (`required: false`) and/or map the dependency's full
`AnalyzerResult` to a custom value via `transform` (the default transform unwraps `result`).
`optional(analyzer)` is sugar for `{ analyzer, required: false, transform: (r) => r }`, so an
aggregate analyzer can inspect another analyzer's full result without being skipped when that
dependency cannot run. Sponsor validation uses this to preserve policy rejections from validators
that ran while separately reporting analysis failures from validators that could not run, and now
fails closed when a validator could not run even if it surfaced no message.

These packages are still pre-1.0, but note that the type changes are not purely additive for code
that constructs these result objects or exhaustively matches the old unions: `status` is now required
on analyzer results, `partial`/`skipped` statuses are part of the result model, and sponsor
rejections now include required `policyIssues` and `analysisIssues` fields.
