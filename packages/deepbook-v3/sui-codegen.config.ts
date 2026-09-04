// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// The `@local-pkg/*` entries are not registered on MVR, so they generate from the local Move
// source in the sibling `deepbookv3` checkout (same pattern the `@deepbook/*` entries use).
// The `@local-pkg/*` entries generate against deepbookv3 `main`, currently `5a1d80c0`. This is a
// deliberate reversal of the older rule ("generate against the commit that gets deployed"): the
// Predict cluster is being republished from `main` for testnet and mainnet, so `main` is the
// commit that gets deployed. The trade is explicit — between now and that republish the bindings
// describe a surface no live deployment serves, so `deepbook-v3-e2e` (live testnet, scheduled) is
// expected to disagree until the republish lands. Move the anchor forward again at deploy time to
// the exact deployment ref, which is also the only ref where `pnpm sync-deployment` finds the
// manifest.
//
// One `pnpm codegen` run regenerates EVERY entry below from whatever commit that checkout is on,
// so check it out to the intended anchor first and diff the result — a regeneration meant for one
// entry rewrites the rest. The `@deepbook/*` margin entries are NOT on `main`: they stay pinned to
// the deployed margin surface, because margin is live on mainnet and moving it is its own change.
// Revert them if a Predict regeneration rewrites them. Nothing enforces any of this: no CI job runs
// codegen, and it is recorded only here.
//
// `src/contracts/wormhole/**` is the exception — no entry generates it, so it is frozen at whatever
// commit produced it. `src/pyth/pyth.ts` imports it.
//
// Oracle is read-only for this SDK: trade entrypoints read feeds by reference, so we deliberately
// do NOT generate the oracle-construction packages (`block_scholes_oracle` / `pyth_lazer`) — they
// are only needed to *produce* oracle updates, which is out of scope.

// Parse `u64`/`u128`/`u256` straight to bigint rather than the decimal strings `@mysten/sui/bcs`
// yields, which every consumer immediately wrapped in `BigInt(...)`.
//
// Representation only — no scaling. Scale is not inferable from a field's type
// (`order_events::OrderMinted.trading_fee` is a 1e6 amount while
// `config_events::MarketCreated.base_fee` is a rate), and the receipts deliberately expose exact
// bigints alongside their display numbers.
//
// Applied PER ENTRY, to every struct that entry renders including its own dependency modules —
// `deepbook_predict/deps/fixed_math/i64.ts` is bigint while `pyth/i64.ts` is a decimal string, from
// the same Move type. So the rule for a new entry is about what it RENDERS, not what it depends on.
// Depending on `account` does not by itself pull in account's structs: predict and sessions both
// depend on it and render none of its types, because `account::Account` only ever appears as a
// function parameter.
const bcsOverrides = [
	{ type: 'u64', source: './src/bcs/integers.ts#U64' },
	{ type: 'u128', source: './src/bcs/integers.ts#U128' },
	{ type: 'u256', source: './src/bcs/integers.ts#U256' },
];

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@local-pkg/deepbook_predict',
			path: '../../../deepbookv3/packages/predict',
			// Per-network shared singletons and the package address. Every one of these was
			// threaded through by hand on each call site; they now come from the config object
			// the SDK already carries. `PredictConfig` is checked against the generated
			// `DeepbookPredictConfig` interface, so a deployment id that stops matching the
			// deployed signature is a compile error rather than a runtime abort.
			configArguments: {
				predictPackageId: { package: '@local-pkg/deepbook_predict' },
				protocolConfig: { type: 'protocol_config::ProtocolConfig' },
				poolVault: { type: 'plp::PoolVault' },
				registry: { type: 'registry::Registry' },
				oracleRegistry: { type: '@local-pkg/propbook::registry::OracleRegistry' },
			},
			bcsOverrides,
		},
		{
			package: '@local-pkg/propbook',
			path: '../../../deepbookv3/packages/propbook',
			bcsOverrides,
		},
		{
			// Time-limited trading sessions: an Account owner authorizes an ephemeral address
			// to submit a bounded set of transactions on the Account's behalf until a fixed
			// expiry. Only the lifecycle and the Predict wrappers are surfaced by the SDK;
			// the DeepBook spot wrappers additionally require `deepbook_core_account`'s read
			// surface, which is not modelled yet.
			package: '@local-pkg/deepbook_sessions',
			path: '../../../deepbookv3/packages/sessions',
			// The package address and the shared `SessionsConfig` singleton come from a config
			// object rather than being threaded through every call site — same pattern as the
			// account entry. Without this the generated thunks lose their `config` option and
			// `src/sessions.ts` stops compiling.
			configArguments: {
				sessionsPackageId: { package: '@local-pkg/deepbook_sessions' },
				sessionsConfig: { type: 'session_config::SessionsConfig' },
			},
			bcsOverrides,
		},
		{
			// The shared on-chain account primitive. Both DeepBook's core account wrapper and
			// DeepBook Predict build on it, so its bindings live here and are exposed on the
			// `@mysten/deepbook-v3/account` subpath rather than in either consumer.
			package: '@local-pkg/account',
			path: '../../../deepbookv3/packages/account',
			// The package address and the per-network `AccountRegistry` singleton come from a
			// config object instead of being threaded through every call site. The generated
			// `AccountConfig` interface makes a deployment id that stops matching the deployed
			// signature a compile error rather than a runtime abort.
			configArguments: {
				accountPackageId: { package: '@local-pkg/account' },
				accountRegistry: { type: 'account_registry::AccountRegistry' },
			},
			bcsOverrides,
		},
		{
			package: '@deepbook/core',
			path: '../../../deepbookv3/packages/deepbook',
		},
		{
			package: '@deepbook/margin',
			path: '../../../deepbookv3/packages/deepbook_margin',
		},
		{
			package: '@deepbook/margin-liquidation',
			path: '../../../deepbookv3/packages/margin_liquidation',
		},
		{
			package: '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837',
			packageName: 'pyth',
			network: 'testnet',
		},
	],
};

export default config;
