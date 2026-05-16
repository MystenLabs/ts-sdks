// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

import { Account, OrderDeepPrice } from '../types/bcs.js';
import type { AccountInfo, LockedBalances, PoolDeepPrice } from '../types/index.js';
import { DEEP_SCALAR, FLOAT_SCALAR } from '../utils/config.js';
import type { QueryContext } from './context.js';

export class AccountQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async account(poolKey: string, managerKey: string): Promise<AccountInfo> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.account(poolKey, managerKey));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const accountInformation = res.commandResults![0].returnValues[0].bcs;
		const accountInfo = Account.parse(new Uint8Array(accountInformation));

		return {
			epoch: accountInfo.epoch,
			open_orders: accountInfo.open_orders,
			taker_volume: Number(accountInfo.taker_volume) / baseScalar,
			maker_volume: Number(accountInfo.maker_volume) / baseScalar,
			active_stake: Number(accountInfo.active_stake) / DEEP_SCALAR,
			inactive_stake: Number(accountInfo.inactive_stake) / DEEP_SCALAR,
			created_proposal: accountInfo.created_proposal,
			voted_proposal: accountInfo.voted_proposal,
			unclaimed_rebates: {
				base: Number(accountInfo.unclaimed_rebates.base) / baseScalar,
				quote: Number(accountInfo.unclaimed_rebates.quote) / quoteScalar,
				deep: Number(accountInfo.unclaimed_rebates.deep) / DEEP_SCALAR,
			},
			settled_balances: {
				base: Number(accountInfo.settled_balances.base) / baseScalar,
				quote: Number(accountInfo.settled_balances.quote) / quoteScalar,
				deep: Number(accountInfo.settled_balances.deep) / DEEP_SCALAR,
			},
			owed_balances: {
				base: Number(accountInfo.owed_balances.base) / baseScalar,
				quote: Number(accountInfo.owed_balances.quote) / quoteScalar,
				deep: Number(accountInfo.owed_balances.deep) / DEEP_SCALAR,
			},
		};
	}

	async lockedBalance(poolKey: string, balanceManagerKey: string): Promise<LockedBalances> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.lockedBalance(poolKey, balanceManagerKey));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseLocked = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteLocked = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepLocked = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			base: Number((baseLocked / baseScalar).toFixed(9)),
			quote: Number((quoteLocked / quoteScalar).toFixed(9)),
			deep: Number((deepLocked / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getPoolDeepPrice(poolKey: string): Promise<PoolDeepPrice> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		tx.add(this.#ctx.deepBook.getPoolDeepPrice(poolKey));

		const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
		const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);
		const deepCoin = this.#ctx.config.getCoin('DEEP');

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const poolDeepPriceBytes = res.commandResults![0].returnValues[0].bcs;
		const poolDeepPrice = OrderDeepPrice.parse(new Uint8Array(poolDeepPriceBytes));

		if (poolDeepPrice.asset_is_base) {
			return {
				asset_is_base: poolDeepPrice.asset_is_base,
				deep_per_base:
					((Number(poolDeepPrice.deep_per_asset) / FLOAT_SCALAR) * baseCoin.scalar) /
					deepCoin.scalar,
			};
		} else {
			return {
				asset_is_base: poolDeepPrice.asset_is_base,
				deep_per_quote:
					((Number(poolDeepPrice.deep_per_asset) / FLOAT_SCALAR) * quoteCoin.scalar) /
					deepCoin.scalar,
			};
		}
	}
}
