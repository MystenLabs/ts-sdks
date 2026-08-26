---
'@mysten/deepbook-v3': minor
---

Add the `@mysten/deepbook-v3/predict` subpath, completing the consolidation of the DeepBook SDKs behind one package. DeepBook Predict — market discovery, quotes, mint/redeem/claim, PLP, typed receipts, and the client-side board pricer — now ships from here rather than from a separate package.

The package root is unchanged, and subpaths remain separate module graphs: importing `/predict` loads no spot or margin code.

`@mysten/deepbook-predict` is superseded. Its last published release keeps working for anyone already on it, but it will not be updated — import from `@mysten/deepbook-v3/predict` instead.

Predict's testnet ids now come from the shared generated deployment record instead of a hand-written literal, so `/account`, `/sessions` and `/predict` cannot drift apart across a redeploy. `TESTNET_CONFIG` and `getConfig(network)` are unchanged in shape and value; `getDeployment(network)` reports which deployment and source commit they came from.
