---
'@mysten-incubation/sponsor': minor
---

Add `@mysten-incubation/sponsor`: primitives for sponsoring Sui transactions from a signer.

- `createSponsor({ signer, client, validate, delay })` returns a `Sponsor` with
  `signTransaction` (fill gas + validate + sponsor-sign) and `signAndExecuteTransaction` (sign +
  execute a user-signed transaction). The methods are transport-agnostic, so callers own their
  network request/response shapes.
- Validation rejection is **returned, not thrown**: `signTransaction` →
  `{ $kind: 'Signed' | 'Rejected' }`, `signAndExecuteTransaction` →
  `Rejected | Transaction | FailedTransaction` (switch on `$kind`).
- The sponsor pays gas from its **address balance** (empty gas payment), so it can sign and execute
  in parallel and the network attaches a bounded `ValidDuring` expiration.
- Validators are analyzers — a validator is just `createAnalyzer(...)` whose result is its issues
  (`{ result: null }` to pass) — made dependencies of `sponsor.analyzer`, so the `@mysten/wallet-sdk`
  analyzer framework resolves only what's depended on (no dry-run unless a validator reads
  `transactionResponse`), dedupes shared analyzers, and propagates failures as `ANALYSIS_FAILED`.
  `sponsor.analyzer` composes into any other `analyze()` graph. The analyzer toolkit (`analyzers`,
  `createAnalyzer`, `analyze`) is re-exported.
- Request-scoped options (an auth token, a tenant id) a validator reads off `options` are inferred
  onto `signTransaction` under `validationOptions` — typed and required as appropriate — replacing an
  opaque metadata bag.
- Built-in validators: `senderIsNotSponsor`, `gasCoinNotUsed`, `gasBudget`, `allowedPackages`,
  `allowedFunctions`, `simulationSucceeds`, and `boundedExpiration`. `defaults()` bundles the
  baseline (`senderIsNotSponsor`, `gasCoinNotUsed`, `simulationSucceeds`, `boundedExpiration`).
  Value-flow policy is left to custom validators over the `balanceFlows` analyzer.
- Optional timing-attack mitigation delays before simulate / execute.
