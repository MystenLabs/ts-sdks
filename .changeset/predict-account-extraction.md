---
'@mysten/deepbook-predict': minor
---

Move the shared account layer out to `@mysten/deepbook-account`. The account primitive is not Predict-specific — DeepBook's own core account wrapper builds on the same Move package — so its bindings and builders now live in a dedicated package that Predict depends on. `deriveAccountWrapperId` and `generateAuth` are still exported from `@mysten/deepbook-predict`, and every transaction this SDK builds is byte-for-byte unchanged.

**Removed: `ACCUMULATOR_ROOT_ID`.** The generated move-call layer injects the well-known `AccumulatorRoot` singleton itself, as it does the `Clock`, so no caller needs the id to build a PTB against these bindings. Callers who passed it explicitly can drop the argument; anyone still needing the literal can use `0xacc` directly.
