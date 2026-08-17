// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Module routing for the margin surface.
//
// Pyth's upgraded Core is a separately published package, so its `PriceInfoObject` is a
// distinct Move type that the frozen margin signatures can never accept. The upgraded
// entrypoints therefore live in parallel modules under the same function names, and this
// SDK targets only those — the legacy Pyth surface is not carried.
//
// The split is not uniform: `margin_manager_upgraded` and `pool_proxy_upgraded` carry ONLY
// the entrypoints that take a price object. Everything else — creation, repayment,
// referrals, cancels, staking, governance, getters — exists solely on the base module.
// These tests pin which side each builder lands on; sending one the wrong way targets a
// function that does not exist on chain.
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { MarginLiquidationsContract } from '../../../src/transactions/marginLiquidations.js';
import { MarginManagerContract } from '../../../src/transactions/marginManager.js';
import { MarginTPSLContract } from '../../../src/transactions/marginTPSL.js';
import { PoolProxyContract } from '../../../src/transactions/poolProxy.js';
import { DeepBookConfig } from '../../../src/utils/config.js';
import { mainnetCoins, testnetCoins } from '../../../src/utils/constants.js';

const POOL_KEY = 'SUI_DBUSDC';
const MGR_KEY = 'TEST_MGR';
const MGR_ADDR = '0x2222222222222222222222222222222222222222222222222222222222222222';
const VAULT = '0x3333333333333333333333333333333333333333333333333333333333333333';

function config() {
	return new DeepBookConfig({
		network: 'testnet',
		address: '0x1',
		marginManagers: { [MGR_KEY]: { address: MGR_ADDR, poolKey: POOL_KEY } },
	});
}

/** The (module, function) pairs a builder emits, in order. */
function targets(build: (tx: Transaction) => unknown): string[] {
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

describe('oracle-taking entrypoints target the upgraded modules', () => {
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

	it.each(oracleTaking)('%s targets margin_manager_upgraded', (_name, build) => {
		expect(targets(build(config()))[0]).toMatch(/^margin_manager_upgraded::/);
	});

	it('passes the upgraded price objects', () => {
		const inputs = objectInputs(
			new MarginManagerContract(config()).managerState(POOL_KEY, MGR_ADDR),
		);
		expect(inputs).toContain(testnetCoins.SUI.priceInfoObjectId);
		expect(inputs).toContain(testnetCoins.DBUSDC.priceInfoObjectId);
	});
});

describe('entrypoints without an oracle argument stay on the base module', () => {
	// `margin_manager_upgraded` and `pool_proxy_upgraded` carry only the entrypoints that
	// take a `PriceInfoObject`. Routing anything else there would target a function that
	// does not exist.
	it('margin_manager keeps creation, repayment and getters', () => {
		const manager = new MarginManagerContract(config());
		expect(targets(manager.newMarginManager(POOL_KEY))[0]).toBe('margin_manager::new');
		expect(targets(manager.repayBase(MGR_KEY))[0]).toBe('margin_manager::repay_base');
		expect(targets(manager.borrowedShares(POOL_KEY, MGR_ADDR))[0]).toBe(
			'margin_manager::borrowed_shares',
		);
	});

	it('pool_proxy keeps cancels and settlement withdrawals', () => {
		const proxy = new PoolProxyContract(config());
		expect(targets(proxy.cancelAllOrders(MGR_KEY))[0]).toBe('pool_proxy::cancel_all_orders');
		expect(targets(proxy.withdrawSettledAmounts(MGR_KEY))[0]).toBe(
			'pool_proxy::withdraw_settled_amounts',
		);
	});

	it('tpsl cancels stay on margin_manager', () => {
		const tpsl = new MarginTPSLContract(config());
		expect(targets(tpsl.cancelAllConditionalOrders(MGR_KEY))[0]).toBe(
			'margin_manager::cancel_all_conditional_orders',
		);
	});
});

describe('pool_proxy order placement targets the upgraded module', () => {
	it('place_limit_order_v2', () => {
		const build = new PoolProxyContract(config()).placeLimitOrder({
			poolKey: POOL_KEY,
			marginManagerKey: MGR_KEY,
			clientOrderId: '1',
			price: 1,
			quantity: 1,
			isBid: true,
		});
		expect(targets(build)).toContain('pool_proxy_upgraded::place_limit_order_v2');
	});
});

describe('liquidations pick the parallel entrypoint', () => {
	// margin_liquidation puts the upgraded entries in the SAME module as parallel
	// functions, so this is a function name rather than a module.
	const vault = new MarginLiquidationsContract(config());

	it('liquidate_base_upgraded', () => {
		expect(targets(vault.liquidateBase(VAULT, MGR_ADDR, POOL_KEY))[0]).toBe(
			'liquidation_vault::liquidate_base_upgraded',
		);
	});

	it('the vault balance getter takes no oracle and is unchanged', () => {
		expect(targets(vault.balance(VAULT, 'SUI'))[0]).toBe('liquidation_vault::balance');
	});
});

describe('a coin with no upgraded price object fails before the move call', () => {
	// On chain this would abort `EPriceFeedIdMismatch` deep inside the oracle read, which
	// does not say which coin was at fault. WAL ships no price ids on testnet.
	it('names the coin and the reason', () => {
		expect(() => config().getPriceInfoObjectId('WAL')).toThrowError(
			/Coin 'WAL' has no priceInfoObjectId/,
		);
	});
});

// XBTC is a distinct asset from BTC — its own peg, its own redemption risk — so pricing it
// off Crypto.BTC/USD would misstate collateral exactly when the two diverge. Pricing XBTC
// (and testnet's DBTC, which is the same underlying) off BTC is not a configuration option,
// so this pins the feed rather than leaving it to a comment.
describe('XBTC is always priced off its own feed, never BTC/USD', () => {
	const XBTC_USD = '0xae8f269ed9c4bed616c99a98cf6dfe562bd3202e7f91821a471ff854713851b4';
	const BTC_USD = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

	it('mainnet XBTC uses Crypto.XBTC/USD', () => {
		expect(mainnetCoins.XBTC?.feed).toBe(XBTC_USD);
	});

	it('testnet DBTC uses Crypto.XBTC/USD — it is the same underlying', () => {
		expect(testnetCoins.DBTC?.feed).toBe(XBTC_USD);
	});

	it('Crypto.BTC/USD is configured for no coin on either network', () => {
		for (const [network, coins] of [
			['mainnet', mainnetCoins],
			['testnet', testnetCoins],
		] as const) {
			for (const [name, coin] of Object.entries(coins)) {
				expect(`${network}.${name}=${coin.feed ?? 'none'}`).not.toBe(
					`${network}.${name}=${BTC_USD}`,
				);
			}
		}
	});
});
