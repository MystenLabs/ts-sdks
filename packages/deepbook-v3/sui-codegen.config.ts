// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// `bcsOverrides` is per-entry and applies to every BCS struct that entry renders, its own
// dependency modules included — `deepbook_predict/deps/fixed_math/i64.ts` is bigint while
// `pyth/i64.ts` is a decimal string, from the same Move type. Entries that omit it keep
// codegen's default strings.
//
// So the rule for a new entry is about what it RENDERS, not what it depends on: if its
// generated structs carry integers that the hand-written layer reads as bigint, it needs
// these overrides. Depending on `account` does not by itself pull in account's structs —
// predict and sessions both depend on it and render none of its types, because
// `account::Account` only ever appears as a function parameter.
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
			bcsOverrides: [
				{ type: 'u64', source: './src/bcs/integers.ts#U64' },
				{ type: 'u128', source: './src/bcs/integers.ts#U128' },
				{ type: 'u256', source: './src/bcs/integers.ts#U256' },
			],
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
			// Parse `u64`/`u128`/`u256` straight to bigint rather than the decimal strings
			// `@mysten/sui/bcs` yields. Representation only — no scaling is applied. Scoped to
			// this entry: the DeepBook/margin/pyth bindings below keep decimal strings.
			bcsOverrides: [
				{ type: 'u64', source: './src/bcs/integers.ts#U64' },
				{ type: 'u128', source: './src/bcs/integers.ts#U128' },
				{ type: 'u256', source: './src/bcs/integers.ts#U256' },
			],
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
