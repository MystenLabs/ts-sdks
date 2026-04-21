---
'@mysten/wallet-sdk': minor
---

Improve issue handling on `analyze()`:

- Each analyzer result now carries an additional `ownIssues` field — the issues this analyzer's own `analyze()` emitted, excluding anything inherited from failing dependencies. The existing `issues` field is unchanged (own + inherited).
- The `analyze()` return object now exposes a top-level `issues` array — the concatenation of every analyzer's `ownIssues` across the whole run (including transitive deps). Each analyzer runs once (memoized by cacheKey), so each issue appears exactly once without needing to dedup.
- New `AnalyzerOutput<T>` type exported from `@mysten/wallet-sdk`, returned by individual analyzer `analyze()` callbacks (the old union shape). `AnalyzerResult<T>` is what `analyze()` produces per analyzer, with the new `ownIssues` field added to the failure branch.

```ts
const r = await analyze({ balanceFlows, coinFlows }, { ... });

r.balanceFlows.result      // unchanged
r.balanceFlows.issues      // unchanged (own + inherited)
r.balanceFlows.ownIssues   // NEW — only what balanceFlows emitted
r.issues                   // NEW — every issue, each appearing exactly once
```
