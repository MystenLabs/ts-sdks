// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// PTB byte-identity guard for the core codegen migration (sibling of
// margin-ptb-snapshot.test.ts). Each builder's emitted PTB (tx.getData: inputs +
// commands) is snapshotted; migrating a builder from positional moveCall to a
// generated named-arg call must NOT change the snapshot — proof it's non-breaking.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { FlashLoanContract } from '../../../src/transactions/flashLoans.js';
import { GovernanceContract } from '../../../src/transactions/governance.js';
import { DeepBookConfig } from '../../../src/utils/config.js';

const POOL_KEY = 'SUI_DBUSDC';
const BM_KEY = 'TEST_BM';
const BM_ADDR = '0x3333333333333333333333333333333333333333333333333333333333333333';
const ID = '0x000000000000000000000000000000000000000000000000000000000000abcd';

function config() {
	return new DeepBookConfig({
		network: 'testnet',
		address: '0x1',
		balanceManagers: {
			[BM_KEY]: { address: BM_ADDR },
		},
	});
}

function ptb(build: (tx: Transaction) => unknown) {
	const tx = new Transaction();
	tx.setSender('0x1');
	build(tx);
	const { inputs, commands } = tx.getData();
	return { inputs, commands };
}

describe('governance PTB snapshots', () => {
	const c = () => new GovernanceContract(config());
	const cases: Array<[string, (g: GovernanceContract) => (tx: Transaction) => unknown]> = [
		['stake', (g) => g.stake(POOL_KEY, BM_KEY, 1)],
		['unstake', (g) => g.unstake(POOL_KEY, BM_KEY)],
		[
			'submitProposal',
			(g) =>
				g.submitProposal({
					poolKey: POOL_KEY,
					balanceManagerKey: BM_KEY,
					takerFee: 0.001,
					makerFee: 0.001,
					stakeRequired: 100,
				}),
		],
		['vote', (g) => g.vote(POOL_KEY, BM_KEY, ID)],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});

describe('flashLoans PTB snapshots', () => {
	const c = () => new FlashLoanContract(config());
	const cases: Array<[string, (f: FlashLoanContract) => (tx: Transaction) => unknown]> = [
		['borrowBaseAsset', (f) => f.borrowBaseAsset(POOL_KEY, 1)],
		['borrowQuoteAsset', (f) => f.borrowQuoteAsset(POOL_KEY, 1)],
		[
			'returnBaseAsset',
			(f) => (tx: Transaction) => {
				const [coin, loan] = f.borrowBaseAsset(POOL_KEY, 1)(tx);
				f.returnBaseAsset(POOL_KEY, 1, coin, loan)(tx);
			},
		],
		[
			'returnQuoteAsset',
			(f) => (tx: Transaction) => {
				const [coin, loan] = f.borrowQuoteAsset(POOL_KEY, 1)(tx);
				f.returnQuoteAsset(POOL_KEY, 1, coin, loan)(tx);
			},
		],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});
