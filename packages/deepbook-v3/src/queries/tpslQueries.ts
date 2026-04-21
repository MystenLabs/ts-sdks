// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

import type { QueryContext } from './context.js';

export class TPSLQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async getConditionalOrderIds(marginManagerKey: string): Promise<string[]> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginTPSL.conditionalOrderIds(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		if (res.FailedTransaction) {
			throw new Error(
				`Transaction failed: ${res.FailedTransaction.status.error?.message || 'Unknown error'}`,
			);
		}

		if (!res.commandResults || !res.commandResults[0] || !res.commandResults[0].returnValues) {
			throw new Error(`Failed to get conditional order IDs: Unknown error`);
		}

		const bytes = res.commandResults[0].returnValues[0].bcs;
		const orderIds = bcs.vector(bcs.u64()).parse(bytes);
		return orderIds.map((id) => id.toString());
	}

	async getLowestTriggerAbovePrice(marginManagerKey: string): Promise<bigint> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginTPSL.lowestTriggerAbovePrice(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		if (res.FailedTransaction) {
			throw new Error(
				`Transaction failed: ${res.FailedTransaction.status.error?.message || 'Unknown error'}`,
			);
		}

		if (!res.commandResults || !res.commandResults[0] || !res.commandResults[0].returnValues) {
			throw new Error(`Failed to get lowest trigger above price: Unknown error`);
		}

		const bytes = res.commandResults[0].returnValues[0].bcs;
		return BigInt(bcs.U64.parse(bytes));
	}

	async getHighestTriggerBelowPrice(marginManagerKey: string): Promise<bigint> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginTPSL.highestTriggerBelowPrice(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		if (res.FailedTransaction) {
			throw new Error(
				`Transaction failed: ${res.FailedTransaction.status.error?.message || 'Unknown error'}`,
			);
		}

		if (!res.commandResults || !res.commandResults[0] || !res.commandResults[0].returnValues) {
			throw new Error(`Failed to get highest trigger below price: Unknown error`);
		}

		const bytes = res.commandResults[0].returnValues[0].bcs;
		return BigInt(bcs.U64.parse(bytes));
	}
}
