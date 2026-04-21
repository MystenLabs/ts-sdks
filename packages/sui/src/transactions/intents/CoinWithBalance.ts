// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferInput } from 'valibot';
import { bigint, object, optional, parse, picklist, string } from 'valibot';

import { bcs } from '../../bcs/index.js';
import { normalizeStructTag } from '../../utils/sui-types.js';
import { TransactionCommands } from '../Commands.js';
import type { Argument } from '../data/internal.js';
import { Inputs } from '../Inputs.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { Transaction, TransactionResult } from '../Transaction.js';
import type { TransactionDataBuilder } from '../TransactionData.js';
import type { ClientWithCoreApi, SuiClientTypes } from '../../client/index.js';

export const COIN_WITH_BALANCE = 'CoinWithBalance';
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
			TransactionCommands.Intent({
				name: COIN_WITH_BALANCE,
				inputs: {},
				data: {
					type: coinType === SUI_TYPE && useGasCoin ? 'gas' : coinType,
					balance: BigInt(balance),
					outputKind: 'coin',
				} satisfies InferInput<typeof CoinWithBalanceData>,
			}),
		);

		return coinResult;
	};
}

export function createBalance({
	type = SUI_TYPE,
	balance,
	useGasCoin = true,
}: {
	balance: bigint | number;
	type?: string;
	useGasCoin?: boolean;
}): (tx: Transaction) => TransactionResult {
	let balanceResult: TransactionResult | null = null;

	return (tx: Transaction) => {
		if (balanceResult) {
			return balanceResult;
		}

		tx.addIntentResolver(COIN_WITH_BALANCE, resolveCoinBalance);
		const coinType = type === 'gas' ? type : normalizeStructTag(type);

		balanceResult = tx.add(
			TransactionCommands.Intent({
				name: COIN_WITH_BALANCE,
				inputs: {},
				data: {
					type: coinType === SUI_TYPE && useGasCoin ? 'gas' : coinType,
					balance: BigInt(balance),
					outputKind: 'balance',
				} satisfies InferInput<typeof CoinWithBalanceData>,
			}),
		);

		return balanceResult;
	};
}

const CoinWithBalanceData = object({
	type: string(),
	balance: bigint(),
	outputKind: optional(picklist(['coin', 'balance'])),
});

