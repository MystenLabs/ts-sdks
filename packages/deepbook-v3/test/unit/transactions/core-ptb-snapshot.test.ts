// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// PTB byte-identity guard for the core codegen migration (sibling of
// margin-ptb-snapshot.test.ts). Each builder's emitted PTB (tx.getData: inputs +
// commands) is snapshotted; migrating a builder from positional moveCall to a
// generated named-arg call must NOT change the snapshot — proof it's non-breaking.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { BalanceManagerContract } from '../../../src/transactions/balanceManager.js';
import { DeepBookContract } from '../../../src/transactions/deepbook.js';
import { DeepBookAdminContract } from '../../../src/transactions/deepbookAdmin.js';
import { FlashLoanContract } from '../../../src/transactions/flashLoans.js';
import { GovernanceContract } from '../../../src/transactions/governance.js';
import { DeepBookConfig } from '../../../src/utils/config.js';

const POOL_KEY = 'SUI_DBUSDC';
const COIN_KEY = 'SUI';
const BM_KEY = 'TEST_BM';
const CAPS_KEY = 'BM_CAPS';
const BM_ADDR = '0x3333333333333333333333333333333333333333333333333333333333333333';
const CAP = '0x000000000000000000000000000000000000000000000000000000000000c0c0';
// Distinct trade/deposit/withdraw caps so a transposition among the three
// same-typed cap args in the swap*WithManager builders would change the PTB.
const CAP_T = '0x00000000000000000000000000000000000000000000000000000000000000a1';
const CAP_D = '0x00000000000000000000000000000000000000000000000000000000000000a2';
const CAP_W = '0x00000000000000000000000000000000000000000000000000000000000000a3';
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
		adminCap: '0x000000000000000000000000000000000000000000000000000000000000ad11',
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

