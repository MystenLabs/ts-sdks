---
'@mysten/deepbook-v3': minor
---

Add the `@mysten/deepbook-v3/account` subpath, which now hosts the shared on-chain account primitive (`AccountContract`, the generated `account` bindings, and the `Account` / `AccountWrapper` BCS structs). The primitive is shared infrastructure — DeepBook's core account wrapper and DeepBook Predict both build on the same Move package — so it lives alongside spot and margin rather than in either consumer.

The package root's export surface is unchanged: `@mysten/deepbook-v3` exports exactly what it did before, and subpaths are separate module graphs, so importing `/account` does not load spot or margin code. Note that `Account` exported from the root remains `@deepbook/core::account::Account`; the account primitive's `Account` is a different type and is reachable only from `/account`.

Documenting a second entry point changes the generated API-reference layout: TypeDoc now emits an `index` module alongside `account`, so existing deepbook-v3 doc pages gain an `index.` segment in their names. External links into the published reference will need updating; nothing in this repo links to them.

`/account` also exports `getAccountConfig(network)`, the deployed ids for the shared account package, so consumers do not transcribe them. It reads a record generated from the deploy tooling's own manifest, which every subpath shares — `getDeployment(network)` reports which deployment and source commit those ids came from. Testnet only for now; other networks throw rather than returning placeholder ids.

This release also marks the package `sideEffects: false`. No module in `src` has an import side effect, so the only emitted-output change is that pure re-export modules are now tree-shaken out of the bundle rather than imported for effect.

`@mysten/deepbook-account` is superseded. Its final release, `0.1.0`, is self-contained and keeps working, but it will not be updated — import from `@mysten/deepbook-v3/account` instead.
