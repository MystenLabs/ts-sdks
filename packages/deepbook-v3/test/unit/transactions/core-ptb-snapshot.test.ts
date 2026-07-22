// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// PTB byte-identity guard for the core codegen migration (sibling of
// margin-ptb-snapshot.test.ts). Each builder's emitted PTB (tx.getData: inputs +
// commands) is snapshotted; migrating a builder from positional moveCall to a
// generated named-arg call must NOT change the snapshot — proof it's non-breaking.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { BalanceManagerContract } from '../../../src/transactions/balanceManager.js';
import { FlashLoanContract } from '../../../src/transactions/flashLoans.js';
import { GovernanceContract } from '../../../src/transactions/governance.js';
import { DeepBookConfig } from '../../../src/utils/config.js';

const POOL_KEY = 'SUI_DBUSDC';
const COIN_KEY = 'SUI';
const BM_KEY = 'TEST_BM';
const CAPS_KEY = 'BM_CAPS';
const BM_ADDR = '0x3333333333333333333333333333333333333333333333333333333333333333';
const CAP = '0x000000000000000000000000000000000000000000000000000000000000c0c0';
const RECIPIENT = '0x000000000000000000000000000000000000000000000000000000000000babe';
const ID = '0x000000000000000000000000000000000000000000000000000000000000abcd';

function config() {
	return new DeepBookConfig({
		network: 'testnet',
		address: '0x1',
		balanceManagers: {
			[BM_KEY]: { address: BM_ADDR },
			[CAPS_KEY]: {
				address: '0x4444444444444444444444444444444444444444444444444444444444444444',
				depositCap: CAP,
				withdrawCap: CAP,
				tradeCap: CAP,
			},
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

describe('balanceManager PTB snapshots', () => {
	const c = () => new BalanceManagerContract(config());
	const cases: Array<[string, (b: BalanceManagerContract) => (tx: Transaction) => unknown]> = [
		['createAndShareBalanceManager', (b) => b.createAndShareBalanceManager()],
		['createBalanceManagerWithOwner', (b) => b.createBalanceManagerWithOwner(RECIPIENT)],
		[
			'shareBalanceManager',
			(b) => (tx: Transaction) => {
				const m = b.createBalanceManagerWithOwner(RECIPIENT)(tx);
				b.shareBalanceManager(m)(tx);
			},
		],
		['depositIntoManager', (b) => b.depositIntoManager(BM_KEY, COIN_KEY, 1)],
		['withdrawFromManager', (b) => b.withdrawFromManager(BM_KEY, COIN_KEY, 1, RECIPIENT)],
		['withdrawAllFromManager', (b) => b.withdrawAllFromManager(BM_KEY, COIN_KEY, RECIPIENT)],
		['checkManagerBalance', (b) => b.checkManagerBalance(BM_KEY, COIN_KEY)],
		['generateProof', (b) => b.generateProof(BM_KEY)],
		['generateProofAsOwner', (b) => b.generateProofAsOwner(BM_ADDR)],
		['generateProofAsTrader', (b) => b.generateProofAsTrader(BM_ADDR, CAP)],
		['mintTradeCap', (b) => b.mintTradeCap(BM_KEY)],
		['mintDepositCap', (b) => b.mintDepositCap(BM_KEY)],
		['mintWithdrawalCap', (b) => b.mintWithdrawalCap(BM_KEY)],
		['depositWithCap', (b) => b.depositWithCap(CAPS_KEY, COIN_KEY, 1)],
		['withdrawWithCap', (b) => b.withdrawWithCap(CAPS_KEY, COIN_KEY, 1)],
		[
			'setBalanceManagerReferral',
			(b) => (tx: Transaction) => b.setBalanceManagerReferral(BM_KEY, ID, tx.object(CAP))(tx),
		],
		[
			'unsetBalanceManagerReferral',
			(b) => (tx: Transaction) => b.unsetBalanceManagerReferral(BM_KEY, POOL_KEY, tx.object(CAP))(tx),
		],
		['registerBalanceManager', (b) => b.registerBalanceManager(BM_KEY)],
		['owner', (b) => b.owner(BM_KEY)],
		['id', (b) => b.id(BM_KEY)],
		['balanceManagerReferralOwner', (b) => b.balanceManagerReferralOwner(ID)],
		['balanceManagerReferralPoolId', (b) => b.balanceManagerReferralPoolId(ID)],
		['getBalanceManagerReferralId', (b) => b.getBalanceManagerReferralId(BM_KEY, POOL_KEY)],
		['revokeTradeCap', (b) => b.revokeTradeCap(BM_KEY, ID)],
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