describe('deepbook PTB snapshots', () => {
	const c = () => new DeepBookContract(config());
	const limit = {
		poolKey: POOL_KEY,
		balanceManagerKey: BM_KEY,
		clientOrderId: '1',
		price: 1,
		quantity: 1,
		isBid: true,
	};
	const market = {
		poolKey: POOL_KEY,
		balanceManagerKey: BM_KEY,
		clientOrderId: '1',
		quantity: 1,
		isBid: true,
	};
	const swap = { poolKey: POOL_KEY, amount: 1, deepAmount: 1, minOut: 0 };
	const swapMgr = {
		poolKey: POOL_KEY,
		balanceManagerKey: BM_KEY,
		tradeCap: CAP_T,
		depositCap: CAP_D,
		withdrawCap: CAP_W,
		amount: 1,
		minOut: 0,
	};
	const cases: Array<[string, (d: DeepBookContract) => (tx: Transaction) => unknown]> = [
		['placeLimitOrder', (d) => d.placeLimitOrder(limit)],
		['placeMarketOrder', (d) => d.placeMarketOrder(market)],
		['modifyOrder', (d) => d.modifyOrder(POOL_KEY, BM_KEY, '123', 1)],
		['cancelOrder', (d) => d.cancelOrder(POOL_KEY, BM_KEY, '123')],
		['cancelOrders', (d) => d.cancelOrders(POOL_KEY, BM_KEY, ['123', '456'])],
		['cancelLiveOrder', (d) => d.cancelLiveOrder(POOL_KEY, BM_KEY, '123')],
		['cancelLiveOrders', (d) => d.cancelLiveOrders(POOL_KEY, BM_KEY, ['123', '456'])],
		['cancelAllOrders', (d) => d.cancelAllOrders(POOL_KEY, BM_KEY)],
		['withdrawSettledAmounts', (d) => d.withdrawSettledAmounts(POOL_KEY, BM_KEY)],
		[
			'withdrawSettledAmountsPermissionless',
			(d) => d.withdrawSettledAmountsPermissionless(POOL_KEY, BM_KEY),
		],
		[
			'withdrawSettledAmountsManagerID',
			(d) => d.withdrawSettledAmountsManagerID(POOL_KEY, BM_ADDR),
		],
		['addDeepPricePoint', (d) => d.addDeepPricePoint(POOL_KEY, 'DEEP_DBUSDC')],
		['claimRebates', (d) => d.claimRebates(POOL_KEY, BM_KEY)],
		['mintReferral', (d) => d.mintReferral(POOL_KEY, 2)],
		['updatePoolReferralMultiplier', (d) => d.updatePoolReferralMultiplier(POOL_KEY, ID, 2)],
		['claimPoolReferralRewards', (d) => d.claimPoolReferralRewards(POOL_KEY, ID)],
		['updatePoolAllowedVersions', (d) => d.updatePoolAllowedVersions(POOL_KEY)],
		['getOrder', (d) => d.getOrder(POOL_KEY, '123')],
		['getOrders', (d) => d.getOrders(POOL_KEY, ['123', '456'])],
		['burnDeep', (d) => d.burnDeep(POOL_KEY)],
		['midPrice', (d) => d.midPrice(POOL_KEY)],
		['whitelisted', (d) => d.whitelisted(POOL_KEY)],
		['getQuoteQuantityOut', (d) => d.getQuoteQuantityOut(POOL_KEY, 1)],
		['getBaseQuantityOut', (d) => d.getBaseQuantityOut(POOL_KEY, 1)],
		['getQuantityOut', (d) => d.getQuantityOut(POOL_KEY, 1, 1)],
		['accountOpenOrders', (d) => d.accountOpenOrders(POOL_KEY, BM_KEY)],
		['getLevel2Range', (d) => d.getLevel2Range(POOL_KEY, 1, 2, true)],
		['getLevel2TicksFromMid', (d) => d.getLevel2TicksFromMid(POOL_KEY, 10)],
		['vaultBalances', (d) => d.vaultBalances(POOL_KEY)],
		[
			'getPoolIdByAssets',
			(d) => d.getPoolIdByAssets(config().getCoin('SUI').type, config().getCoin('DBUSDC').type),
		],
		['swapExactBaseForQuote', (d) => d.swapExactBaseForQuote(swap)],
		['swapExactQuoteForBase', (d) => d.swapExactQuoteForBase(swap)],
		['swapExactQuantity', (d) => d.swapExactQuantity({ ...swap, isBaseToCoin: true })],
		['swapExactBaseForQuoteWithManager', (d) => d.swapExactBaseForQuoteWithManager(swapMgr)],
		['swapExactQuoteForBaseWithManager', (d) => d.swapExactQuoteForBaseWithManager(swapMgr)],
		[
			'swapExactQuantityWithManager',
			(d) => d.swapExactQuantityWithManager({ ...swapMgr, isBaseToCoin: true }),
		],
		[
			'createPermissionlessPool',
			(d) =>
				d.createPermissionlessPool({
					baseCoinKey: 'SUI',
					quoteCoinKey: 'DBUSDC',
					tickSize: 0.001,
					lotSize: 1,
					minSize: 1,
				}),
		],
		['poolTradeParams', (d) => d.poolTradeParams(POOL_KEY)],
		['poolBookParams', (d) => d.poolBookParams(POOL_KEY)],
		['account', (d) => d.account(POOL_KEY, BM_KEY)],
		['lockedBalance', (d) => d.lockedBalance(POOL_KEY, BM_KEY)],
		['getPoolDeepPrice', (d) => d.getPoolDeepPrice(POOL_KEY)],
		['getBalanceManagerIds', (d) => d.getBalanceManagerIds(RECIPIENT)],
		['getPoolReferralBalances', (d) => d.getPoolReferralBalances(POOL_KEY, ID)],
		['poolReferralMultiplier', (d) => d.poolReferralMultiplier(POOL_KEY, ID)],
		['stablePool', (d) => d.stablePool(POOL_KEY)],
		['registeredPool', (d) => d.registeredPool(POOL_KEY)],
		['getQuoteQuantityOutInputFee', (d) => d.getQuoteQuantityOutInputFee(POOL_KEY, 1)],
		['getBaseQuantityOutInputFee', (d) => d.getBaseQuantityOutInputFee(POOL_KEY, 1)],
		['getQuantityOutInputFee', (d) => d.getQuantityOutInputFee(POOL_KEY, 1, 1)],
		['getBaseQuantityIn', (d) => d.getBaseQuantityIn(POOL_KEY, 1, true)],
		['getQuoteQuantityIn', (d) => d.getQuoteQuantityIn(POOL_KEY, 1, true)],
		['getAccountOrderDetails', (d) => d.getAccountOrderDetails(POOL_KEY, BM_KEY)],
		['getOrderDeepRequired', (d) => d.getOrderDeepRequired(POOL_KEY, 1, 1)],
		['accountExists', (d) => d.accountExists(POOL_KEY, BM_KEY)],
		['poolTradeParamsNext', (d) => d.poolTradeParamsNext(POOL_KEY)],
		['quorum', (d) => d.quorum(POOL_KEY)],
		['poolId', (d) => d.poolId(POOL_KEY)],
		[
			'canPlaceLimitOrder',
			(d) =>
				d.canPlaceLimitOrder({
					poolKey: POOL_KEY,
					balanceManagerKey: BM_KEY,
					price: 1,
					quantity: 1,
					isBid: true,
					payWithDeep: true,
					expireTimestamp: 1000,
				}),
		],
		[
			'canPlaceMarketOrder',
			(d) =>
				d.canPlaceMarketOrder({
					poolKey: POOL_KEY,
					balanceManagerKey: BM_KEY,
					quantity: 1,
					isBid: true,
					payWithDeep: true,
				}),
		],
		['checkMarketOrderParams', (d) => d.checkMarketOrderParams(POOL_KEY, 1)],
		['checkLimitOrderParams', (d) => d.checkLimitOrderParams(POOL_KEY, 1, 1, 1000)],
	];
	it.each(cases)('%s', (_name, build) => {
		expect(ptb(build(c()))).toMatchSnapshot();
	});
});

