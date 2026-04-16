// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import type { ManagerBalance } from '../types/index.js';
import type { QueryContext } from './context.js';

export class BalanceManagerQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async checkManagerBalance(managerKey: string, coinKey: string): Promise<ManagerBalance> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const coin = this.#ctx.config.getCoin(coinKey);

		tx.add(this.#ctx.balanceManager.checkManagerBalance(managerKey, coinKey));
		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const parsed_balance = bcs.U64.parse(bytes);
		const balanceNumber = Number(parsed_balance);
		const adjusted_balance = balanceNumber / coin.scalar;

		return {
			coinType: coin.type,
			balance: Number(adjusted_balance.toFixed(9)),
		};
	}

	async checkManagerBalanceWithAddress(
		managerAddress: string,
		coinKey: string,
	): Promise<ManagerBalance> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const coin = this.#ctx.config.getCoin(coinKey);

		tx.moveCall({
			target: `${this.#ctx.config.DEEPBOOK_PACKAGE_ID}::balance_manager::balance`,
			arguments: [tx.object(managerAddress)],
			typeArguments: [coin.type],
		});

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const parsed_balance = bcs.U64.parse(bytes);
		const balanceNumber = Number(parsed_balance);
		const adjusted_balance = balanceNumber / coin.scalar;

		return {
			coinType: coin.type,
			balance: Number(adjusted_balance.toFixed(9)),
		};
	}

	async checkManagerBalancesWithAddress(
		managerAddresses: string[],
		coinKeys: string[],
	): Promise<Record<string, Record<string, number>>> {
		if (managerAddresses.length === 0 || coinKeys.length === 0) {
			return {};
		}

		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const coins = coinKeys.map((coinKey) => this.#ctx.config.getCoin(coinKey));

		for (const managerAddress of managerAddresses) {
			for (const coin of coins) {
				tx.moveCall({
					target: `${this.#ctx.config.DEEPBOOK_PACKAGE_ID}::balance_manager::balance`,
					arguments: [tx.object(managerAddress)],
					typeArguments: [coin.type],
				});
			}
		}

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		if (res.FailedTransaction) {
			throw new Error(
				`Transaction failed: ${res.FailedTransaction.status.error?.message || 'Unknown error'}`,
			);
		}

		if (!res.commandResults) {
			throw new Error('Failed to get manager balances: No command results');
		}

		const results: Record<string, Record<string, number>> = {};

		for (let m = 0; m < managerAddresses.length; m++) {
			const managerAddress = managerAddresses[m];
			const managerBalances: Record<string, number> = {};

			for (let c = 0; c < coins.length; c++) {
				const coin = coins[c];
				const commandResult = res.commandResults[m * coins.length + c];

				if (!commandResult || !commandResult.returnValues) {
					throw new Error(`Failed to get balance for ${coin.type}: No return values`);
				}

				const bytes = commandResult.returnValues[0].bcs;
				const parsed_balance = bcs.U64.parse(bytes);
				managerBalances[coin.type] = Number((Number(parsed_balance) / coin.scalar).toFixed(9));
			}

			results[managerAddress] = managerBalances;
		}

		return results;
	}

	async getBalanceManagerIds(owner: string): Promise<string[]> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.deepBook.getBalanceManagerIds(owner));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const vecOfAddresses = bcs.vector(bcs.Address).parse(bytes);

		return vecOfAddresses.map((id: string) => normalizeSuiAddress(id));
	}

	async accountExists(poolKey: string, managerKey: string): Promise<boolean> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(this.#ctx.deepBook.accountExists(poolKey, managerKey));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.bool().parse(bytes);
	}
}
