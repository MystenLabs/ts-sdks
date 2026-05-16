// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

import { Order } from '../types/bcs.js';
import { VecSet } from '../types/bcs.js';
import type { Level2Range, Level2TicksFromMid } from '../types/index.js';
import { DEEP_SCALAR, FLOAT_SCALAR } from '../utils/config.js';
import type { QueryContext } from './context.js';

export class OrderQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async accountOpenOrders(poolKey: string, managerKey: string): Promise<string[]> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);

		tx.add(this.#ctx.deepBook.accountOpenOrders(poolKey, managerKey));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const order_ids = res.commandResults![0].returnValues[0].bcs;

		return VecSet(bcs.u128()).parse(new Uint8Array(order_ids)).contents;
	}

	async getOrder(poolKey: string, orderId: string): Promise<ReturnType<typeof Order.parse> | null> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);

		tx.add(this.#ctx.deepBook.getOrder(poolKey, orderId));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		try {
			const orderInformation = res.commandResults![0].returnValues[0].bcs;
			return Order.parse(new Uint8Array(orderInformation));
		} catch {
			return null;
		}
	}

	async getOrderNormalized(poolKey: string, orderId: string) {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.deepBook.getOrder(poolKey, orderId));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		try {
			const orderInformation = res.commandResults![0].returnValues[0].bcs;
			const orderInfo = Order.parse(new Uint8Array(orderInformation));

			if (!orderInfo) {
				return null;
			}
			const baseCoin = this.#ctx.config.getCoin(this.#ctx.config.getPool(poolKey).baseCoin);
			const quoteCoin = this.#ctx.config.getCoin(this.#ctx.config.getPool(poolKey).quoteCoin);

			const encodedOrderId = BigInt(orderInfo.order_id);
			const isBid = encodedOrderId >> 127n === 0n;
			const rawPrice = Number((encodedOrderId >> 64n) & ((1n << 63n) - 1n));
			const normalizedPrice = (rawPrice * baseCoin.scalar) / quoteCoin.scalar / FLOAT_SCALAR;

			const normalizedOrderInfo = {
				...orderInfo,
				quantity: String((Number(orderInfo.quantity) / baseCoin.scalar).toFixed(9)),
				filled_quantity: String((Number(orderInfo.filled_quantity) / baseCoin.scalar).toFixed(9)),
				order_deep_price: {
					...orderInfo.order_deep_price,
					deep_per_asset: String(
						(Number(orderInfo.order_deep_price.deep_per_asset) / DEEP_SCALAR).toFixed(9),
					),
				},
				isBid,
				normalized_price: normalizedPrice.toFixed(9),
			};
			return normalizedOrderInfo;
		} catch {
			return null;
		}
	}

	async getOrders(
		poolKey: string,
		orderIds: string[],
	): Promise<ReturnType<typeof Order.parse>[] | null> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);

		tx.add(this.#ctx.deepBook.getOrders(poolKey, orderIds));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		try {
			const orderInformation = res.commandResults![0].returnValues[0].bcs;
			return bcs.vector(Order).parse(new Uint8Array(orderInformation));
		} catch {
			return null;
		}
	}

	async getLevel2Range(
		poolKey: string,
		priceLow: number | bigint,
		priceHigh: number | bigint,
		isBid: boolean,
	): Promise<Level2Range> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
		const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

		tx.add(this.#ctx.deepBook.getLevel2Range(poolKey, priceLow, priceHigh, isBid));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const prices = res.commandResults![0].returnValues[0].bcs;
		const parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(prices));
		const quantities = res.commandResults![0].returnValues[1].bcs;
		const parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(quantities));

		return {
			prices: parsed_prices.map((price) =>
				Number(((Number(price) / FLOAT_SCALAR / quoteCoin.scalar) * baseCoin.scalar).toFixed(9)),
			),
			quantities: parsed_quantities.map((price) =>
				Number((Number(price) / baseCoin.scalar).toFixed(9)),
			),
		};
	}

	async getLevel2TicksFromMid(poolKey: string, ticks: number): Promise<Level2TicksFromMid> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pool = this.#ctx.config.getPool(poolKey);
		const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
		const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

		tx.add(this.#ctx.deepBook.getLevel2TicksFromMid(poolKey, ticks));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bid_prices = res.commandResults![0].returnValues[0].bcs;
		const bid_parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(bid_prices));
		const bid_quantities = res.commandResults![0].returnValues[1].bcs;
		const bid_parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(bid_quantities));

		const ask_prices = res.commandResults![0].returnValues[2].bcs;
		const ask_parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(ask_prices));
		const ask_quantities = res.commandResults![0].returnValues[3].bcs;
		const ask_parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(ask_quantities));

		return {
			bid_prices: bid_parsed_prices.map((price) =>
				Number(((Number(price) / FLOAT_SCALAR / quoteCoin.scalar) * baseCoin.scalar).toFixed(9)),
			),
			bid_quantities: bid_parsed_quantities.map((quantity) =>
				Number((Number(quantity) / baseCoin.scalar).toFixed(9)),
			),
			ask_prices: ask_parsed_prices.map((price) =>
				Number(((Number(price) / FLOAT_SCALAR / quoteCoin.scalar) * baseCoin.scalar).toFixed(9)),
			),
			ask_quantities: ask_parsed_quantities.map((quantity) =>
				Number((Number(quantity) / baseCoin.scalar).toFixed(9)),
			),
		};
	}

	async getAccountOrderDetails(
		poolKey: string,
		managerKey: string,
	): Promise<ReturnType<typeof Order.parse>[] | []> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.deepBook.getAccountOrderDetails(poolKey, managerKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		try {
			const orderInformation = res.commandResults![0].returnValues[0].bcs;
			return bcs.vector(Order).parse(new Uint8Array(orderInformation));
		} catch {
			return [];
		}
	}
}
