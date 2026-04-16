// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { VecSet } from '../types/bcs.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import type { QueryContext } from './context.js';

export class RegistryQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async isPoolEnabledForMargin(poolKey: string): Promise<boolean> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.poolEnabled(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.Bool.parse(bytes);
	}

	async getMarginManagerIdsForOwner(owner: string): Promise<string[]> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.getMarginManagerIds(owner));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const vecSet = VecSet(bcs.Address).parse(bytes);
		return vecSet.contents.map((id) => normalizeSuiAddress(id));
	}

	async getBaseMarginPoolId(poolKey: string): Promise<string> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.baseMarginPoolId(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const id = bcs.Address.parse(bytes);
		return '0x' + id;
	}

	async getQuoteMarginPoolId(poolKey: string): Promise<string> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.quoteMarginPoolId(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const id = bcs.Address.parse(bytes);
		return '0x' + id;
	}

	async getMinWithdrawRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.minWithdrawRiskRatio(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const ratio = Number(bcs.U64.parse(bytes));
		return ratio / FLOAT_SCALAR;
	}

	async getMinBorrowRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.minBorrowRiskRatio(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const ratio = Number(bcs.U64.parse(bytes));
		return ratio / FLOAT_SCALAR;
	}

	async getLiquidationRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.liquidationRiskRatio(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const ratio = Number(bcs.U64.parse(bytes));
		return ratio / FLOAT_SCALAR;
	}

	async getTargetLiquidationRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.targetLiquidationRiskRatio(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const ratio = Number(bcs.U64.parse(bytes));
		return ratio / FLOAT_SCALAR;
	}

	async getUserLiquidationReward(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.userLiquidationReward(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const reward = Number(bcs.U64.parse(bytes));
		return reward / FLOAT_SCALAR;
	}

	async getPoolLiquidationReward(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.poolLiquidationReward(poolKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const reward = Number(bcs.U64.parse(bytes));
		return reward / FLOAT_SCALAR;
	}

	async getAllowedMaintainers(): Promise<string[]> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.allowedMaintainers());

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const vecSet = VecSet(bcs.Address).parse(bytes);
		return vecSet.contents.map((id) => normalizeSuiAddress(id));
	}

	async getAllowedPauseCaps(): Promise<string[]> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.marginRegistry.allowedPauseCaps());

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const vecSet = VecSet(bcs.Address).parse(bytes);
		return vecSet.contents.map((id) => normalizeSuiAddress(id));
	}
}
