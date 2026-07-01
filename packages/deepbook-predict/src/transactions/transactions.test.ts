// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { encodeOrderId } from '../types/orderId.js';
import { PredictConfig } from '../utils/config.js';
import type { PredictIds } from '../utils/config.js';
import { FLOAT_SCALING } from '../utils/constants.js';
import { AccountContract } from './account.js';
import { PredictAccountContract } from './predictAccount.js';
import type { PricerFeeds } from './trade.js';
import { TradeContract } from './trade.js';

// Deterministic dummy ids so the built PTB is fully offline-inspectable.
const A = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const IDS: PredictIds = {
	predictPackageId: A(0x101),
	accountPackageId: A(0x102),
	propbookPackageId: A(0x103),
	registryId: A(0x104),
	poolVaultId: A(0x105),
	protocolConfigId: A(0x106),
	oracleRegistryId: A(0x107),
	accountRegistryId: A(0x108),
	dusdcType: `${A(0x109)}::dusdc::DUSDC`,
};
const ACCOUNT = A(0x201);
const MARKET = A(0x202);
const FEEDS: PricerFeeds = {
	pyth: A(0x301),
	bsSpot: A(0x302),
	bsForward: A(0x303),
	bsSvi: A(0x304),
};

const config = new PredictConfig({ network: 'testnet', address: A(0xa11ce), ids: IDS });
const acct = new AccountContract(config);
const predictAcct = new PredictAccountContract(config);
const trade = new TradeContract(config);

/** Ordered `module::function` targets of the MoveCall commands in a transaction. */
function targets(tx: Transaction): string[] {
	const commands = (
		tx.getData() as { commands: Array<{ MoveCall?: { module: string; function: string } }> }
	).commands;
	return commands.flatMap((c) =>
		c.MoveCall ? [`${c.MoveCall.module}::${c.MoveCall.function}`] : [],
	);
}

/** The `package` of the first MoveCall matching `module::function`. */
function packageOf(tx: Transaction, target: string): string | undefined {
	const commands = (
		tx.getData() as {
			commands: Array<{ MoveCall?: { package: string; module: string; function: string } }>;
		}
	).commands;
	const mc = commands.find(
		(c) => c.MoveCall && `${c.MoveCall.module}::${c.MoveCall.function}` === target,
	);
	return mc?.MoveCall?.package;
}

describe('account custody builders', () => {
	it('createAccount → registry new + share', () => {
		const tx = new Transaction();
		tx.add(acct.createAccount());
		expect(targets(tx)).toEqual(['account_registry::new', 'account::share']);
		expect(packageOf(tx, 'account_registry::new')).toBe(IDS.accountPackageId);
	});

	it('deposit → generate_auth + deposit_funds', () => {
		const tx = new Transaction();
		tx.add(acct.deposit({ account: ACCOUNT, amount: 1_000_000n }));
		expect(targets(tx)).toContain('account::generate_auth');
		expect(targets(tx)).toContain('account::deposit_funds');
	});

	it('withdraw → generate_auth + withdraw_funds, transfers when recipient set', () => {
		const tx = new Transaction();
		tx.add(acct.withdraw({ account: ACCOUNT, amount: 500_000n, recipient: A(0xbeef) }));
		expect(targets(tx)).toEqual(['account::generate_auth', 'account::withdraw_funds']);
	});
});

describe('trade builders', () => {
	it('loadLivePricer → expiry_market::load_live_pricer on the predict package', () => {
		const tx = new Transaction();
		tx.add(trade.loadLivePricer({ market: MARKET, feeds: FEEDS }));
		expect(targets(tx)).toEqual(['expiry_market::load_live_pricer']);
		expect(packageOf(tx, 'expiry_market::load_live_pricer')).toBe(IDS.predictPackageId);
	});

	it('mintExactQuantity → pricer load, owner auth, then mint', () => {
		const tx = new Transaction();
		const pricer = tx.add(trade.loadLivePricer({ market: MARKET, feeds: FEEDS }));
		tx.add(
			trade.mintExactQuantity({
				market: MARKET,
				account: ACCOUNT,
				pricer,
				lowerTick: 1n,
				higherTick: 2n,
				quantity: 10_000n,
				leverage: FLOAT_SCALING,
			}),
		);
		expect(targets(tx)).toEqual([
			'expiry_market::load_live_pricer',
			'account::generate_auth',
			'expiry_market::mint_exact_quantity',
		]);
	});

	it('redeemLive accepts a codec-produced order id', () => {
		const tx = new Transaction();
		const pricer = tx.add(trade.loadLivePricer({ market: MARKET, feeds: FEEDS }));
		const orderId = encodeOrderId({
			lowerTick: 1n,
			higherTick: 2n,
			floorShares: 0n,
			quantity: 10_000n,
			sequence: 1n,
		});
		tx.add(
			trade.redeemLive({
				market: MARKET,
				account: ACCOUNT,
				pricer,
				orderId,
				closeQuantity: 10_000n,
			}),
		);
		expect(targets(tx)).toContain('expiry_market::redeem_live');
	});

	it('redeemSettled uses owner auth + pyth (no pricer)', () => {
		const tx = new Transaction();
		tx.add(
			trade.redeemSettled({
				market: MARKET,
				account: ACCOUNT,
				pyth: FEEDS.pyth,
				orderId: 1n,
				closeQuantity: 10_000n,
			}),
		);
		expect(targets(tx)).toEqual(['account::generate_auth', 'expiry_market::redeem_settled']);
	});

	it('redeemSettledPermissionless takes no auth', () => {
		const tx = new Transaction();
		tx.add(
			trade.redeemSettledPermissionless({
				market: MARKET,
				account: ACCOUNT,
				pyth: FEEDS.pyth,
				orderId: 1n,
				closeQuantity: 10_000n,
			}),
		);
		expect(targets(tx)).toEqual(['expiry_market::redeem_settled_permissionless']);
	});
});

describe('predict account builders', () => {
	it('setBuilderCode → owner auth + set_builder_code', () => {
		const tx = new Transaction();
		tx.add(predictAcct.setBuilderCode({ account: ACCOUNT, builderCode: A(0x401) }));
		expect(targets(tx)).toEqual(['account::generate_auth', 'predict_account::set_builder_code']);
	});
});
