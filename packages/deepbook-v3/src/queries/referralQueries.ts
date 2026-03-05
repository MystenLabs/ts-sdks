// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import type { ReferralBalances } from '../types/index.js';
import { DEEP_SCALAR, FLOAT_SCALAR } from '../utils/config.js';
import type { QueryContext } from './context.js';

export class ReferralQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async balanceManagerReferralOwner(referral: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.balanceManager.balanceManagerReferralOwner(referral));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.Address.parse(bytes);
	}

	async getPoolReferralBalances(poolKey: string, referral: string): Promise<ReferralBalances> {
		const tx = new Transaction();
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getPoolReferralBalances(poolKey, referral));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseBytes = res.commandResults![0].returnValues[0].bcs;
		const quoteBytes = res.commandResults![0].returnValues[1].bcs;
		const deepBytes = res.commandResults![0].returnValues[2].bcs;

		const baseBalance = Number(bcs.U64.parse(baseBytes));
		const quoteBalance = Number(bcs.U64.parse(quoteBytes));
		const deepBalance = Number(bcs.U64.parse(deepBytes));

		return {
			base: baseBalance / baseScalar,
			quote: quoteBalance / quoteScalar,
			deep: deepBalance / DEEP_SCALAR,
		};
	}

	async balanceManagerReferralPoolId(referral: string): Promise<string> {
		const tx = new Transaction();

		tx.add(this.#ctx.balanceManager.balanceManagerReferralPoolId(referral));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const poolId = bcs.Address.parse(bytes);

		return normalizeSuiAddress(poolId);
	}

	async poolReferralMultiplier(poolKey: string, referral: string): Promise<number> {
		const tx = new Transaction();

		tx.add(this.#ctx.deepBook.poolReferralMultiplier(poolKey, referral));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const multiplier = Number(bcs.U64.parse(bytes));

		return multiplier / FLOAT_SCALAR;
	}

	async getBalanceManagerReferralId(managerKey: string, poolKey: string): Promise<string | null> {
		const tx = new Transaction();
		tx.add(this.#ctx.balanceManager.getBalanceManagerReferralId(managerKey, poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		try {
			const bytes = res.commandResults![0].returnValues[0].bcs;
			const optionId = bcs.option(bcs.Address).parse(bytes);
			if (optionId === null) {
				return null;
			}
			return normalizeSuiAddress(optionId);
		} catch {
			return null;
		}
	}
}
