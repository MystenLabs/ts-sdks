// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

import type {
	BaseQuantityIn,
	BaseQuantityOut,
	OrderDeepRequiredResult,
	QuantityOut,
	QuoteQuantityIn,
	QuoteQuantityOut,
} from '../types/index.js';
import { DEEP_SCALAR } from '../utils/config.js';
import type { QueryContext } from './context.js';

export class QuantityQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async getQuoteQuantityOut(
		poolKey: string,
		baseQuantity: number | bigint,
	): Promise<QuoteQuantityOut> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getQuoteQuantityOut(poolKey, baseQuantity));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			baseQuantity: Number(baseQuantity),
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getBaseQuantityOut(
		poolKey: string,
		quoteQuantity: number | bigint,
	): Promise<BaseQuantityOut> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getBaseQuantityOut(poolKey, quoteQuantity));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			quoteQuantity: Number(quoteQuantity),
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getQuantityOut(
		poolKey: string,
		baseQuantity: number | bigint,
		quoteQuantity: number | bigint,
	): Promise<QuantityOut> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getQuantityOut(poolKey, baseQuantity, quoteQuantity));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			baseQuantity: Number(baseQuantity),
			quoteQuantity: Number(quoteQuantity),
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getQuoteQuantityOutInputFee(
		poolKey: string,
		baseQuantity: number | bigint,
	): Promise<QuoteQuantityOut> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getQuoteQuantityOutInputFee(poolKey, baseQuantity));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			baseQuantity: Number(baseQuantity),
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getBaseQuantityOutInputFee(
		poolKey: string,
		quoteQuantity: number | bigint,
	): Promise<BaseQuantityOut> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getBaseQuantityOutInputFee(poolKey, quoteQuantity));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			quoteQuantity: Number(quoteQuantity),
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getQuantityOutInputFee(
		poolKey: string,
		baseQuantity: number | bigint,
		quoteQuantity: number | bigint,
	): Promise<QuantityOut> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getQuantityOutInputFee(poolKey, baseQuantity, quoteQuantity));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			baseQuantity: Number(baseQuantity),
			quoteQuantity: Number(quoteQuantity),
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getBaseQuantityIn(
		poolKey: string,
		targetQuoteQuantity: number | bigint,
		payWithDeep: boolean,
	): Promise<BaseQuantityIn> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getBaseQuantityIn(poolKey, targetQuoteQuantity, payWithDeep));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseIn = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			baseIn: Number((baseIn / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getQuoteQuantityIn(
		poolKey: string,
		targetBaseQuantity: number | bigint,
		payWithDeep: boolean,
	): Promise<QuoteQuantityIn> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseScalar = this.#ctx.config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#ctx.config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.#ctx.deepBook.getQuoteQuantityIn(poolKey, targetBaseQuantity, payWithDeep));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseOut = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const quoteIn = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));
		const deepRequired = Number(bcs.U64.parse(res.commandResults![0].returnValues[2].bcs));

		return {
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteIn: Number((quoteIn / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	async getOrderDeepRequired(
		poolKey: string,
		baseQuantity: number | bigint,
		price: number | bigint,
	): Promise<OrderDeepRequiredResult> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.deepBook.getOrderDeepRequired(poolKey, baseQuantity, price));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const deepRequiredTaker = Number(bcs.U64.parse(res.commandResults![0].returnValues[0].bcs));
		const deepRequiredMaker = Number(bcs.U64.parse(res.commandResults![0].returnValues[1].bcs));

		return {
			deepRequiredTaker: Number((deepRequiredTaker / DEEP_SCALAR).toFixed(9)),
			deepRequiredMaker: Number((deepRequiredMaker / DEEP_SCALAR).toFixed(9)),
		};
	}
}
