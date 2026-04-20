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

export type Party = 'sender' | 'sponsor';

/**
 * Per-party coin outflows. A party's outflow list captures value that originated
 * with that party and left it during the transaction — either to another party or
 * to an unknown destination (e.g. consumed by a non-framework MoveCall). Value
 * that originates outside both parties (e.g. `coin::zero`) is not attributed to
 * any party and does not appear in the result.
 */
export type CoinFlowsByParty = Record<Party, CoinFlow[]>;

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

type Origin = 'Sender' | 'Sponsor' | 'Foreign';

export const coinFlows = createAnalyzer({
	dependencies: { data, commands, inputs, coins, gasCoins },
	analyze:
		() =>
		async ({ data, commands, inputs, coins, gasCoins }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const trackedCoins = new Map<string, TrackedCoin>();
			const outflowsByOrigin = new Map<Exclude<Origin, 'Foreign'>, Map<string, bigint>>();

			const gasOwner = data.gasData.owner ?? data.sender;
			const sponsorAddress = gasOwner && data.sender && gasOwner !== data.sender ? gasOwner : null;

			const partyForAddress = (address: string | null): Origin | 'Other' => {
				if (address == null) return 'Other';
				if (data.sender && address === data.sender) return 'Sender';
				if (sponsorAddress && address === sponsorAddress) return 'Sponsor';
				return 'Other';
			};

			const addOutflow = (origin: Origin, coinType: string, amount: bigint) => {
				if (origin === 'Foreign' || amount <= 0n) return;
				let forOrigin = outflowsByOrigin.get(origin);
				if (!forOrigin) {
					forOrigin = new Map();
					outflowsByOrigin.set(origin, forOrigin);
				}
				forOrigin.set(coinType, (forOrigin.get(coinType) ?? 0n) + amount);
			};

			// Flush a tracked coin's remaining balance to the appropriate outflow bucket
			// based on where it's going. `destAddress = null` means an unknown destination
			// (e.g. consumed by a non-framework MoveCall) and counts as outflow.
			const flushToDestination = (tracked: TrackedCoin, destAddress: string | null) => {
				if (tracked.origin !== 'Foreign') {
					const destParty = partyForAddress(destAddress);
					if (destParty !== tracked.origin) {
						addOutflow(tracked.origin, tracked.coinType, tracked.remainingBalance);
					}
				}
				tracked.consume();
			};

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
				if (!coin) return;

				// If any amounts are dynamic we have to assume the coin is fully consumed.
				if (!command.amounts.every((a) => a.$kind === 'Pure')) {
					flushToDestination(coin, null);
					return;
				}

				const amounts = command.amounts.map((a) => {
					if (a.$kind !== 'Pure') throw new Error('Expected pure value');
					return BigInt(bcs.u64().fromBase64(a.bytes));
				});

				coin.remainingBalance -= amounts.reduce((a, b) => a + b, 0n);

				amounts.forEach((amount, i) => {
					trackedCoins.set(
						`result:${command.index},${i}`,
						new TrackedCoin(coin.coinType, amount, coin.origin),
					);
				});
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const dest = getTrackedCoin(command.destination);
				const sources = command.sources.map(getTrackedCoin);

				for (const src of sources) {
					if (!src) continue;
					if (dest && src.origin === dest.origin) {
						// Same origin: fold balance into dest; source is no longer a
						// separate tracked entity.
						dest.remainingBalance += src.remainingBalance;
						src.consume();
					} else {
						// Mixed-origin or missing dest: treat the source as flushed to an
						// unknown destination so its origin is charged for the value.
						flushToDestination(src, null);
					}
				}
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				const destAddress =
					command.address.$kind === 'Pure' ? bcs.Address.fromBase64(command.address.bytes) : null;

				for (const obj of command.objects) {
					const tracked = getTrackedCoin(obj);
					if (!tracked) continue;
					flushToDestination(tracked, destAddress);
				}
			};

			const getCoinTypeFromTypeArgs = (
				command: Extract<AnalyzedCommand, { $kind: 'MoveCall' }>,
			): string | null => {
				const typeArg = command.command.typeArguments?.[0];
				return typeArg ? normalizeStructTag(typeArg) : null;
			};

			/**
			 * Handle framework MoveCall commands from 0x2::coin and 0x2::balance.
			 * Returns true if the command was handled, false to fall through to the
			 * generic MoveCall consumer.
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

				if (fn === 'redeem_funds' && (mod === 'coin' || mod === 'balance')) {
					// balance::redeem_funds(Withdrawal) -> Balance<T>
					// coin::redeem_funds(Withdrawal, &mut TxContext) -> Coin<T>
					const arg = command.arguments[0];
					if (arg?.$kind !== 'Withdrawal') return false;
					const origin: Origin = arg.withdrawFrom === 'Sender' ? 'Sender' : 'Sponsor';
					trackedCoins.set(
						`result:${command.index},0`,
						new TrackedCoin(arg.coinType, arg.amount, origin),
					);
					return true;
				}

				if (fn === 'send_funds' && (mod === 'coin' || mod === 'balance')) {
					// coin::send_funds(Coin<T>, address)
					// balance::send_funds(Balance<T>, address)
					if (command.arguments.length < 2) return false;
					const tracked = getTrackedCoin(command.arguments[0]);
					const addrArg = command.arguments[1];
					const destAddress =
						addrArg.$kind === 'Pure' ? bcs.Address.fromBase64(addrArg.bytes) : null;
					if (tracked) flushToDestination(tracked, destAddress);
					return true;
				}

				// --- Conversions ---

				if (
					(fn === 'into_balance' && mod === 'coin') ||
					(fn === 'from_balance' && mod === 'coin')
				) {
					// coin::into_balance(Coin<T>) -> Balance<T>
					// coin::from_balance(Balance<T>, &mut TxContext) -> Coin<T>
					if (command.arguments.length < 1) return false;
					const tracked = getTrackedCoin(command.arguments[0]);
					if (tracked) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(tracked.coinType, tracked.remainingBalance, tracked.origin),
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
					if (command.arguments.length < 2) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (!source) return true;

					const amountArg = command.arguments[1];
					if (amountArg.$kind !== 'Pure') {
						flushToDestination(source, null);
						return true;
					}

					const amount = BigInt(bcs.u64().fromBase64(amountArg.bytes));
					source.remainingBalance -= amount;
					trackedCoins.set(
						`result:${command.index},0`,
						new TrackedCoin(source.coinType, amount, source.origin),
					);
					return true;
				}

				if (fn === 'withdraw_all' && mod === 'balance') {
					// balance::withdraw_all(&mut Balance<T>) -> Balance<T>
					if (command.arguments.length < 1) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (source) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(source.coinType, source.remainingBalance, source.origin),
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
					if (command.arguments.length < 2) return false;
					const dest = getTrackedCoin(command.arguments[0]);
					const source = getTrackedCoin(command.arguments[1]);
					if (source) {
						if (dest && source.origin === dest.origin) {
							dest.remainingBalance += source.remainingBalance;
							source.consume();
						} else {
							flushToDestination(source, null);
						}
					}
					return true;
				}

				// --- Zero creation ---

				if (fn === 'zero' && (mod === 'coin' || mod === 'balance')) {
					// coin::zero(&mut TxContext) -> Coin<T>
					// balance::zero() -> Balance<T>
					if (coinType) {
						trackedCoins.set(`result:${command.index},0`, new TrackedCoin(coinType, 0n, 'Foreign'));
					}
					return true;
				}

				// Known gaps worth covering in a follow-up:
				//   - coin::mint / coin::mint_and_transfer (TreasuryCap<T>): untracked inflow
				//   - 0x2::pay module (split, split_and_transfer, join_vec)
				// All other 0x2::coin / 0x2::balance functions (destroy_zero, divide_into_n,
				// value, etc.) fall through to the generic MoveCall handler which flushes
				// all by-value arguments as outflow from their origin party.
				return false;
			};

			// --- Setup: gas coin + object inputs ---

			const gasOrigin: Origin = sponsorAddress ? 'Sponsor' : 'Sender';
			trackedCoins.set(
				'gas',
				new TrackedCoin(
					normalizeStructTag('0x2::sui::SUI'),
					gasCoins.reduce((a, c) => a + c.balance, 0n),
					gasOrigin,
				),
			);

			if (data.gasData.budget) {
				// Gas budget is paid by the gas owner to the network — always an outflow.
				addOutflow(gasOrigin, normalizeStructTag('0x2::sui::SUI'), BigInt(data.gasData.budget));
				const gas = trackedCoins.get('gas')!;
				gas.remainingBalance -= BigInt(data.gasData.budget);
			} else {
				issues.push({ message: 'Gas budget not set in Transaction' });
			}

			for (const input of inputs) {
				if (input.$kind === 'Object' && coins[input.object.objectId]) {
					const coin = coins[input.object.objectId];
					trackedCoins.set(
						`input:${input.index}`,
						new TrackedCoin(coin.coinType, coin.balance, 'Sender'),
					);
				}
			}

			// --- Process commands ---

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
							if (tracked) flushToDestination(tracked, null);
						});
						break;
					case 'MoveCall':
						if (!handleFrameworkMoveCall(command)) {
							// Generic MoveCall: flush tracked coin/balance arguments passed
							// by value or &mut as outflow from their origin. Immutable
							// references (&) can't move value.
							command.arguments.forEach((arg) => {
								if (arg.accessLevel === 'read') return;
								const tracked = getTrackedCoin(arg);
								if (tracked) flushToDestination(tracked, null);
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

			if (issues.length) return { issues };

			const toFlowList = (m: Map<string, bigint> | undefined): CoinFlow[] =>
				m
					? Array.from(m, ([coinType, amount]) => ({ coinType, amount })).filter(
							(f) => f.amount > 0n,
						)
					: [];

			return {
				result: {
					outflows: {
						sender: toFlowList(outflowsByOrigin.get('Sender')),
						sponsor: toFlowList(outflowsByOrigin.get('Sponsor')),
					} satisfies CoinFlowsByParty,
				},
			};
		},
});

class TrackedCoin {
	coinType: string;
	remainingBalance: bigint;
	// Party whose balance this tracked value comes out of. Splits / joins /
	// conversions preserve the origin; `coin::zero` produces 'Foreign'.
	origin: Origin;
	consumed = false;

	constructor(coinType: string, balance: bigint, origin: Origin) {
		this.coinType = coinType;
		this.remainingBalance = balance;
		this.origin = origin;
	}

	consume() {
		this.remainingBalance = 0n;
		this.consumed = true;
	}
}