describe('deepbookAdmin PTB snapshots', () => {
	const c = () => new DeepBookAdminContract(config());
	const cases: Array<[string, (a: DeepBookAdminContract) => (tx: Transaction) => unknown]> = [
		[
			'createPoolAdmin',
			(a) =>
				a.createPoolAdmin({
					baseCoinKey: 'SUI',
					quoteCoinKey: 'DBUSDC',
					tickSize: 0.001,
					lotSize: 1,
					minSize: 1,
					whitelisted: false,
					stablePool: false,
				}),
		],
		['unregisterPoolAdmin', (a) => a.unregisterPoolAdmin(POOL_KEY)],
		['updateAllowedVersions', (a) => a.updateAllowedVersions(POOL_KEY)],
		['enableVersion', (a) => a.enableVersion(3)],
		['disableVersion', (a) => a.disableVersion(3)],
		['setTreasuryAddress', (a) => a.setTreasuryAddress(RECIPIENT)],
		['addStableCoin', (a) => a.addStableCoin('DBUSDC')],
		['removeStableCoin', (a) => a.removeStableCoin('DBUSDC')],
		['adjustTickSize', (a) => a.adjustTickSize(POOL_KEY, 0.001)],
		['adjustMinLotSize', (a) => a.adjustMinLotSize(POOL_KEY, 1, 1)],
		['initBalanceManagerMap', (a) => a.initBalanceManagerMap()],
		[
			'setEwmaParams',
			(a) =>
				a.setEwmaParams(POOL_KEY, { alpha: 0.1, zScoreThreshold: 3, additionalTakerFee: 0.001 }),
		],
		['enableEwmaState', (a) => a.enableEwmaState(POOL_KEY, true)],
		['authorizeMarginApp', (a) => a.authorizeMarginApp()],
		['deauthorizeMarginApp', (a) => a.deauthorizeMarginApp()],
		['mintCorePauseCap', (a) => a.mintCorePauseCap()],
		['revokeCorePauseCap', (a) => a.revokeCorePauseCap(ID)],
		['disableVersionWithCorePauseCap', (a) => a.disableVersionWithCorePauseCap(3, ID)],
		['corePauseCaps', (a) => a.corePauseCaps()],
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
			(b) => (tx: Transaction) =>
				b.unsetBalanceManagerReferral(BM_KEY, POOL_KEY, tx.object(CAP))(tx),
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
