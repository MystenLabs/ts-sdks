# @mysten-incubation/sponsor

## 0.2.0

### Minor Changes

- da3a7b2: Add transaction analyzer status metadata and optional dependency edges.

  Analyzer results now include `status`, and top-level analysis returns an overall status.
  Dependency objects can use `{ analyzer, required?, transform? }`; bare analyzer dependencies
  remain required and unwrap `result`, while `optional(analyzer)` and
  `{ analyzer, required: false }` pass the full dependency `AnalyzerResult` unless a custom
  transform is provided. The top-level analyzer key `status` is now reserved.

  Sponsor validation now preserves policy findings from validators that ran while separately
  reporting validators that failed or were skipped. Sponsor rejections include `policyIssues` and
  `analysisIssues`, and failed or skipped validators reject even when they surface no issue message.

  Auto-approval state mutation methods now require a `success` analysis result before mutating
  budgets or pending digests.

  Compatibility note: code that constructs analyzer results, constructs sponsor rejections, or
  exhaustively matches the old analyzer result union may need updates for the required `status`
  field, the `partial` and `skipped` statuses, and the required `policyIssues` and `analysisIssues`
  fields.

### Patch Changes

- Updated dependencies [da3a7b2]
  - @mysten/wallet-sdk@0.7.0

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- 564c8e7: `Sponsor.signAndExecuteTransaction` now threads through every core `executeTransaction`
  prop (`signal`, etc.) and accepts a generic `include`, combined with the always-on `effects` so
  the result type reflects exactly what was requested. The dry-run that backs validation can
  likewise be extended: a validator declares the simulate `include` fields it needs (e.g.
  `include: { balanceChanges: true }`) and that requirement surfaces, typed, on `validationOptions`
  — `effects` stays forced on in both paths and can't be turned off.

### Patch Changes

- Updated dependencies [564c8e7]
  - @mysten/wallet-sdk@0.6.0

## 0.0.2

## 0.0.1

### Patch Changes

- Updated dependencies [cc5cb98]
- Updated dependencies [cc5cb98]
- Updated dependencies [cc5cb98]
  - @mysten/wallet-sdk@0.5.0
