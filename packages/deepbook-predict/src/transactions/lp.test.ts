// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { PredictConfig } from '../utils/config.js';
import type { PredictIds } from '../utils/config.js';
import { FlushContract } from './flush.js';
import { LpContract } from './lp.js';
import type { PricerFeeds } from './trade.js';

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
const feeds = (n: number): PricerFeeds => ({
	pyth: A(n),
	bsSpot: A(n + 1),
	bsForward: A(n + 2),
	bsSvi: A(n + 3),
});

const config = new PredictConfig({ network: 'testnet', address: A(0xa11ce), ids: IDS });
const lp = new LpContract(config);
const flush = new FlushContract(config);

function targets(tx: Transaction): string[] {
	const commands = (
		tx.getData() as { commands: Array<{ MoveCall?: { module: string; function: string } }> }
	).commands;
	return commands.flatMap((c) =>
		c.MoveCall ? [`${c.MoveCall.module}::${c.MoveCall.function}`] : [],
	);
}

describe('LP builders', () => {
	it('requestSupply → owner auth + request_supply', () => {
		const tx = new Transaction();
		tx.add(lp.requestSupply({ account: ACCOUNT, amount: 10_000_000n }));
		expect(targets(tx)).toEqual(['account::generate_auth', 'plp::request_supply']);
	});

	it('stakeDeep → owner auth + stake_deep', () => {
		const tx = new Transaction();
		tx.add(lp.stakeDeep({ account: ACCOUNT, amount: 1_000_000n }));
		expect(targets(tx)).toEqual(['account::generate_auth', 'plp::stake_deep']);
	});

	it('sponsorFeeIncentives → sponsor_fee_incentives (permissionless, no auth)', () => {
		const tx = new Transaction();
		tx.add(lp.sponsorFeeIncentives({ amount: 10_000_000n }));
		expect(targets(tx)).toEqual(['plp::sponsor_fee_incentives']);
	});

	it('rebalanceExpiryCash → rebalance_expiry_cash (permissionless)', () => {
		const tx = new Transaction();
		tx.add(lp.rebalanceExpiryCash({ market: A(0x202), pyth: A(0x301) }));
		expect(targets(tx)).toEqual(['plp::rebalance_expiry_cash']);
	});

	it('lockCapital → lock_capital (admin)', () => {
		const tx = new Transaction();
		tx.add(lp.lockCapital({ adminCap: A(0x501), amount: 10_000_000n }));
		expect(targets(tx)).toEqual(['plp::lock_capital']);
	});
});

describe('flush builder', () => {
	it('fullFlush composes the hot-potato sequence for every market', () => {
		const tx = new Transaction();
		tx.add(
			flush.fullFlush({
				lifecycleCap: A(0x601),
				markets: [
					{ market: A(0x701), feeds: feeds(0x800) },
					{ market: A(0x702), feeds: feeds(0x900) },
				],
			}),
		);
		expect(targets(tx)).toEqual([
			'registry::generate_lifecycle_proof',
			'plp::start_pool_valuation',
			'plp::value_expiry',
			'plp::value_expiry',
			'plp::finish_flush',
		]);
	});
});
