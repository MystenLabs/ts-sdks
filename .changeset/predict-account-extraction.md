---
'@mysten/deepbook-predict': patch
---

Move the shared account layer out to `@mysten/deepbook-account`. The account primitive is not Predict-specific — DeepBook's own core account wrapper builds on the same Move package — so its bindings and builders now live in a dedicated package that Predict depends on. No public API change: `deriveAccountWrapperId`, `generateAuth`, and `ACCUMULATOR_ROOT_ID` are still exported from `@mysten/deepbook-predict`, and every transaction this SDK builds is byte-for-byte unchanged.
