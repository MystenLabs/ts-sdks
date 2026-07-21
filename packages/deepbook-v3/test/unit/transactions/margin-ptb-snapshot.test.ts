// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// PTB byte-identity guard for the margin codegen migration.
// Each builder's emitted PTB (tx.getData: inputs + commands) is snapshotted.
// Migrating a builder from positional moveCall to a generated named-arg call
// must NOT change the snapshot — that is the proof the migration is non-breaking.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { MarginRegistryContract } from '../../../src/transactions/marginRegistry.js';
import { DeepBookConfig } from '../../../src/utils/config.js';

const POOL_KEY = 'SUI_DBUSDC';
const COIN_KEY = 'SUI';
const OWNER = '0x000000000000000000000000000000000000000000000000000000000000dead';

function config() {
	return new DeepBookConfig({
		network: 'testnet',
		address: '0x1',
		marginManagers: {
			TEST_MGR: {
				address: '0x2222222222222222222222222222222222222222222222222222222222222222',
				poolKey: POOL_KEY,
			},
		},
		marginAdminCap: '0x000000000000000000000000000000000000000000000000000000000000aaaa',
		marginMaintainerCap: '0x000000000000000000000000000000000000000000000000000000000000bbbb',
	});
}

// Serialize the parts of a PTB that define what executes: inputs (values) and
// commands (targets, arg references, type args). Byte-identical => same tx.
function ptb(build: (tx: Transaction) => unknown) {
	const tx = new Transaction();
	tx.setSender('0x1');
	build(tx);
	const { inputs, commands } = tx.getData();
	return { inputs, commands };
}

describe('marginRegistry PTB snapshots', () => {
	const c = () => new MarginRegistryContract(config());
	const cases: Array<[string, (m: MarginRegistryContract) => (tx: Transaction) => unknown]> = [
		['poolEnabled', (m) => m.poolEnabled(POOL_KEY)],
		['getMarginPoolId', (m) => m.getMarginPoolId(COIN_KEY)],
		['getDeepbookPoolMarginPoolIds', (m) => m.getDeepbookPoolMarginPoolIds(POOL_KEY)],
		['getMarginManagerIds', (m) => m.getMarginManagerIds(OWNER)],
		['baseMarginPoolId', (m) => m.baseMarginPoolId(POOL_KEY)],
		['quoteMarginPoolId', (m) => m.quoteMarginPoolId(POOL_KEY)],
		['minWithdrawRiskRatio', (m) => m.minWithdrawRiskRatio(POOL_KEY)],
		['minBorrowRiskRatio', (m) => m.minBorrowRiskRatio(POOL_KEY)],
		['minOpenRiskRatio', (m) => m.minOpenRiskRatio(POOL_KEY)],
		['liquidationRiskRatio', (m) => m.liquidationRiskRatio(POOL_KEY)],
		['targetLiquidationRiskRatio', (m) => m.targetLiquidationRiskRatio(POOL_KEY)],
		['userLiquidationReward', (m) => m.userLiquidationReward(POOL_KEY)],
		['poolLiquidationReward', (m) => m.poolLiquidationReward(POOL_KEY)],
		['allowedMaintainers', (m) => m.allowedMaintainers()],
		['allowedPauseCaps', (m) => m.allowedPauseCaps()],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});
