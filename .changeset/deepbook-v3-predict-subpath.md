---
'@mysten/deepbook-v3': minor
---

Add the `@mysten/deepbook-v3/predict` subpath, completing the consolidation of the DeepBook SDKs behind one package. DeepBook Predict — market discovery, quotes, mint/redeem/claim, PLP, typed receipts, and the client-side board pricer — now ships from here rather than from a separate package.

The package root is unchanged, and subpaths remain separate module graphs: importing `/predict` loads no spot or margin code.

`@mysten/deepbook-account` and `@mysten/deepbook-predict` are both superseded. Their final published releases keep working for anyone already on them, but they will not be updated — import from `@mysten/deepbook-v3/account` and `@mysten/deepbook-v3/predict` instead.
