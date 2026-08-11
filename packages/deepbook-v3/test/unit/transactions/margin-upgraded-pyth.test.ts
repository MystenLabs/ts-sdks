// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Routing guard for the upgraded-Pyth margin surface.
//
// Pyth's upgraded Core is a separately published package, so its `PriceInfoObject` is a
// distinct Move type and the frozen margin signatures can never accept it. The upgraded
// entrypoints therefore live in parallel modules under the same function names, and the
// SDK picks between them from config. These tests pin that choice: which module each
// builder targets, and which price object it passes.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { MarginLiquidationsContract } from '../../../src/transactions/marginLiquidations.js';
import { MarginManagerContract } from '../../../src/transactions/marginManager.js';
import { MarginTPSLContract } from '../../../src/transactions/marginTPSL.js';
import { PoolProxyContract } from '../../../src/transactions/poolProxy.js';
import { DeepBookConfig } from '../../../src/utils/config.js';
import { testnetCoins } from '../../../src/utils/constants.js';
import type { CoinMap, MarginPythMode } from '../../../src/index.js';

const POOL_KEY = 'SUI_DBUSDC';
const MGR_KEY = 'TEST_MGR';
const MGR_ADDR = '0x2222222222222222222222222222222222222222222222222222222222222222';
const VAULT = '0x3333333333333333333333333333333333333333333333333333333333333333';

const SUI_UPGRADED = '0x1111111111111111111111111111111111111111111111111111111111110001';
const DBUSDC_UPGRADED = '0x1111111111111111111111111111111111111111111111111111111111110002';
const SUI_LEGACY = '0x2222222222222222222222222222222222222222222222222222222222220001';
const DBUSDC_LEGACY = '0x2222222222222222222222222222222222222222222222222222222222220002';

// These are routing tests: they assert which module each builder targets and which price
// object it passes, so the fixture supplies BOTH ids for both modes. The shipped testnet
// map deliberately carries the upgraded identity only (its registry was migrated onto
// upgraded-Core feed ids), which is asserted separately under 'shipped defaults'.
const coinsWithUpgraded: CoinMap = {
	...testnetCoins,
	SUI: {
		...testnetCoins.SUI,
		priceInfoObjectId: SUI_LEGACY,
		priceInfoObjectIdUpgraded: SUI_UPGRADED,
	},
	DBUSDC: {
		...testnetCoins.DBUSDC,
		priceInfoObjectId: DBUSDC_LEGACY,
		priceInfoObjectIdUpgraded: DBUSDC_UPGRADED,
	},
};

function config(marginPyth: MarginPythMode, coins: CoinMap = coinsWithUpgraded) {
	return new DeepBookConfig({
		network: 'testnet',
		address: '0x1',
		coins,
		marginPyth,
		marginManagers: { [MGR_KEY]: { address: MGR_ADDR, poolKey: POOL_KEY } },
	});
}

/** The (module, function) pairs a builder emits, in order. */
function targets(marginPyth: MarginPythMode, build: (tx: Transaction) => unknown): string[] {
	const tx = new Transaction();
	tx.setSender('0x1');
	build(tx);
	return tx
		.getData()
		.commands.filter((command) => command.MoveCall)
		.map((command) => `${command.MoveCall!.module}::${command.MoveCall!.function}`);
}

/** Object ids referenced by the PTB, in input order. */
function objectInputs(build: (tx: Transaction) => unknown): string[] {
	const tx = new Transaction();
	tx.setSender('0x1');
	build(tx);
	return tx
		.getData()
		.inputs.filter((input) => input.UnresolvedObject)
		.map((input) => input.UnresolvedObject!.objectId);
}

