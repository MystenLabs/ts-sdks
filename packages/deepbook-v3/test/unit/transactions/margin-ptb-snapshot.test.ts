// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// PTB byte-identity guard for the margin codegen migration.
// Each builder's emitted PTB (tx.getData: inputs + commands) is snapshotted.
// Migrating a builder from positional moveCall to a generated named-arg call
// must NOT change the snapshot — that is the proof the migration is non-breaking.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { MarginMaintainerContract } from '../../../src/transactions/marginMaintainer.js';
import { MarginPoolContract } from '../../../src/transactions/marginPool.js';
import { MarginRegistryContract } from '../../../src/transactions/marginRegistry.js';
import { MarginTPSLContract } from '../../../src/transactions/marginTPSL.js';
import { PoolProxyContract } from '../../../src/transactions/poolProxy.js';
import { DeepBookConfig } from '../../../src/utils/config.js';

const POOL_KEY = 'SUI_DBUSDC';
const COIN_KEY = 'SUI';
const OWNER = '0x000000000000000000000000000000000000000000000000000000000000dead';
const MGR_KEY = 'TEST_MGR';
const MGR_ADDR = '0x2222222222222222222222222222222222222222222222222222222222222222';

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

describe('poolProxy PTB snapshots', () => {
	const c = () => new PoolProxyContract(config());
	const limit = { poolKey: POOL_KEY, marginManagerKey: MGR_KEY, clientOrderId: '1', price: 1, quantity: 1, isBid: true };
	const market = { poolKey: POOL_KEY, marginManagerKey: MGR_KEY, clientOrderId: '1', quantity: 1, isBid: true };
	const cases: Array<[string, (m: PoolProxyContract) => (tx: Transaction) => unknown]> = [
		['placeLimitOrder', (m) => m.placeLimitOrder(limit)],
		['placeMarketOrder', (m) => m.placeMarketOrder(market)],
		['placeReduceOnlyLimitOrder', (m) => m.placeReduceOnlyLimitOrder(limit)],
		['placeReduceOnlyMarketOrder', (m) => m.placeReduceOnlyMarketOrder(market)],
		['placeMarketOrderAndRepayLoan', (m) => m.placeMarketOrderAndRepayLoan(market)],
		['placeReduceOnlyLimitOrderAndRepayLoan', (m) => m.placeReduceOnlyLimitOrderAndRepayLoan(limit)],
		['placeReduceOnlyMarketOrderAndRepayLoan', (m) => m.placeReduceOnlyMarketOrderAndRepayLoan(market)],
		['modifyOrder', (m) => m.modifyOrder(MGR_KEY, '123', 1)],
		['cancelOrder', (m) => m.cancelOrder(MGR_KEY, '123')],
		['cancelOrders', (m) => m.cancelOrders(MGR_KEY, ['123', '456'])],
		['cancelAllOrders', (m) => m.cancelAllOrders(MGR_KEY)],
		['withdrawSettledAmounts', (m) => m.withdrawSettledAmounts(MGR_KEY)],
		['stake', (m) => m.stake(MGR_KEY, 1)],
		['unstake', (m) => m.unstake(MGR_KEY)],
		['submitProposal', (m) => m.submitProposal(MGR_KEY, { takerFee: 0.001, makerFee: 0.001, stakeRequired: 100 })],
		['vote', (m) => m.vote(MGR_KEY, MGR_ADDR)],
		['claimRebate', (m) => m.claimRebate(MGR_KEY)],
		['withdrawMarginSettledAmounts', (m) => m.withdrawMarginSettledAmounts(POOL_KEY, MGR_ADDR)],
		['updateCurrentPrice', (m) => m.updateCurrentPrice(POOL_KEY)],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});

describe('marginPool PTB snapshots', () => {
	const c = () => new MarginPoolContract(config());
	const CAP = '0x000000000000000000000000000000000000000000000000000000000000dddd';
	const ID = '0x000000000000000000000000000000000000000000000000000000000000eeee';
	const reads = [
		'getId',
		'totalSupply',
		'supplyShares',
		'totalBorrow',
		'borrowShares',
		'lastUpdateTimestamp',
		'supplyCap',
		'maxUtilizationRate',
		'protocolSpread',
		'minBorrow',
		'interestRate',
	] as const;
	const cases: Array<[string, (m: MarginPoolContract) => (tx: Transaction) => unknown]> = [
		['mintSupplierCap', (m) => m.mintSupplierCap()],
		[
			'supplyToMarginPool',
			(m) => (tx: Transaction) => m.supplyToMarginPool(COIN_KEY, tx.object(CAP), 1)(tx),
		],
		[
			'withdrawFromMarginPool',
			(m) => (tx: Transaction) => m.withdrawFromMarginPool(COIN_KEY, tx.object(CAP), 1)(tx),
		],
		['mintSupplyReferral', (m) => m.mintSupplyReferral(COIN_KEY)],
		['withdrawReferralFees', (m) => m.withdrawReferralFees(COIN_KEY, ID)],
		['deepbookPoolAllowed', (m) => m.deepbookPoolAllowed(COIN_KEY, ID)],
		['userSupplyShares', (m) => m.userSupplyShares(COIN_KEY, ID)],
		['userSupplyAmount', (m) => m.userSupplyAmount(COIN_KEY, ID)],
		...reads.map(
			(fn): [string, (m: MarginPoolContract) => (tx: Transaction) => unknown] => [
				fn,
				(m) => m[fn](COIN_KEY),
			],
		),
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});

describe('marginMaintainer PTB snapshots', () => {
	const c = () => new MarginMaintainerContract(config());
	const CAP = '0x000000000000000000000000000000000000000000000000000000000000cccc';
	const IC = { baseRate: 0.01, baseSlope: 0.1, optimalUtilization: 0.8, excessSlope: 0.5 };
	const MPC = { supplyCap: 1000, maxUtilizationRate: 0.9, protocolSpread: 0.1, minBorrow: 1 };
	const MPC_RL = {
		...MPC,
		rateLimitCapacity: 100,
		rateLimitRefillRatePerMs: 1,
		rateLimitEnabled: true,
	};
	const cases: Array<[string, (m: MarginMaintainerContract) => (tx: Transaction) => unknown]> = [
		['newInterestConfig', (m) => m.newInterestConfig(IC)],
		['newMarginPoolConfig', (m) => m.newMarginPoolConfig(COIN_KEY, MPC)],
		['newMarginPoolConfigWithRateLimit', (m) => m.newMarginPoolConfigWithRateLimit(COIN_KEY, MPC_RL)],
		['newProtocolConfig', (m) => m.newProtocolConfig(COIN_KEY, MPC, IC)],
		[
			'createMarginPool',
			(m) => (tx: Transaction) => {
				const cfg = m.newProtocolConfig(COIN_KEY, MPC, IC)(tx);
				m.createMarginPool(COIN_KEY, cfg)(tx);
			},
		],
		[
			'enableDeepbookPoolForLoan',
			(m) => (tx: Transaction) => m.enableDeepbookPoolForLoan(POOL_KEY, COIN_KEY, tx.object(CAP))(tx),
		],
		[
			'disableDeepbookPoolForLoan',
			(m) => (tx: Transaction) => m.disableDeepbookPoolForLoan(POOL_KEY, COIN_KEY, tx.object(CAP))(tx),
		],
		[
			'updateInterestParams',
			(m) => (tx: Transaction) => m.updateInterestParams(COIN_KEY, tx.object(CAP), IC)(tx),
		],
		[
			'updateMarginPoolConfig',
			(m) => (tx: Transaction) => m.updateMarginPoolConfig(COIN_KEY, tx.object(CAP), MPC)(tx),
		],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});

describe('marginTPSL PTB snapshots', () => {
	const c = () => new MarginTPSLContract(config());
	const cases: Array<[string, (m: MarginTPSLContract) => (tx: Transaction) => unknown]> = [
		['newCondition', (m) => m.newCondition(POOL_KEY, true, 1)],
		[
			'newPendingLimitOrder',
			(m) => m.newPendingLimitOrder(POOL_KEY, { clientOrderId: '1', price: 1, quantity: 1, isBid: true }),
		],
		[
			'newPendingMarketOrder',
			(m) => m.newPendingMarketOrder(POOL_KEY, { clientOrderId: '1', quantity: 1, isBid: true }),
		],
		[
			'addConditionalOrder',
			(m) =>
				m.addConditionalOrder({
					marginManagerKey: MGR_KEY,
					conditionalOrderId: '1',
					triggerBelowPrice: true,
					triggerPrice: 1,
					pendingOrder: { clientOrderId: '1', quantity: 1, isBid: true },
				}),
		],
		['cancelAllConditionalOrders', (m) => m.cancelAllConditionalOrders(MGR_KEY)],
		['cancelConditionalOrder', (m) => m.cancelConditionalOrder(MGR_KEY, '1')],
		['executeConditionalOrders', (m) => m.executeConditionalOrders(MGR_ADDR, POOL_KEY, 1)],
		['executeConditionalOrdersV3', (m) => m.executeConditionalOrdersV3(MGR_ADDR, POOL_KEY, 1)],
		['conditionalOrderIds', (m) => m.conditionalOrderIds(POOL_KEY, MGR_ADDR)],
		['conditionalOrder', (m) => m.conditionalOrder(POOL_KEY, MGR_ADDR, '1')],
		['lowestTriggerAbovePrice', (m) => m.lowestTriggerAbovePrice(POOL_KEY, MGR_ADDR)],
		['highestTriggerBelowPrice', (m) => m.highestTriggerBelowPrice(POOL_KEY, MGR_ADDR)],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});
