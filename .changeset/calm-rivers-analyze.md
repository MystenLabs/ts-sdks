---
'@mysten/wallet-sdk': minor
'@mysten-incubation/sponsor': minor
---

Add transaction analyzer status metadata and optional dependency edges.

Analyzer results now include `status`, and top-level analysis returns an overall status. Dependency
objects can use `{ analyzer, required?, transform? }`; bare analyzer dependencies remain required
and unwrap `result`, while `optional(analyzer)` and `{ analyzer, required: false }` pass the full
dependency `AnalyzerResult` unless a custom transform is provided. The top-level analyzer key
`status` is now reserved.

Sponsor validation now preserves policy findings from validators that ran while separately reporting
validators that failed or were skipped. Sponsor rejections include `policyIssues` and
`analysisIssues`, and failed or skipped validators reject even when they surface no issue message.

Auto-approval state mutation methods now require a `success` analysis result before mutating budgets
or pending digests.

Compatibility note: code that constructs analyzer results, constructs sponsor rejections, or
exhaustively matches the old analyzer result union may need updates for the required `status` field,
the `partial` and `skipped` statuses, and the required `policyIssues` and `analysisIssues` fields.
