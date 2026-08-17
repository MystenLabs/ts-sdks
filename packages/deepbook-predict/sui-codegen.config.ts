// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// Predict is not yet registered on MVR, so we generate from the local Move source
// in the sibling `deepbookv3` checkout (same pattern `deepbook-v3` uses for
// `@deepbook/core`). Generate against the COMMIT THAT GETS DEPLOYED — deployed
// truth beats repo truth; the generated bindings are the signature authority the
// hand-written facade builds on.
//
// Oracle is read-only for this SDK: trade entrypoints read feeds by reference, so
// we do not generate the oracle-construction packages (`block_scholes_oracle` /
// `pyth_lazer`) — they are only needed to *produce* oracle updates, out of scope.
// The generated BCS layouts parse `u64`/`u128`/`u256` to decimal strings, which every consumer
// in this SDK immediately wrapped in `BigInt(...)`. Parsing straight to bigint removes those
// wrappers without changing any public type: the receipts and reads already expose bigint.
//
// Representation only — no scaling. Scale is not inferable from a field's type
// (`order_events::OrderMinted.trading_fee` is a 1e6 amount while
// `config_events::MarketCreated.base_fee` is a rate), and the receipts deliberately expose exact
// bigints alongside their display numbers.
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
			package: '@local-pkg/account',
			path: '../../../deepbookv3/packages/account',
			configArguments: {
				accountPackageId: { package: '@local-pkg/account' },
				accountRegistry: { type: 'account_registry::AccountRegistry' },
			},
			bcsOverrides,
		},
		{
			package: '@local-pkg/propbook',
			path: '../../../deepbookv3/packages/propbook',
			bcsOverrides,
		},
	],
};

export default config;
