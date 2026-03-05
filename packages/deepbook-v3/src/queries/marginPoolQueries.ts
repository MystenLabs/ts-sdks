// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

import { FLOAT_SCALAR } from '../utils/config.js';
import { formatTokenAmount } from './context.js';
import type { QueryContext } from './context.js';

export class MarginPoolQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async getMarginPoolId(coinKey: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.getId(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.Address.parse(bytes);
	}

	async isDeepbookPoolAllowed(coinKey: string, deepbookPoolId: string): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.deepbookPoolAllowed(coinKey, deepbookPoolId));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.bool().parse(bytes);
	}

	async getMarginPoolTotalSupply(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.totalSupply(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawAmount = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	async getMarginPoolSupplyShares(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.supplyShares(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawShares = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawShares, coin.scalar, decimals);
	}

	async getMarginPoolTotalBorrow(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.totalBorrow(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawAmount = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	async getMarginPoolBorrowShares(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.borrowShares(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawShares = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawShares, coin.scalar, decimals);
	}

	async getMarginPoolLastUpdateTimestamp(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.lastUpdateTimestamp(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return Number(bcs.U64.parse(bytes));
	}

	async getMarginPoolSupplyCap(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.supplyCap(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawAmount = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	async getMarginPoolMaxUtilizationRate(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.maxUtilizationRate(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawRate = Number(bcs.U64.parse(bytes));
		return rawRate / FLOAT_SCALAR;
	}

	async getMarginPoolProtocolSpread(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.protocolSpread(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawSpread = Number(bcs.U64.parse(bytes));
		return rawSpread / FLOAT_SCALAR;
	}

	async getMarginPoolMinBorrow(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.minBorrow(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawAmount = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	async getMarginPoolInterestRate(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.interestRate(coinKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawRate = Number(bcs.U64.parse(bytes));
		return rawRate / FLOAT_SCALAR;
	}

	async getUserSupplyShares(
		coinKey: string,
		supplierCapId: string,
		decimals: number = 6,
	): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.userSupplyShares(coinKey, supplierCapId));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawShares = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawShares, coin.scalar, decimals);
	}

	async getUserSupplyAmount(
		coinKey: string,
		supplierCapId: string,
		decimals: number = 6,
	): Promise<string> {
		const tx = new Transaction();
		tx.add(this.#ctx.marginPool.userSupplyAmount(coinKey, supplierCapId));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const rawAmount = BigInt(bcs.U64.parse(bytes));
		const coin = this.#ctx.config.getCoin(coinKey);
		return formatTokenAmount(rawAmount, coin.scalar, decimals);
	}
}
