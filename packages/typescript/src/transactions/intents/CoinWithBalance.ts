// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferInput } from 'valibot';
import { bigint, object, parse, string } from 'valibot';

import { bcs } from '../../bcs/index.js';
import { normalizeStructTag } from '../../utils/sui-types.js';
import { Commands } from '../Commands.js';
import type { Argument } from '../data/internal.js';
import { Inputs } from '../Inputs.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { Transaction, TransactionResult } from '../Transaction.js';
import type { TransactionDataBuilder } from '../TransactionData.js';
import type { ClientWithCoreApi, SuiClientTypes } from '../../client/index.js';

const COIN_WITH_BALANCE = 'CoinWithBalance';
const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');

export function coinWithBalance({
	type = SUI_TYPE,
	balance,
	useGasCoin = true,
}: {
	balance: bigint | number;
	type?: string;
	useGasCoin?: boolean;
}): (tx: Transaction) => TransactionResult {
	let coinResult: TransactionResult | null = null;

	return (tx: Transaction) => {
		if (coinResult) {
			return coinResult;
		}

		tx.addIntentResolver(COIN_WITH_BALANCE, resolveCoinBalance);
		const coinType = type === 'gas' ? type : normalizeStructTag(type);

		coinResult = tx.add(
			Commands.Intent({
				name: COIN_WITH_BALANCE,
				inputs: {},
				data: {
					type: coinType === SUI_TYPE && useGasCoin ? 'gas' : coinType,
					balance: BigInt(balance),
				} satisfies InferInput<typeof CoinWithBalanceData>,
			}),
		);

		return coinResult;
	};
}

const CoinWithBalanceData = object({
	type: string(),
	balance: bigint(),
});

async function resolveCoinBalance(
	transactionData: TransactionDataBuilder,
	buildOptions: BuildTransactionOptions,
	next: () => Promise<void>,
) {
	const coinTypes = new Set<string>();
	const totalByType = new Map<string, bigint>();

	if (!transactionData.sender) {
		throw new Error('Sender must be set to resolve CoinWithBalance');
	}

	for (const command of transactionData.commands) {
		if (command.$kind === '$Intent' && command.$Intent.name === COIN_WITH_BALANCE) {
			const { type, balance } = parse(CoinWithBalanceData, command.$Intent.data);

			if (type !== 'gas' && balance > 0n) {
				coinTypes.add(type);
			}

			totalByType.set(type, (totalByType.get(type) ?? 0n) + balance);
		}
	}
	const usedIds = new Set<string>();

	for (const input of transactionData.inputs) {
		if (input.Object?.ImmOrOwnedObject) {
			usedIds.add(input.Object.ImmOrOwnedObject.objectId);
		}
		if (input.UnresolvedObject?.objectId) {
			usedIds.add(input.UnresolvedObject.objectId);
		}
	}

	const coinsByType = new Map<string, SuiClientTypes.CoinResponse[]>();
	const client = buildOptions.client;

	if (!client) {
		throw new Error(
			'Client must be provided to build or serialize transactions with CoinWithBalance intents',
		);
	}

	await Promise.all(
		[...coinTypes].map(async (coinType) => {
			coinsByType.set(
				coinType,
				await getCoinsOfType({
					coinType,
					balance: totalByType.get(coinType)!,
					client,
					owner: transactionData.sender!,
					usedIds,
				}),
			);
		}),
	);

	const mergedCoins = new Map<string, Argument>();

	mergedCoins.set('gas', { $kind: 'GasCoin', GasCoin: true });

	for (const [index, transaction] of transactionData.commands.entries()) {
		if (transaction.$kind !== '$Intent' || transaction.$Intent.name !== COIN_WITH_BALANCE) {
			continue;
		}

		const { type, balance } = transaction.$Intent.data as {
			type: string;
			balance: bigint;
		};

		if (balance === 0n && type !== 'gas') {
			transactionData.replaceCommand(
				index,
				Commands.MoveCall({ target: '0x2::coin::zero', typeArguments: [type] }),
			);
			continue;
		}

		const commands = [];

		if (!mergedCoins.has(type)) {
			const [first, ...rest] = coinsByType.get(type)!.map((coin) =>
				transactionData.addInput(
					'object',
					Inputs.ObjectRef({
						objectId: coin.objectId,
						digest: coin.digest,
						version: coin.version,
					}),
				),
			);

			if (rest.length > 0) {
				commands.push(Commands.MergeCoins(first, rest));
			}

			mergedCoins.set(type, first);
		}

		commands.push(
			Commands.SplitCoins(mergedCoins.get(type)!, [
				transactionData.addInput('pure', Inputs.Pure(bcs.u64().serialize(balance))),
			]),
		);

		transactionData.replaceCommand(index, commands);

		transactionData.mapArguments((arg) => {
			if (arg.$kind === 'Result' && arg.Result === index) {
				return {
					$kind: 'NestedResult',
					NestedResult: [index + commands.length - 1, 0],
				};
			}

			return arg;
		});
	}

	return next();
}

async function getCoinsOfType({
	coinType,
	balance,
	client,
	owner,
	usedIds,
}: {
	coinType: string;
	balance: bigint;
	client: ClientWithCoreApi;
	owner: string;
	usedIds: Set<string>;
}): Promise<SuiClientTypes.CoinResponse[]> {
	let remainingBalance = balance;
	const coins: SuiClientTypes.CoinResponse[] = [];

	return loadMoreCoins();

	async function loadMoreCoins(
		cursor: string | null = null,
	): Promise<SuiClientTypes.CoinResponse[]> {
		const {
			objects,
			hasNextPage,
			cursor: nextCursor,
		} = await client.core.listCoins({
			owner,
			coinType,
			cursor,
		});

		for (const coin of objects) {
			if (usedIds.has(coin.objectId)) {
				continue;
			}

			const coinBalance = BigInt(coin.balance);

			coins.push(coin);
			remainingBalance -= coinBalance;

			if (remainingBalance <= 0) {
				return coins;
			}
		}

		if (hasNextPage) {
			return loadMoreCoins(nextCursor);
		}

		throw new Error(`Not enough coins of type ${coinType} to satisfy requested balance`);
	}
}