describe('margin entrypoints follow the configured Pyth deployment', () => {
	const oracleTaking: Array<[string, (c: DeepBookConfig) => (tx: Transaction) => unknown]> = [
		[
			'deposit (base)',
			(c) => new MarginManagerContract(c).depositBase({ managerKey: MGR_KEY, amount: 1 }),
		],
		[
			'deposit (quote)',
			(c) => new MarginManagerContract(c).depositQuote({ managerKey: MGR_KEY, amount: 1 }),
		],
		[
			'deposit (deep)',
			(c) => new MarginManagerContract(c).depositDeep({ managerKey: MGR_KEY, amount: 1 }),
		],
		['withdraw (base)', (c) => new MarginManagerContract(c).withdrawBase(MGR_KEY, 1)],
		['withdraw (quote)', (c) => new MarginManagerContract(c).withdrawQuote(MGR_KEY, 1)],
		['borrow_base', (c) => new MarginManagerContract(c).borrowBase(MGR_KEY, 1)],
		['borrow_quote', (c) => new MarginManagerContract(c).borrowQuote(MGR_KEY, 1)],
		['manager_state', (c) => new MarginManagerContract(c).managerState(POOL_KEY, MGR_ADDR)],
	];

	it.each(oracleTaking)('%s targets margin_manager in legacy mode', (_name, build) => {
		expect(targets('legacy', build(config('legacy')))[0]).toMatch(/^margin_manager::/);
	});

	it.each(oracleTaking)('%s targets margin_manager_upgraded in upgraded mode', (_name, build) => {
		expect(targets('upgraded', build(config('upgraded')))[0]).toMatch(/^margin_manager_upgraded::/);
	});

	it('keeps the function name identical across modes', () => {
		for (const [, build] of oracleTaking) {
			const legacy = targets('legacy', build(config('legacy')))[0].split('::')[1];
			const upgraded = targets('upgraded', build(config('upgraded')))[0].split('::')[1];
			expect(upgraded).toBe(legacy);
		}
	});

	it('passes the upgraded price objects in upgraded mode', () => {
		const build = new MarginManagerContract(config('upgraded')).managerState(POOL_KEY, MGR_ADDR);
		const inputs = objectInputs(build);
		expect(inputs).toContain(SUI_UPGRADED);
		expect(inputs).toContain(DBUSDC_UPGRADED);
		expect(inputs).not.toContain(SUI_LEGACY);
	});

	it('passes the legacy price objects in legacy mode', () => {
		const build = new MarginManagerContract(config('legacy')).managerState(POOL_KEY, MGR_ADDR);
		const inputs = objectInputs(build);
		expect(inputs).toContain(SUI_LEGACY);
		expect(inputs).not.toContain(SUI_UPGRADED);
	});
});

describe('entrypoints without an oracle argument stay on the base module', () => {
	// `margin_manager_upgraded` and `pool_proxy_upgraded` carry only the entrypoints that
	// take a `PriceInfoObject`. Routing anything else there would target a function that
	// does not exist.
	it('margin_manager keeps creation, repayment and getters', () => {
		const c = config('upgraded');
		const manager = new MarginManagerContract(c);
		expect(targets('upgraded', manager.newMarginManager(POOL_KEY))[0]).toBe('margin_manager::new');
		expect(targets('upgraded', manager.repayBase(MGR_KEY))[0]).toBe('margin_manager::repay_base');
		expect(targets('upgraded', manager.borrowedShares(POOL_KEY, MGR_ADDR))[0]).toBe(
			'margin_manager::borrowed_shares',
		);
	});

	it('pool_proxy keeps cancels and settlement withdrawals', () => {
		const proxy = new PoolProxyContract(config('upgraded'));
		expect(targets('upgraded', proxy.cancelAllOrders(MGR_KEY))[0]).toBe(
			'pool_proxy::cancel_all_orders',
		);
		expect(targets('upgraded', proxy.withdrawSettledAmounts(MGR_KEY))[0]).toBe(
			'pool_proxy::withdraw_settled_amounts',
		);
	});

	it('tpsl cancels stay on margin_manager', () => {
		const tpsl = new MarginTPSLContract(config('upgraded'));
		expect(targets('upgraded', tpsl.cancelAllConditionalOrders(MGR_KEY))[0]).toBe(
			'margin_manager::cancel_all_conditional_orders',
		);
	});
});

