---
'@mysten/wallet-sdk': minor
---

Add an `excludeGasBudget` option to the `balanceFlows` analyzer. When true, the gas budget is not charged against the gas payer's per-address deltas — useful for UIs that display gas fees separately from value flows. The gas coin itself is still tracked, so splits / merges on `tx.gas` account correctly; only the budget deduction is suppressed.

```ts
await analyze({ balanceFlows }, { transaction, client, excludeGasBudget: true });
```

Also exports `BalanceFlowsResult` and `BalanceFlowsAnalyzerOptions` from `@mysten/wallet-sdk`.