export async function resolveCoinBalance(
	transactionData: TransactionDataBuilder,
	buildOptions: BuildTransactionOptions,
	next: () => Promise<void>,
) {
	type IntentInfo = { balance: bigint; outputKind: 'coin' | 'balance' };

	const coinTypes = new Set<string>();
	const totalByType = new Map<string, bigint>();
	const intentsByType = new Map<string, IntentInfo[]>();

	if (!transactionData.sender) {
		throw new Error('Sender must be set to resolve CoinWithBalance');
	}

	// First pass: scan intents, collect per-type data, and resolve zero-balance intents in place.
	for (const [i, command] of transactionData.commands.entries()) {
		if (command.$kind !== '$Intent' || command.$Intent.name !== COIN_WITH_BALANCE) {
			continue;
		}

		const { type, balance, outputKind } = parse(CoinWithBalanceData, command.$Intent.data);

		// Zero-balance intents are resolved immediately — no coins or AB needed.
		// This is a 1:1 replacement so indices don't shift.
		if (balance === 0n) {
			const coinType = type === 'gas' ? SUI_TYPE : type;
			transactionData.replaceCommand(
				i,
				TransactionCommands.MoveCall({
					target: (outputKind ?? 'coin') === 'balance' ? '0x2::balance::zero' : '0x2::coin::zero',
					typeArguments: [coinType],
				}),
			);
			continue;
		}

		if (type !== 'gas') {
			coinTypes.add(type);
		}

		totalByType.set(type, (totalByType.get(type) ?? 0n) + balance);

		if (!intentsByType.has(type)) intentsByType.set(type, []);
		intentsByType.get(type)!.push({ balance, outputKind: outputKind ?? 'coin' });
	}

	if (totalByType.has('gas') && totalByType.has(SUI_TYPE)) {
		throw new Error(
			'Cannot mix SUI CoinWithBalance intents that use the gas coin with ones that do not (useGasCoin: false). Use one or the other.',
		);
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

	const coinsByType = new Map<string, SuiClientTypes.Coin[]>();
	const addressBalanceByType = new Map<string, bigint>();
	const client = buildOptions.client;

	if (!client) {
		throw new Error(
			'Client must be provided to build or serialize transactions with CoinWithBalance intents',
		);
	}

	await Promise.all([
		...[...coinTypes].map(async (coinType) => {
			const { coins, addressBalance } = await getCoinsAndBalanceOfType({
				coinType,
				balance: totalByType.get(coinType)!,
				client,
				owner: transactionData.sender!,
				usedIds,
			});

			coinsByType.set(coinType, coins);
			addressBalanceByType.set(coinType, addressBalance);
		}),
		totalByType.has('gas')
			? await client.core
					.getBalance({
						owner: transactionData.sender!,
						coinType: SUI_TYPE,
					})
					.then(({ balance }) => {
						addressBalanceByType.set('gas', BigInt(balance.addressBalance));
					})
			: null,
	]);

	const mergedCoins = new Map<string, Argument>();
	const exactBalanceByType = new Map<string, boolean>();
	const usedAddressBalance = new Set<string>();

	// Per-type state for Path 2 combined splits
	type TypeState = { results: Argument[]; nextIntent: number };
	const typeState = new Map<string, TypeState>();

	let index = 0;
	while (index < transactionData.commands.length) {
		const transaction = transactionData.commands[index];
		if (transaction.$kind !== '$Intent' || transaction.$Intent.name !== COIN_WITH_BALANCE) {
			index++;
			continue;
		}

		const { type, balance } = transaction.$Intent.data as {
			type: string;
			balance: bigint;
		};
		const coinType = type === 'gas' ? SUI_TYPE : type;
		const totalRequired = totalByType.get(type)!;
		const addressBalance = addressBalanceByType.get(type) ?? 0n;

		const commands = [];
		let intentResult: Argument;

		const intentsForType = intentsByType.get(type) ?? [];
		const allBalance = intentsForType.every((i) => i.outputKind === 'balance');

		if (allBalance && addressBalance >= totalRequired) {
			// Path 1: All balance intents and AB sufficient — direct per-intent withdrawal.
			// No coins touched, enables parallel execution.
			commands.push(
				TransactionCommands.MoveCall({
					target: '0x2::balance::redeem_funds',
					typeArguments: [coinType],
					arguments: [
						transactionData.addInput(
							'withdrawal',
							Inputs.FundsWithdrawal({
								reservation: {
									$kind: 'MaxAmountU64',
									MaxAmountU64: String(balance),
								},
								typeArg: { $kind: 'Balance', Balance: coinType },
								withdrawFrom: { $kind: 'Sender', Sender: true },
							}),
						),
					],
				}),
			);

			intentResult = {
				$kind: 'NestedResult',
				NestedResult: [index + commands.length - 1, 0],
			};
		} else {
			// Path 2: Merge and Split — build a merged coin, split all intents at once.

			if (!typeState.has(type)) {
				const intents = intentsForType;

				// Step 1: Build sources and merge
				const sources: Argument[] = [];

				if (addressBalance >= totalRequired) {
					// AB sufficient — source entirely from address balance, no coins needed.
					usedAddressBalance.add(type);

					commands.push(
						TransactionCommands.MoveCall({
							target: '0x2::coin::redeem_funds',
							typeArguments: [coinType],
							arguments: [
								transactionData.addInput(
									'withdrawal',
									Inputs.FundsWithdrawal({
										reservation: {
											$kind: 'MaxAmountU64',
											MaxAmountU64: String(totalRequired),
										},
										typeArg: { $kind: 'Balance', Balance: coinType },
										withdrawFrom: { $kind: 'Sender', Sender: true },
									}),
								),
							],
						}),
					);
					sources.push({ $kind: 'Result', Result: index + commands.length - 1 });
				} else if (type === 'gas') {
					sources.push({ $kind: 'GasCoin', GasCoin: true });
				} else {
					const coins = coinsByType.get(type)!;
					const loadedCoinBalance = coins.reduce((sum, c) => sum + BigInt(c.balance), 0n);
					const abNeeded =
						totalRequired > loadedCoinBalance ? totalRequired - loadedCoinBalance : 0n;

					exactBalanceByType.set(type, loadedCoinBalance + abNeeded === totalRequired);

					for (const coin of coins) {
						sources.push(
							transactionData.addInput(
								'object',
								Inputs.ObjectRef({
									objectId: coin.objectId,
									digest: coin.digest,
									version: coin.version,
								}),
							),
						);
					}

					if (abNeeded > 0n) {
						usedAddressBalance.add(type);
						commands.push(
							TransactionCommands.MoveCall({
								target: '0x2::coin::redeem_funds',
								typeArguments: [coinType],
								arguments: [
									transactionData.addInput(
										'withdrawal',
										Inputs.FundsWithdrawal({
											reservation: {
												$kind: 'MaxAmountU64',
												MaxAmountU64: String(abNeeded),
											},
											typeArg: { $kind: 'Balance', Balance: coinType },
											withdrawFrom: { $kind: 'Sender', Sender: true },
										}),
									),
								],
							}),
						);
						sources.push({ $kind: 'Result', Result: index + commands.length - 1 });
					}
				}

				const baseCoin = sources[0];
				const rest = sources.slice(1);
				for (let i = 0; i < rest.length; i += 500) {
					commands.push(TransactionCommands.MergeCoins(baseCoin, rest.slice(i, i + 500)));
				}

				mergedCoins.set(type, baseCoin);

				// Step 2: Combined SplitCoins for all intents of this type
				const splitCmdIndex = index + commands.length;
				commands.push(
					TransactionCommands.SplitCoins(
						baseCoin,
						intents.map((i) =>
							transactionData.addInput('pure', Inputs.Pure(bcs.u64().serialize(i.balance))),
						),
					),
				);

				// Build per-intent results, adding into_balance conversions for balance intents
				const results: Argument[] = [];
				for (let i = 0; i < intents.length; i++) {
					const splitResult: Argument = {
						$kind: 'NestedResult',
						NestedResult: [splitCmdIndex, i],
					};

					if (intents[i].outputKind === 'balance') {
						commands.push(
							TransactionCommands.MoveCall({
								target: '0x2::coin::into_balance',
								typeArguments: [coinType],
								arguments: [splitResult],
							}),
						);
						results.push({
							$kind: 'NestedResult',
							NestedResult: [index + commands.length - 1, 0],
						});
					} else {
						results.push(splitResult);
					}
				}

				typeState.set(type, { results, nextIntent: 0 });
			}

			const state = typeState.get(type)!;
			intentResult = state.results[state.nextIntent++];
		}

		transactionData.replaceCommand(
			index,
			commands,
			intentResult as { NestedResult: [number, number] },
		);

		// Advance past the replacement. When commands is empty (subsequent intents
		// of a combined split), the command was removed and the next command shifted
		// into this position — so we stay at the same index.
		index += commands.length;
	}

	// Step 3: Remainder handling
	for (const [type, mergedCoin] of mergedCoins) {
		// When gas type used GasCoin (not AB), leftover stays in the gas coin — no remainder needed.
		if (type === 'gas' && !usedAddressBalance.has(type)) continue;

		const coinType = type === 'gas' ? SUI_TYPE : type;
		const hasBalanceIntent = intentsByType.get(type)?.some((i) => i.outputKind === 'balance');
		const sourcedFromAB = usedAddressBalance.has(type);

		if (hasBalanceIntent || sourcedFromAB) {
			// Sourced from AB or balance intents exist: send remainder back to sender's address balance.
			// coin::send_funds is gasless-eligible and handles zero amounts.
			transactionData.commands.push(
				TransactionCommands.MoveCall({
					target: '0x2::coin::send_funds',
					typeArguments: [coinType],
					arguments: [
						mergedCoin,
						transactionData.addInput(
							'pure',
							Inputs.Pure(bcs.Address.serialize(transactionData.sender!)),
						),
					],
				}),
			);
		} else if (exactBalanceByType.get(type)) {
			// Coin-only with exact match: destroy the zero-value dust coin.
			transactionData.commands.push(
				TransactionCommands.MoveCall({
					target: '0x2::coin::destroy_zero',
					typeArguments: [coinType],
					arguments: [mergedCoin],
				}),
			);
		}
		// Coin-only with surplus: merged coin stays with sender as an owned object
	}

	return next();
}

async function getCoinsAndBalanceOfType({
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
}): Promise<{
	coins: SuiClientTypes.Coin[];
	balance: bigint;
	addressBalance: bigint;
	coinBalance: bigint;
}> {
	let remainingBalance = balance;
	const coins: SuiClientTypes.Coin[] = [];
	const balanceRequest = client.core.getBalance({ owner, coinType }).then(({ balance }) => {
		remainingBalance -= BigInt(balance.addressBalance);

		return balance;
	});

	const [allCoins, balanceResponse] = await Promise.all([loadMoreCoins(), balanceRequest]);

	if (BigInt(balanceResponse.balance) < balance) {
		throw new Error(
			`Insufficient balance of ${coinType} for owner ${owner}. Required: ${balance}, Available: ${
				balance - remainingBalance
			}`,
		);
	}

	return {
		coins: allCoins,
		balance: BigInt(balanceResponse.coinBalance),
		addressBalance: BigInt(balanceResponse.addressBalance),
		coinBalance: BigInt(balanceResponse.coinBalance),
	};

	async function loadMoreCoins(cursor: string | null = null): Promise<SuiClientTypes.Coin[]> {
		const {
			objects,
			hasNextPage,
			cursor: nextCursor,
		} = await client.core.listCoins({
			owner,
			coinType,
			cursor,
		});

		await balanceRequest;

		// Always load all coins from the page (except already-used ones).
		// This merges all available coins rather than leaving dust.
		for (const coin of objects) {
			if (usedIds.has(coin.objectId)) {
				continue;
			}

			coins.push(coin);
			remainingBalance -= BigInt(coin.balance);
		}

		// Only paginate if loaded coins + AB are still insufficient
		if (remainingBalance > 0n && hasNextPage) {
			return loadMoreCoins(nextCursor);
		}

		return coins;
	}
}
