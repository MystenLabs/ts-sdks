// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress, normalizeStructTag } from '@mysten/sui/utils';
import type { TransactionAnalysisIssue } from '../analyzer.js';
import { createAnalyzer } from '../analyzer.js';
import { bcs } from '@mysten/sui/bcs';
import { commands } from './commands.js';
import type { AnalyzedCommand, AnalyzedCommandArgument } from './commands.js';
import { data } from './core.js';
import { inputs } from './inputs.js';
import { coins, gasCoins } from './coins.js';

export interface CoinFlow {
	coinType: string;
	amount: bigint;
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

export const coinFlows = createAnalyzer({
	dependencies: { data, commands, inputs, coins, gasCoins },
	analyze:
		() =>
		async ({ data, commands, inputs, coins, gasCoins }) => {
			const getTrackedCoin = (ref: AnalyzedCommandArgument): TrackedCoin | null => {
				switch (ref.$kind) {
					case 'GasCoin':
						return trackedCoins.get('gas') ?? null;
					case 'Object':
						return trackedCoins.get(`input:${ref.index}`) ?? null;
					case 'Result':
						return trackedCoins.get(`result:${ref.index[0]},${ref.index[1]}`) ?? null;
					case 'Unknown':
					case 'Pure':
					case 'Withdrawal':
						return null;
				}
			};

			const splitCoin = (command: Extract<AnalyzedCommand, { $kind: 'SplitCoins' }>) => {
				const coin = getTrackedCoin(command.coin);

				if (!coin) {
					return;
				}
				// If any amounts are dynamic we need to assume the coin is fully consumed
				if (!command.amounts.every((a) => a.$kind === 'Pure')) {
					coin.consume();
					return;
				}

				const amounts = command.amounts.map((a) => {
					if (a.$kind !== 'Pure') {
						throw new Error('Expected pure value');
					}
					return BigInt(bcs.u64().fromBase64(a.bytes));
				});

				coin.remainingBalance -= amounts.reduce((a, b) => a + b, 0n);

				amounts.forEach((amount, i) => {
					trackedCoins.set(
						`result:${command.index},${i}`,
						new TrackedCoin(coin.coinType, amount, false),
					);
				});
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const sources = command.sources.map(getTrackedCoin);
				const amount = sources.reduce((a, c) => a + (c?.remainingBalance ?? 0n), 0n);

				for (const src of sources) {
					src?.consume();
				}

				const dest = getTrackedCoin(command.destination);

				if (!dest) {
					return;
				}

				dest.remainingBalance += amount;
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				const address =
					command.address.$kind === 'Pure' ? bcs.Address.fromBase64(command.address.bytes) : null;

				for (const obj of command.objects) {
					const tracked = getTrackedCoin(obj);

					if (tracked && address && data.sender === address) {
						addReturned(tracked.coinType, tracked.remainingBalance);
					}

					tracked?.consume();
				}
			};

			const addReturned = (coinType: string, amount: bigint) => {
				returnedByType.set(coinType, (returnedByType.get(coinType) ?? 0n) + amount);
			};

			/** Get the coin type from a MoveCall's first type argument, normalized. */
			const getCoinTypeFromTypeArgs = (
				command: Extract<AnalyzedCommand, { $kind: 'MoveCall' }>,
			): string | null => {
				const typeArg = command.command.typeArguments?.[0];
				return typeArg ? normalizeStructTag(typeArg) : null;
			};

			/**
			 * Handle framework MoveCall commands from 0x2::coin and 0x2::balance.
			 * Returns true if the command was handled, false to fall through to generic consume.
			 */
			const handleFrameworkMoveCall = (
				command: Extract<AnalyzedCommand, { $kind: 'MoveCall' }>,
			): boolean => {
				const pkg = normalizeSuiAddress(command.command.package);
				if (pkg !== SUI_FRAMEWORK) return false;

				const mod = command.command.module;
				const fn = command.command.function;
				const coinType = getCoinTypeFromTypeArgs(command);

				// --- Address balance operations ---

				if (fn === 'redeem_funds' && (mod === 'balance' || mod === 'coin')) {
					// balance::redeem_funds(Withdrawal) -> Balance<T>
					// coin::redeem_funds(Withdrawal, &mut TxContext) -> Coin<T>
					const arg = command.arguments[0];
					if (arg.$kind === 'Withdrawal') {
						const owned = arg.withdrawFrom === 'Sender';
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(arg.coinType, arg.amount, owned),
						);
					}
					return true;
				}

				if (fn === 'send_funds' && (mod === 'coin' || mod === 'balance')) {
					// coin::send_funds(Coin<T>, address)
					// balance::send_funds(Balance<T>, address)
					const tracked = getTrackedCoin(command.arguments[0]);
					const addrArg = command.arguments[1];
					const address = addrArg?.$kind === 'Pure' ? bcs.Address.fromBase64(addrArg.bytes) : null;

					if (tracked && address && data.sender === address) {
						addReturned(tracked.coinType, tracked.remainingBalance);
					}
					tracked?.consume();
					return true;
				}

				// --- Conversions ---

				if (
					(fn === 'into_balance' && mod === 'coin') ||
					(fn === 'from_balance' && mod === 'coin')
				) {
					// coin::into_balance(Coin<T>) -> Balance<T>
					// coin::from_balance(Balance<T>, &mut TxContext) -> Coin<T>
					const tracked = getTrackedCoin(command.arguments[0]);
					if (tracked) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(tracked.coinType, tracked.remainingBalance, false),
						);
						tracked.consume();
					}
					return true;
				}

				// --- Split operations ---

				if (
					(fn === 'split' && (mod === 'coin' || mod === 'balance')) ||
					(fn === 'take' && mod === 'coin')
				) {
					// coin::split(&mut Coin<T>, u64, &mut TxContext) -> Coin<T>
					// balance::split(&mut Balance<T>, u64) -> Balance<T>
					// coin::take(&mut Balance<T>, u64, &mut TxContext) -> Coin<T>
					const source = getTrackedCoin(command.arguments[0]);
					if (!source) return true;

					const amountArg = command.arguments[1];
					if (amountArg?.$kind !== 'Pure') {
						source.consume();
						return true;
					}

					const amount = BigInt(bcs.u64().fromBase64(amountArg.bytes));
					source.remainingBalance -= amount;
					trackedCoins.set(
						`result:${command.index},0`,
						new TrackedCoin(source.coinType, amount, false),
					);
					return true;
				}

				if (fn === 'withdraw_all' && mod === 'balance') {
					// balance::withdraw_all(&mut Balance<T>) -> Balance<T>
					const source = getTrackedCoin(command.arguments[0]);
					if (source) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(source.coinType, source.remainingBalance, false),
						);
						source.remainingBalance = 0n;
					}
					return true;
				}

				// --- Join operations ---

				if (
					(fn === 'join' && (mod === 'coin' || mod === 'balance')) ||
					(fn === 'put' && mod === 'coin')
				) {
					// coin::join(&mut Coin<T>, Coin<T>)
					// balance::join(&mut Balance<T>, Balance<T>) -> u64
					// coin::put(&mut Balance<T>, Coin<T>)
					const dest = getTrackedCoin(command.arguments[0]);
					const source = getTrackedCoin(command.arguments[1]);
					if (dest && source) {
						dest.remainingBalance += source.remainingBalance;
					}
					source?.consume();
					return true;
				}

				// --- Zero creation ---

				if (fn === 'zero' && (mod === 'coin' || mod === 'balance')) {
					// coin::zero(&mut TxContext) -> Coin<T>
					// balance::zero() -> Balance<T>
					if (coinType) {
						trackedCoins.set(`result:${command.index},0`, new TrackedCoin(coinType, 0n, false));
					}
					return true;
				}

				// All other 0x2::coin / 0x2::balance functions (destroy_zero, divide_into_n,
				// value, etc.) fall through to the generic MoveCall handler which consumes
				// all by-value arguments.
				return false;
			};

			const issues: TransactionAnalysisIssue[] = [];

			const trackedCoins = new Map<string, TrackedCoin>();
			const returnedByType = new Map<string, bigint>();

			trackedCoins.set(
				'gas',
				new TrackedCoin(
					normalizeStructTag('0x2::sui::SUI'),
					gasCoins.reduce((a, c) => a + c.balance, 0n),
					true,
				),
			);

			if (data.gasData.budget) {
				trackedCoins.get('gas')!.remainingBalance -= BigInt(data.gasData.budget);
			} else {
				issues.push({ message: 'Gas budget not set in Transaction' });
			}

			for (const input of inputs) {
				if (input.$kind === 'Object' && coins[input.object.objectId]) {
					const coin = coins[input.object.objectId];
					trackedCoins.set(
						`input:${input.index}`,
						new TrackedCoin(coin.coinType, coin.balance, true),
					);
				}
			}

			for (const command of commands) {
				switch (command.$kind) {
					case 'SplitCoins':
						splitCoin(command);
						break;
					case 'MergeCoins':
						mergeCoins(command);
						break;
					case 'TransferObjects':
						transferObjects(command);
						break;
					case 'MakeMoveVec':
						command.elements.forEach((el) => {
							const tracked = getTrackedCoin(el);
							tracked?.consume();
						});
						break;
					case 'MoveCall':
						if (!handleFrameworkMoveCall(command)) {
							// Generic MoveCall: consume tracked coin/balance arguments passed
							// by value or &mut. Immutable references (&) can't move value.
							command.arguments.forEach((arg) => {
								if (arg.accessLevel === 'read') return;
								const tracked = getTrackedCoin(arg);
								tracked?.consume();
							});
						}
						break;
					case 'Upgrade':
					case 'Publish':
						break;
					default:
						throw new Error(`Unsupported command type: ${command.$kind}`);
				}
			}

			const outflows: Record<string, CoinFlow> = {};

			for (const coin of trackedCoins.values()) {
				if (!coin.owned) {
					continue;
				}
				if (!outflows[coin.coinType]) {
					outflows[coin.coinType] = { coinType: coin.coinType, amount: 0n };
				}

				outflows[coin.coinType].amount += coin.initialBalance - coin.remainingBalance;
			}

			// Subtract value returned to sender (send_funds to self, transferObjects to self)
			for (const [coinType, amount] of returnedByType) {
				if (outflows[coinType]) {
					outflows[coinType].amount -= amount;
				}
			}

			if (issues.length) {
				return { issues };
			}

			return {
				result: {
					outflows: Object.values(outflows),
				},
			};
		},
});

class TrackedCoin {
	coinType: string;
	initialBalance: bigint;
	remainingBalance: bigint;
	owned: boolean;
	consumed = false;

	constructor(coinType: string, balance: bigint, owned: boolean) {
		this.coinType = coinType;
		this.initialBalance = balance;
		this.remainingBalance = balance;
		this.owned = owned;
	}

	consume() {
		this.remainingBalance = 0n;
		this.consumed = true;
	}
}
