// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import type {
	BorrowedShares,
	MarginManagerAssets,
	MarginManagerBalancesResult,
	MarginManagerDebts,
	MarginManagerState,
} from '../types/index.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import { formatTokenAmount } from './context.js';
import type { QueryContext } from './context.js';

export class MarginManagerQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async getMarginManagerOwner(marginManagerKey: string): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.ownerByPoolKey(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return normalizeSuiAddress(bcs.Address.parse(bytes));
	}

	async getMarginManagerDeepbookPool(marginManagerKey: string): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.deepbookPool(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return normalizeSuiAddress(bcs.Address.parse(bytes));
	}

	async getMarginManagerMarginPoolId(marginManagerKey: string): Promise<string | null> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.marginPoolId(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		const option = bcs.option(bcs.Address).parse(bytes);
		return option ? normalizeSuiAddress(option) : null;
	}

	async getMarginManagerBorrowedShares(marginManagerKey: string): Promise<BorrowedShares> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.borrowedShares(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseBytes = res.commandResults![0].returnValues[0].bcs;
		const quoteBytes = res.commandResults![0].returnValues[1].bcs;
		const baseShares = bcs.U64.parse(baseBytes).toString();
		const quoteShares = bcs.U64.parse(quoteBytes).toString();

		return { baseShares, quoteShares };
	}

	async getMarginManagerBorrowedBaseShares(marginManagerKey: string): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.borrowedBaseShares(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.U64.parse(bytes).toString();
	}

	async getMarginManagerBorrowedQuoteShares(marginManagerKey: string): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.borrowedQuoteShares(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.U64.parse(bytes).toString();
	}

	async getMarginManagerHasBaseDebt(marginManagerKey: string): Promise<boolean> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.hasBaseDebt(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const bytes = res.commandResults![0].returnValues[0].bcs;
		return bcs.bool().parse(bytes);
	}

	async getMarginManagerBalanceManagerId(marginManagerAddress: string): Promise<string> {
		const res = await this.#ctx.client.core.getObject({
			objectId: marginManagerAddress,
			include: { content: true },
		});

		if (!res.object?.content) {
			throw new Error(`Margin manager not found: ${marginManagerAddress}`);
		}

		const MarginManagerBalanceManagerId = bcs.struct('MarginManagerBalanceManagerId', {
			id: bcs.Address,
			owner: bcs.Address,
			deepbook_pool: bcs.Address,
			margin_pool_id: bcs.option(bcs.Address),
			balance_manager_id: bcs.Address,
		});

		const parsed = MarginManagerBalanceManagerId.parse(res.object.content);
		return normalizeSuiAddress(parsed.balance_manager_id);
	}

	async getMarginManagerAssets(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<MarginManagerAssets> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.calculateAssets(manager.poolKey, manager.address));

		const res = await this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});

		const baseBytes = res.commandResults![0].returnValues[0].bcs;
		const quoteBytes = res.commandResults![0].returnValues[1].bcs;
		const pool = this.#ctx.config.getPool(manager.poolKey);
		const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
		const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

		const baseAsset = formatTokenAmount(
			BigInt(bcs.U64.parse(baseBytes)),
			baseCoin.scalar,
			decimals,
		);
		const quoteAsset = formatTokenAmount(
			BigInt(bcs.U64.parse(quoteBytes)),
			quoteCoin.scalar,
			decimals,
		);

		return { baseAsset, quoteAsset };
	}

	async getMarginManagerDebts(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<MarginManagerDebts> {
		const hasBaseDebt = await this.getMarginManagerHasBaseDebt(marginManagerKey);

		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const pool = this.#ctx.config.getPool(manager.poolKey);
		const debtCoinKey = hasBaseDebt ? pool.baseCoin : pool.quoteCoin;

		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.calculateDebts(manager.poolKey, debtCoinKey, manager.address));

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
			throw new Error(`Failed to get margin manager debts: ${'Unknown error'}`);
		}

		const baseBytes = res.commandResults[0].returnValues[0].bcs;
		const quoteBytes = res.commandResults[0].returnValues[1].bcs;
		const debtCoin = this.#ctx.config.getCoin(debtCoinKey);

		const baseDebt = formatTokenAmount(BigInt(bcs.U64.parse(baseBytes)), debtCoin.scalar, decimals);
		const quoteDebt = formatTokenAmount(
			BigInt(bcs.U64.parse(quoteBytes)),
			debtCoin.scalar,
			decimals,
		);

		return { baseDebt, quoteDebt };
	}

	async getMarginManagerState(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<MarginManagerState> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.managerState(manager.poolKey, manager.address));

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
			throw new Error(`Failed to get margin manager state: Unknown error`);
		}

		const pool = this.#ctx.config.getPool(manager.poolKey);
		const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
		const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

		const managerId = normalizeSuiAddress(
			bcs.Address.parse(res.commandResults[0].returnValues[0].bcs),
		);
		const deepbookPoolId = normalizeSuiAddress(
			bcs.Address.parse(res.commandResults[0].returnValues[1].bcs),
		);
		const riskRatio =
			Number(bcs.U64.parse(res.commandResults[0].returnValues[2].bcs)) / FLOAT_SCALAR;
		const baseAsset = formatTokenAmount(
			BigInt(bcs.U64.parse(res.commandResults[0].returnValues[3].bcs)),
			baseCoin.scalar,
			decimals,
		);
		const quoteAsset = formatTokenAmount(
			BigInt(bcs.U64.parse(res.commandResults[0].returnValues[4].bcs)),
			quoteCoin.scalar,
			decimals,
		);
		const baseDebt = formatTokenAmount(
			BigInt(bcs.U64.parse(res.commandResults[0].returnValues[5].bcs)),
			baseCoin.scalar,
			decimals,
		);
		const quoteDebt = formatTokenAmount(
			BigInt(bcs.U64.parse(res.commandResults[0].returnValues[6].bcs)),
			quoteCoin.scalar,
			decimals,
		);
		const basePythPrice = bcs.U64.parse(res.commandResults[0].returnValues[7].bcs);
		const basePythDecimals = Number(
			bcs.u8().parse(new Uint8Array(res.commandResults[0].returnValues[8].bcs)),
		);
		const quotePythPrice = bcs.U64.parse(res.commandResults[0].returnValues[9].bcs);
		const quotePythDecimals = Number(
			bcs.u8().parse(new Uint8Array(res.commandResults[0].returnValues[10].bcs)),
		);
		const currentPrice = BigInt(bcs.U64.parse(res.commandResults[0].returnValues[11].bcs));
		const lowestTriggerAbovePrice = BigInt(
			bcs.U64.parse(res.commandResults[0].returnValues[12].bcs),
		);
		const highestTriggerBelowPrice = BigInt(
			bcs.U64.parse(res.commandResults[0].returnValues[13].bcs),
		);

		return {
			managerId,
			deepbookPoolId,
			riskRatio,
			baseAsset,
			quoteAsset,
			baseDebt,
			quoteDebt,
			basePythPrice: basePythPrice.toString(),
			basePythDecimals,
			quotePythPrice: quotePythPrice.toString(),
			quotePythDecimals,
			currentPrice,
			lowestTriggerAbovePrice,
			highestTriggerBelowPrice,
		};
	}

	async getMarginManagerStates(
		marginManagers: Record<string, string>,
		decimals: number = 6,
	): Promise<Record<string, MarginManagerState>> {
		const entries = Object.entries(marginManagers);
		if (entries.length === 0) {
			return {};
		}

		const tx = new Transaction();

		for (const [managerId, poolKey] of entries) {
			tx.add(this.#ctx.marginManager.managerState(poolKey, managerId));
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
			throw new Error(`Failed to get margin manager states: Unknown error`);
		}

		const results: Record<string, MarginManagerState> = {};

		for (let i = 0; i < entries.length; i++) {
			const commandResult = res.commandResults[i];
			if (!commandResult || !commandResult.returnValues) {
				throw new Error(`Failed to get margin manager state for index ${i}: No return values`);
			}

			const [, poolKey] = entries[i];
			const pool = this.#ctx.config.getPool(poolKey);
			const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
			const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

			const managerId = normalizeSuiAddress(bcs.Address.parse(commandResult.returnValues[0].bcs));
			const deepbookPoolId = normalizeSuiAddress(
				bcs.Address.parse(commandResult.returnValues[1].bcs),
			);
			const riskRatio = Number(bcs.U64.parse(commandResult.returnValues[2].bcs)) / FLOAT_SCALAR;
			const baseAsset = formatTokenAmount(
				BigInt(bcs.U64.parse(commandResult.returnValues[3].bcs)),
				baseCoin.scalar,
				decimals,
			);
			const quoteAsset = formatTokenAmount(
				BigInt(bcs.U64.parse(commandResult.returnValues[4].bcs)),
				quoteCoin.scalar,
				decimals,
			);
			const baseDebt = formatTokenAmount(
				BigInt(bcs.U64.parse(commandResult.returnValues[5].bcs)),
				baseCoin.scalar,
				decimals,
			);
			const quoteDebt = formatTokenAmount(
				BigInt(bcs.U64.parse(commandResult.returnValues[6].bcs)),
				quoteCoin.scalar,
				decimals,
			);
			const basePythPrice = bcs.U64.parse(commandResult.returnValues[7].bcs);
			const basePythDecimals = Number(
				bcs.u8().parse(new Uint8Array(commandResult.returnValues[8].bcs)),
			);
			const quotePythPrice = bcs.U64.parse(commandResult.returnValues[9].bcs);
			const quotePythDecimals = Number(
				bcs.u8().parse(new Uint8Array(commandResult.returnValues[10].bcs)),
			);
			const currentPrice = BigInt(bcs.U64.parse(commandResult.returnValues[11].bcs));
			const lowestTriggerAbovePrice = BigInt(bcs.U64.parse(commandResult.returnValues[12].bcs));
			const highestTriggerBelowPrice = BigInt(bcs.U64.parse(commandResult.returnValues[13].bcs));

			results[managerId] = {
				managerId,
				deepbookPoolId,
				riskRatio,
				baseAsset,
				quoteAsset,
				baseDebt,
				quoteDebt,
				basePythPrice: basePythPrice.toString(),
				basePythDecimals,
				quotePythPrice: quotePythPrice.toString(),
				quotePythDecimals,
				currentPrice,
				lowestTriggerAbovePrice,
				highestTriggerBelowPrice,
			};
		}

		return results;
	}

	async getMarginManagerBaseBalance(
		marginManagerKey: string,
		decimals: number = 9,
	): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.baseBalance(manager.poolKey, manager.address));

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
			throw new Error(`Failed to get margin manager base balance: Unknown error`);
		}

		const bytes = res.commandResults[0].returnValues[0].bcs;
		const pool = this.#ctx.config.getPool(manager.poolKey);
		const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);

		return formatTokenAmount(BigInt(bcs.U64.parse(bytes)), baseCoin.scalar, decimals);
	}

	async getMarginManagerQuoteBalance(
		marginManagerKey: string,
		decimals: number = 9,
	): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.quoteBalance(manager.poolKey, manager.address));

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
			throw new Error(`Failed to get margin manager quote balance: Unknown error`);
		}

		const bytes = res.commandResults[0].returnValues[0].bcs;
		const pool = this.#ctx.config.getPool(manager.poolKey);
		const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

		return formatTokenAmount(BigInt(bcs.U64.parse(bytes)), quoteCoin.scalar, decimals);
	}

	async getMarginManagerDeepBalance(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<string> {
		const manager = this.#ctx.config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.#ctx.marginManager.deepBalance(manager.poolKey, manager.address));

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
			throw new Error(`Failed to get margin manager DEEP balance: Unknown error`);
		}

		const bytes = res.commandResults[0].returnValues[0].bcs;
		const deepCoin = this.#ctx.config.getCoin('DEEP');

		return formatTokenAmount(BigInt(bcs.U64.parse(bytes)), deepCoin.scalar, decimals);
	}

	async getMarginManagerBalances(
		marginManagers: Record<string, string>,
		decimals: number = 9,
	): Promise<Record<string, MarginManagerBalancesResult>> {
		const entries = Object.entries(marginManagers);
		if (entries.length === 0) {
			return {};
		}

		const tx = new Transaction();

		for (const [managerId, poolKey] of entries) {
			tx.add(this.#ctx.marginManager.baseBalance(poolKey, managerId));
			tx.add(this.#ctx.marginManager.quoteBalance(poolKey, managerId));
			tx.add(this.#ctx.marginManager.deepBalance(poolKey, managerId));
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
			throw new Error('Failed to get margin manager balances: No command results');
		}

		const results: Record<string, MarginManagerBalancesResult> = {};
		const deepCoin = this.#ctx.config.getCoin('DEEP');

		for (let i = 0; i < entries.length; i++) {
			const [managerId, poolKey] = entries[i];
			const pool = this.#ctx.config.getPool(poolKey);
			const baseCoin = this.#ctx.config.getCoin(pool.baseCoin);
			const quoteCoin = this.#ctx.config.getCoin(pool.quoteCoin);

			const baseResult = res.commandResults[i * 3];
			const quoteResult = res.commandResults[i * 3 + 1];
			const deepResult = res.commandResults[i * 3 + 2];

			if (!baseResult?.returnValues || !quoteResult?.returnValues || !deepResult?.returnValues) {
				throw new Error(`Failed to get balances for margin manager ${managerId}: No return values`);
			}

			results[managerId] = {
				base: formatTokenAmount(
					BigInt(bcs.U64.parse(baseResult.returnValues[0].bcs)),
					baseCoin.scalar,
					decimals,
				),
				quote: formatTokenAmount(
					BigInt(bcs.U64.parse(quoteResult.returnValues[0].bcs)),
					quoteCoin.scalar,
					decimals,
				),
				deep: formatTokenAmount(
					BigInt(bcs.U64.parse(deepResult.returnValues[0].bcs)),
					deepCoin.scalar,
					decimals,
				),
			};
		}

		return results;
	}
}