describe('pool_proxy order placement follows the configured deployment', () => {
	const order = (c: DeepBookConfig) =>
		new PoolProxyContract(c).placeLimitOrder({
			poolKey: POOL_KEY,
			marginManagerKey: MGR_KEY,
			clientOrderId: '1',
			price: 1,
			quantity: 1,
			isBid: true,
		});

	it('targets pool_proxy in legacy mode', () => {
		expect(targets('legacy', order(config('legacy')))).toContain(
			'pool_proxy::place_limit_order_v2',
		);
	});

	it('targets pool_proxy_upgraded in upgraded mode', () => {
		expect(targets('upgraded', order(config('upgraded')))).toContain(
			'pool_proxy_upgraded::place_limit_order_v2',
		);
	});

	it('updateCurrentPrice follows the deployment too', () => {
		const proxy = (mode: MarginPythMode) => new PoolProxyContract(config(mode));
		expect(targets('legacy', proxy('legacy').updateCurrentPrice(POOL_KEY))[0]).toBe(
			'pool_proxy::update_current_price',
		);
		expect(targets('upgraded', proxy('upgraded').updateCurrentPrice(POOL_KEY))[0]).toBe(
			'pool_proxy_upgraded::update_current_price',
		);
	});
});

describe('liquidation entries are parallel functions, not a parallel module', () => {
	const liquidate = (c: DeepBookConfig, side: 'base' | 'quote') =>
		side === 'base'
			? new MarginLiquidationsContract(c).liquidateBase(VAULT, MGR_ADDR, POOL_KEY)
			: new MarginLiquidationsContract(c).liquidateQuote(VAULT, MGR_ADDR, POOL_KEY);

	it('uses the legacy entries in legacy mode', () => {
		expect(targets('legacy', liquidate(config('legacy'), 'base'))[0]).toBe(
			'liquidation_vault::liquidate_base',
		);
		expect(targets('legacy', liquidate(config('legacy'), 'quote'))[0]).toBe(
			'liquidation_vault::liquidate_quote',
		);
	});

	it('uses the upgraded entries in upgraded mode', () => {
		expect(targets('upgraded', liquidate(config('upgraded'), 'base'))[0]).toBe(
			'liquidation_vault::liquidate_base_upgraded',
		);
		expect(targets('upgraded', liquidate(config('upgraded'), 'quote'))[0]).toBe(
			'liquidation_vault::liquidate_quote_upgraded',
		);
	});

	it('the vault balance read takes no oracle and is unaffected', () => {
		const vault = new MarginLiquidationsContract(config('upgraded'));
		expect(targets('upgraded', vault.balance(VAULT, 'SUI'))[0]).toBe('liquidation_vault::balance');
	});
});

describe('a missing price object fails before the move call', () => {
	// On chain this would abort `EPriceFeedIdMismatch` deep inside the oracle read, which
	// does not say which coin was at fault.
	it('names the coin and the reason in upgraded mode', () => {
		// WAL ships no price ids at all on testnet.
		const c = config('upgraded', testnetCoins);
		expect(() => c.getPriceInfoObjectId('WAL')).toThrowError(
			/Coin 'WAL' has no priceInfoObjectIdUpgraded/,
		);
	});

	it('names the coin when legacy ids were retired', () => {
		// Testnet carries the upgraded identity only, so forcing legacy fails here rather
		// than pairing a legacy object with an upgraded feed.
		const c = config('legacy', testnetCoins);
		expect(() => c.getPriceInfoObjectId('SUI')).toThrowError(
			/Coin 'SUI' has no priceInfoObjectId configured/,
		);
	});
});

describe('shipped defaults', () => {
	// Testnet's MarginRegistry was migrated onto upgraded-Core feed ids, which retired
	// legacy testnet margin; mainnet margin has not been upgraded yet.
	it('testnet defaults to upgraded, mainnet to legacy', () => {
		expect(new DeepBookConfig({ network: 'testnet', address: '0x1' }).marginPyth).toBe('upgraded');
		expect(new DeepBookConfig({ network: 'mainnet', address: '0x1' }).marginPyth).toBe('legacy');
	});

	it('can be moved ahead of the default per client', () => {
		expect(
			new DeepBookConfig({ network: 'mainnet', address: '0x1', marginPyth: 'upgraded' })
				.usesUpgradedPyth,
		).toBe(true);
	});
});
