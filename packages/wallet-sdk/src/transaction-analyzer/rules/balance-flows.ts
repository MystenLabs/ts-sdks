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

/**
 * Per-address signed balance deltas. Negative = value left the address on
 * net; positive = value arrived on net. For each coin type the sum across all
 * addresses is zero, modulo coins consumed to an unknown destination.
 *
 * `sender` is the transaction sender's signed flows (empty if the sender
 * didn't move any tracked value). `sponsor` is the gas payer's signed flows
 * when `gasData.owner` differs from `data.sender`, or `null` when the tx
 * isn't sponsored.
 */
export interface BalanceFlowsResult {
	byAddress: Record<string, CoinFlow[]>;
	sender: CoinFlow[];
	sponsor: CoinFlow[] | null;
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

export const balanceFlows = createAnalyzer({
	dependencies: { data, commands, inputs, coins, gasCoins },
	analyze:
		() =>
		async ({ data, commands, inputs, coins, gasCoins }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const trackedCoins = new Map<string, TrackedCoin>();
			const deltas = new Map<string, Map<string, bigint>>();

			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			const gasOwner = data.gasData.owner
				? normalizeSuiAddress(data.gasData.owner)
				: (sender ?? null);

			const normalizeAddress = (address: string | null): string | null =>
				address == null ? null : normalizeSuiAddress(address);

			const adjustDelta = (address: string | null, coinType: string, amount: bigint) => {
				if (!address || amount === 0n) return;
				let byCoin = deltas.get(address);
				if (!byCoin) {
					byCoin = new Map();
					deltas.set(address, byCoin);
				}
				byCoin.set(coinType, (byCoin.get(coinType) ?? 0n) + amount);
			};

			const track = (key: string, coin: TrackedCoin) => {
				trackedCoins.set(key, coin);
			};

			const trackedCoinKey = (ref: AnalyzedCommandArgument): string | null => {
				switch (ref.$kind) {
					case 'GasCoin':
						return 'gas';
					case 'Object':
						return `input:${ref.index}`;
					case 'Result':
						return `result:${ref.index[0]},${ref.index[1]}`;
					case 'Unknown':
					case 'Pure':
					case 'Withdrawal':
						return null;
					default: {
						const _exhaustive: never = ref;
						throw new Error(`Unknown command argument kind: ${JSON.stringify(_exhaustive)}`);
					}
				}
			};

			const getTrackedCoin = (ref: AnalyzedCommandArgument): TrackedCoin | null => {
				const key = trackedCoinKey(ref);
				return key ? (trackedCoins.get(key) ?? null) : null;
			};

			const splitCoin = (command: Extract<AnalyzedCommand, { $kind: 'SplitCoins' }>) => {
				const coin = getTrackedCoin(command.coin);
				if (!coin) return;

				if (!command.amounts.every((a) => a.$kind === 'Pure')) {
					coin.consume();
					return;
				}

				const amounts = command.amounts.map((a) => {
					if (a.$kind !== 'Pure') throw new Error('Expected pure value');
					return BigInt(bcs.u64().fromBase64(a.bytes));
				});

				const total = amounts.reduce((a, b) => a + b, 0n);
				withdrawFromCoin(coin, total, `SplitCoins at command ${command.index}`);

				amounts.forEach((amount, i) => {
					track(
						`result:${command.index},${i}`,
						new TrackedCoin(coin.coinType, amount, coin.ownerAddress),
					);
				});
			};

			// Deduct `amount` from a tracked coin's balance. If the coin is
			// backed by an address balance (`payFromAddressBalance = true`, which
			// only applies to tx.gas under empty-payment gas), any overflow is
			// charged directly to the owner's delta instead of being an issue —
			// on-chain the AB covers it. Otherwise over-draw is reported.
			const withdrawFromCoin = (coin: TrackedCoin, amount: bigint, context: string) => {
				if (amount > coin.balance) {
					if (coin.payFromAddressBalance) {
						const overflow = amount - coin.balance;
						adjustDelta(coin.ownerAddress, coin.coinType, -overflow);
					} else {
						issues.push({
							message: `${context} takes ${amount} from a ${coin.coinType} coin with only ${coin.balance} available`,
						});
					}
				}
				coin.balance -= amount;
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const sources = command.sources.map(getTrackedCoin);
				const amount = sources.reduce((a, c) => a + (c?.balance ?? 0n), 0n);
				for (const src of sources) src?.consume();
				const dest = getTrackedCoin(command.destination);
				if (!dest) return;
				dest.balance += amount;
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				const address =
					command.address.$kind === 'Pure' ? bcs.Address.fromBase64(command.address.bytes) : null;
				const dest = normalizeAddress(address);
				for (const obj of command.objects) {
					const tracked = getTrackedCoin(obj);
					if (tracked) {
						adjustDelta(dest, tracked.coinType, tracked.balance);
						tracked.consume();
					}
				}
			};

			const getCoinTypeFromTypeArgs = (
				command: Extract<AnalyzedCommand, { $kind: 'MoveCall' }>,
			): string | null => {
				const typeArg = command.command.typeArguments?.[0];
				return typeArg ? normalizeStructTag(typeArg) : null;
			};

			const handleFrameworkMoveCall = (
				command: Extract<AnalyzedCommand, { $kind: 'MoveCall' }>,
			): boolean => {
				const pkg = normalizeSuiAddress(command.command.package);
				if (pkg !== SUI_FRAMEWORK) return false;

				const mod = command.command.module;
				const fn = command.command.function;
				const coinType = getCoinTypeFromTypeArgs(command);

				if (fn === 'redeem_funds' && (mod === 'coin' || mod === 'balance')) {
					const arg = command.arguments[0];
					if (arg?.$kind !== 'Withdrawal') return false;
					let ownerRaw: string | null;
					if (arg.withdrawFrom === 'Sender') {
						ownerRaw = sender ?? null;
					} else if (data.gasData.owner) {
						ownerRaw = gasOwner;
					} else {
						issues.push({
							message: `${mod}::${fn} at command ${command.index} withdraws from Sponsor but the transaction has no gas owner`,
						});
						return true;
					}
					const owner = normalizeAddress(ownerRaw);
					track(`result:${command.index},0`, new TrackedCoin(arg.coinType, arg.amount, owner));
					adjustDelta(owner, arg.coinType, -arg.amount);
					return true;
				}

				if (fn === 'send_funds' && (mod === 'coin' || mod === 'balance')) {
					if (command.arguments.length < 2) return false;
					const tracked = getTrackedCoin(command.arguments[0]);
					const addrArg = command.arguments[1];
					const destAddress =
						addrArg.$kind === 'Pure' ? bcs.Address.fromBase64(addrArg.bytes) : null;
					if (tracked) {
						adjustDelta(normalizeAddress(destAddress), tracked.coinType, tracked.balance);
						tracked.consume();
					}
					return true;
				}

				if (
					(fn === 'into_balance' && mod === 'coin') ||
					(fn === 'from_balance' && mod === 'coin')
				) {
					// Value-preserving re-key; no new deduction.
					if (command.arguments.length < 1) return false;
					const oldKey = trackedCoinKey(command.arguments[0]);
					const tracked = oldKey ? trackedCoins.get(oldKey) : undefined;
					if (tracked) {
						trackedCoins.delete(oldKey!);
						track(`result:${command.index},0`, tracked);
					}
					return true;
				}

				if (
					(fn === 'split' && (mod === 'coin' || mod === 'balance')) ||
					(fn === 'take' && mod === 'coin')
				) {
					if (command.arguments.length < 2) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (!source) return true;

					const amountArg = command.arguments[1];
					if (amountArg.$kind !== 'Pure') {
						source.consume();
						return true;
					}

					const amount = BigInt(bcs.u64().fromBase64(amountArg.bytes));
					withdrawFromCoin(source, amount, `${mod}::${fn} at command ${command.index}`);
					track(
						`result:${command.index},0`,
						new TrackedCoin(source.coinType, amount, source.ownerAddress),
					);
					return true;
				}

				if (fn === 'withdraw_all' && mod === 'balance') {
					if (command.arguments.length < 1) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (source) {
						track(
							`result:${command.index},0`,
							new TrackedCoin(source.coinType, source.balance, source.ownerAddress),
						);
						source.balance = 0n;
					}
					return true;
				}

				if (
					(fn === 'join' && (mod === 'coin' || mod === 'balance')) ||
					(fn === 'put' && mod === 'coin')
				) {
					if (command.arguments.length < 2) return false;
					const dest = getTrackedCoin(command.arguments[0]);
					const source = getTrackedCoin(command.arguments[1]);
					if (!source) return true;
					if (dest) dest.balance += source.balance;
					source.consume();
					return true;
				}

				if (fn === 'zero' && (mod === 'coin' || mod === 'balance')) {
					if (coinType) {
						track(`result:${command.index},0`, new TrackedCoin(coinType, 0n, null));
					}
					return true;
				}

				// TODO: coin::mint / coin::mint_and_transfer (violates conservation),
				// 0x2::pay module (split, split_and_transfer, join_vec).
				return false;
			};

			const suiType = normalizeStructTag('0x2::sui::SUI');
			const normalizedGasOwner = normalizeAddress(gasOwner);
			const paymentIsEmpty = (data.gasData.payment?.length ?? 0) === 0;

			// Gas payment coins are smashed into a single tx.gas coin owned by
			// the gas payer. When `payment: []`, tx.gas has zero coin backing
			// and any draws (the budget itself, plus any splitCoins(tx.gas, …))
			// come from the gas payer's address balance — flag the tracked coin
			// so `withdrawFromCoin` charges the owner on overflow instead of
			// flagging an over-split issue.
			const gasBalance = gasCoins.reduce((a, c) => a + c.balance, 0n);
			const gasCoin = new TrackedCoin(suiType, gasBalance, normalizedGasOwner);
			gasCoin.payFromAddressBalance = paymentIsEmpty;
			track('gas', gasCoin);
			adjustDelta(normalizedGasOwner, suiType, -gasBalance);

			if (data.gasData.budget) {
				const budget = BigInt(data.gasData.budget);
				if (paymentIsEmpty) {
					adjustDelta(normalizedGasOwner, suiType, -budget);
				} else {
					if (budget > gasBalance) {
						issues.push({
							message: `Gas budget ${budget} exceeds the gas payment balance ${gasBalance}`,
						});
					}
					gasCoin.balance -= budget;
				}
			} else {
				issues.push({ message: 'Gas budget not set in Transaction' });
			}

			for (const input of inputs) {
				if (input.$kind === 'Object' && coins[input.object.objectId]) {
					const coin = coins[input.object.objectId];
					const tc = new TrackedCoin(
						coin.coinType,
						coin.balance,
						normalizeAddress(coin.ownerAddress),
					);
					track(`input:${input.index}`, tc);
					adjustDelta(tc.ownerAddress, tc.coinType, -tc.balance);
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
							getTrackedCoin(el)?.consume();
						});
						break;
					case 'MoveCall':
						if (!handleFrameworkMoveCall(command)) {
							command.arguments.forEach((arg) => {
								if (arg.accessLevel === 'read') return;
								getTrackedCoin(arg)?.consume();
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

			// Implicit return: still-alive tracked coins credit their owner.
			for (const [, coin] of trackedCoins) {
				if (coin.balance <= 0n) continue;
				adjustDelta(coin.ownerAddress, coin.coinType, coin.balance);
			}

			const byAddress: Record<string, CoinFlow[]> = {};
			for (const [address, byCoin] of deltas) {
				byAddress[address] = Array.from(byCoin, ([coinType, amount]) => ({ coinType, amount }));
			}

			const senderFlows = (sender && byAddress[sender]) || [];
			const sponsorAddr =
				normalizedGasOwner && normalizedGasOwner !== sender ? normalizedGasOwner : null;
			const sponsorFlows = sponsorAddr ? (byAddress[sponsorAddr] ?? []) : null;

			return {
				result: {
					byAddress,
					sender: senderFlows,
					sponsor: sponsorFlows,
				} satisfies BalanceFlowsResult,
			};
		},
});

class TrackedCoin {
	coinType: string;
	balance: bigint;
	ownerAddress: string | null;
	payFromAddressBalance = false;

	constructor(coinType: string, balance: bigint, ownerAddress: string | null) {
		this.coinType = coinType;
		this.balance = balance;
		this.ownerAddress = ownerAddress;
	}

	consume() {
		this.balance = 0n;
	}
}
