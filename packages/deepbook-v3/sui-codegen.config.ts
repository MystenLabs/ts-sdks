// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// The `@local-pkg/*` entries are not registered on MVR, so they generate from the local Move
// source in the sibling `deepbookv3` checkout (same pattern the `@deepbook/*` entries use).
// Set `DEEPBOOKV3_ROOT` to generate from another checkout instead, such as a detached
// `git worktree` of an unpublished commit, so the sibling can stay on whatever branch it is on:
// `DEEPBOOKV3_ROOT=/path/to/worktree pnpm codegen`.
//
// The Predict, Sessions, order-flow companion (`deepbook_predict_orders`) and math library
// (`deepbook_predict_math`) bindings were generated from deepbookv3 af9f7c37 (DBU-885,
// MystenLabs/deepbookv3#1351): delayed execution split across Predict Mainnet v4 / Testnet v5,
// the two fresh packages, and Sessions v3. That commit is not published yet, so re-run codegen
// from the published commit before the Testnet and Mainnet syncs and diff the result. Use the
// matching deployment manifest and Published.toml records when running sync-deployment; those
// separate current call targets from the original IDs of existing types.
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
// are only needed to *produce* oracle updates, which is out of scope. The delayed-execution filler
// is the one caller that verifies Lazer updates, and it calls Lazer's
// `parse_and_verify_le_ecdsa_update` positionally against the package it reads from Lazer's
// `State` (`src/predict/tx/queue.ts`). Only the `i16`/`i64` layouts Predict's own structs embed
// are rendered, under `deepbook_predict/deps/pyth_lazer`.

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

const DEEPBOOKV3 = process.env.DEEPBOOKV3_ROOT ?? '../../../deepbookv3';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@local-pkg/deepbook_predict',
			path: `${DEEPBOOKV3}/packages/predict`,
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
			// Predict's order-flow companion: the per-market `MarketQueue`, the shared `OrderDesk`
			// (the delayed-execution policy and the companion's version floor), every queued-order
			// entry point, the queue reads and the queue events. It calls into Predict, so the
			// Predict singletons it takes come from the same config object. The per-market queue is
			// NOT a config argument: its ID is derived from the desk and the market
			// (`queue::queue_id`), so each call names it.
			package: '@local-pkg/deepbook_predict_orders',
			path: `${DEEPBOOKV3}/packages/predict_orders`,
			configArguments: {
				predictOrdersPackageId: { package: '@local-pkg/deepbook_predict_orders' },
				orderDesk: { type: 'desk::OrderDesk' },
				protocolConfig: { type: '@local-pkg/deepbook_predict::protocol_config::ProtocolConfig' },
				oracleRegistry: { type: '@local-pkg/propbook::registry::OracleRegistry' },
			},
			bcsOverrides,
		},
		{
			// Predict's pure math library: `math::order_terms` and the `lazer_price::LazerPrice`
			// a verified Pyth Lazer update decodes to. Rendered for its layouts and pure calls;
			// the order flow builds a `LazerPrice` on chain, so no SDK path passes one in.
			package: '@local-pkg/deepbook_predict_math',
			path: `${DEEPBOOKV3}/packages/predict_math`,
			configArguments: {
				predictMathPackageId: { package: '@local-pkg/deepbook_predict_math' },
			},
			bcsOverrides,
		},
		{
			package: '@local-pkg/propbook',
			path: `${DEEPBOOKV3}/packages/propbook`,
			bcsOverrides,
		},
		{
			// Time-limited trading sessions: an Account owner authorizes an ephemeral address
			// to submit a bounded set of transactions on the Account's behalf until a fixed
			// expiry. Only the lifecycle and the Predict wrappers are surfaced by the SDK;
			// the DeepBook spot wrappers additionally require `deepbook_core_account`'s read
			// surface, which is not modelled yet.
			package: '@local-pkg/deepbook_sessions',
			path: `${DEEPBOOKV3}/packages/sessions`,
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
			path: `${DEEPBOOKV3}/packages/account`,
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
			path: `${DEEPBOOKV3}/packages/deepbook`,
		},
		{
			package: '@deepbook/margin',
			path: `${DEEPBOOKV3}/packages/deepbook_margin`,
		},
		{
			package: '@deepbook/margin-liquidation',
			path: `${DEEPBOOKV3}/packages/margin_liquidation`,
		},
		{
			package: '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837',
			packageName: 'pyth',
			network: 'testnet',
		},
	],
};

export default config;
