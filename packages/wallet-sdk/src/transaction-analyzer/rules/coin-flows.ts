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
import { coinReservations, coins, gasCoins } from './coins.js';

export interface CoinFlow {
	coinType: string;
	amount: bigint;
}

/**
 * Per-address signed balance deltas.
 *
 * Each coin entering the PTB (an input Object, a gas coin, a reservation, a
 * `redeem_funds` result) debits its owner for its initial balance; any amount
 * that flows back into a tracked coin (mutations, transfers) re-credits the
 * appropriate address. The final entry per `(address, coinType)` is signed:
 * negative = value left this address on net; positive = value arrived on net.
 *
 * Zero deltas are filtered out. Conservation holds: for each coin type the
 * sum of all addresses' deltas is zero, modulo coins consumed to an unknown
 * destination (which leave a net negative at the origin with no matching
 * credit).
 *
 * Most consumers want {@link coinFlows} (sender-focused) or
 * {@link sponsorFlows} rather than this broader view — those expose a flat
 * list of the address's outflows as positive amounts.
 */
export interface AddressCoinFlowsResult {
	byAddress: Record<string, CoinFlow[]>;
}

/**
 * Sender- or sponsor-focused outflow view. Only coin types where the address
 * had a net outflow appear; amounts are positive. This matches the pre-PR
 * shape of the `coinFlows` rule. To see inflows (what the address received
 * on net) use {@link addressCoinFlows} and look at the signed entries.
 */
export interface CoinFlowsResult {
	outflows: CoinFlow[];
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

export const addressCoinFlows = createAnalyzer({
	dependencies: { data, commands, inputs, coins, gasCoins, coinReservations },
	analyze:
		() =>
		async ({ data, commands, inputs, coins, gasCoins, coinReservations }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const trackedCoins = new Map<string, TrackedCoin>();
			// Returns crediting per-(address, coinType): amount transferred to
			// address during the PTB (via TransferObjects or send_funds).
			const returned = new Map<string, Map<string, bigint>>();

			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			const gasOwner = data.gasData.owner
				? normalizeSuiAddress(data.gasData.owner)
				: (sender ?? null);

			const normalizeAddress = (address: string | null): string | null =>
				address == null ? null : normalizeSuiAddress(address);

			const addReturned = (address: string | null, coinType: string, amount: bigint) => {
				if (!address || amount <= 0n) return;
				let byCoin = returned.get(address);
				if (!byCoin) {
					byCoin = new Map();
					returned.set(address, byCoin);
				}
				byCoin.set(coinType, (byCoin.get(coinType) ?? 0n) + amount);
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
				}
			};

			const getTrackedCoin = (ref: AnalyzedCommandArgument): TrackedCoin | null => {
				const key = trackedCoinKey(ref);
				return key ? (trackedCoins.get(key) ?? null) : null;
			};

			const splitCoin = (command: Extract<AnalyzedCommand, { $kind: 'SplitCoins' }>) => {
				const coin = getTrackedCoin(command.coin);
				if (!coin) return;

				// Dynamic amounts: assume full consumption.
				if (!command.amounts.every((a) => a.$kind === 'Pure')) {
					coin.consume();
					return;
				}

				const amounts = command.amounts.map((a) => {
					if (a.$kind !== 'Pure') throw new Error('Expected pure value');
					return BigInt(bcs.u64().fromBase64(a.bytes));
				});

				coin.remainingBalance -= amounts.reduce((a, b) => a + b, 0n);

				amounts.forEach((amount, i) => {
					// Derived: owned=false so its initial-remaining doesn't re-count
					// against its owner in the final pass. It still inherits
					// ownerAddress so a transfer-back-to-origin can be attributed.
					trackedCoins.set(
						`result:${command.index},${i}`,
						new TrackedCoin(coin.coinType, amount, coin.ownerAddress, false),
					);
				});
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const sources = command.sources.map(getTrackedCoin);
				const amount = sources.reduce((a, c) => a + (c?.remainingBalance ?? 0n), 0n);
				for (const src of sources) src?.consume();
				const dest = getTrackedCoin(command.destination);
				if (!dest) return;
				dest.remainingBalance += amount;
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				// A dynamic (non-Pure) address is treated as an unknown destination
				// and charged as outflow from the origin with no recipient credited.
				// Consumers needing exact accounting should reconcile with the
				// transaction's real balance changes.
				const address =
					command.address.$kind === 'Pure' ? bcs.Address.fromBase64(command.address.bytes) : null;
				const dest = normalizeAddress(address);
				for (const obj of command.objects) {
					const tracked = getTrackedCoin(obj);
					if (tracked) {
						addReturned(dest, tracked.coinType, tracked.remainingBalance);
					}
					tracked?.consume();
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
			 * Returns true if the command was handled, false to fall through to
			 * the generic MoveCall consumer.
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
					const owner =
						arg.withdrawFrom === 'Sender'
							? (sender ?? null)
							: (normalizeAddress(gasOwner) ?? sender);
					// Primary: the withdrawal brought new value into the PTB, so
					// its initial balance is attributed to the withdraw owner.
					trackedCoins.set(
						`result:${command.index},0`,
						new TrackedCoin(arg.coinType, arg.amount, normalizeAddress(owner), true),
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
					if (tracked) {
						addReturned(normalizeAddress(destAddress), tracked.coinType, tracked.remainingBalance);
						tracked.consume();
					}
					return true;
				}

				// --- Conversions ---

				if (
					(fn === 'into_balance' && mod === 'coin') ||
					(fn === 'from_balance' && mod === 'coin')
				) {
					// coin::into_balance(Coin<T>) -> Balance<T>
					// coin::from_balance(Balance<T>, &mut TxContext) -> Coin<T>
					// Value-preserving 1:1 conversion — re-key the existing
					// TrackedCoin so its primary/derived status is preserved.
					if (command.arguments.length < 1) return false;
					const oldKey = trackedCoinKey(command.arguments[0]);
					const tracked = oldKey ? trackedCoins.get(oldKey) : undefined;
					if (tracked) {
						trackedCoins.delete(oldKey!);
						trackedCoins.set(`result:${command.index},0`, tracked);
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
						source.consume();
						return true;
					}

					const amount = BigInt(bcs.u64().fromBase64(amountArg.bytes));
					source.remainingBalance -= amount;
					trackedCoins.set(
						`result:${command.index},0`,
						new TrackedCoin(source.coinType, amount, source.ownerAddress, false),
					);
					return true;
				}

				if (fn === 'withdraw_all' && mod === 'balance') {
					// balance::withdraw_all(&mut Balance<T>) -> Balance<T>
					// Moves the entire balance into a new (derived) Balance.
					// Source stays tracked (it's `&mut`) with 0 remaining.
					if (command.arguments.length < 1) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (source) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(source.coinType, source.remainingBalance, source.ownerAddress, false),
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
					//
					// Asymmetry: if `source` is untracked we no-op; if `dest` is
					// untracked the source's balance is silently dropped (the
					// source's owner's initial-remaining diff still accounts for
					// the loss).
					if (command.arguments.length < 2) return false;
					const dest = getTrackedCoin(command.arguments[0]);
					const source = getTrackedCoin(command.arguments[1]);
					if (!source) return true;
					if (dest) {
						dest.remainingBalance += source.remainingBalance;
					}
					source.consume();
					return true;
				}

				// --- Zero creation ---

				if (fn === 'zero' && (mod === 'coin' || mod === 'balance')) {
					// coin::zero(&mut TxContext) -> Coin<T>
					// balance::zero() -> Balance<T>
					// Derived with null owner and 0 balance — no effect on deltas.
					if (coinType) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(coinType, 0n, null, false),
						);
					}
					return true;
				}

				// Known gaps worth covering in a follow-up:
				//   - coin::mint / coin::mint_and_transfer (TreasuryCap<T>): new
				//     value appears from nowhere, conservation won't hold.
				//   - 0x2::pay module (split, split_and_transfer, join_vec)
				// All other 0x2::coin / 0x2::balance functions (destroy_zero,
				// divide_into_n, value, etc.) fall through to the generic handler.
				return false;
			};

			// --- Setup: gas coin + reservations + object inputs ---

			const suiType = normalizeStructTag('0x2::sui::SUI');
			const normalizedGasOwner = normalizeAddress(gasOwner);

			// Gas total balance is the sum of real gas coins plus reservations.
			// Attribute the base to the gas owner; for any reservation owned by
			// a different party, re-attribute its share below.
			const gasBalance =
				gasCoins.reduce((a, c) => a + c.balance, 0n) +
				coinReservations.reduce((a, r) => a + r.balance, 0n);
			// If the gas payment is empty (no coins, no reservations) the
			// transaction hasn't been resolved yet; we can't tell who'll end up
			// funding it, so attribute the budget to the sender by default
			// rather than to `gasData.owner` (which may or may not be set).
			const gasAttributionOwner = gasBalance > 0n ? normalizedGasOwner : sender;
			trackedCoins.set('gas', new TrackedCoin(suiType, gasBalance, gasAttributionOwner, true));

			if (data.gasData.budget) {
				// Budget is paid to the network; reducing `remainingBalance` (not
				// creating a returned credit) makes it show up as outflow for the
				// gas owner at final aggregation.
				trackedCoins.get('gas')!.remainingBalance -= BigInt(data.gasData.budget);
			} else {
				issues.push({ message: 'Gas budget not set in Transaction' });
			}

			for (const input of inputs) {
				if (input.$kind === 'Object' && coins[input.object.objectId]) {
					const coin = coins[input.object.objectId];
					trackedCoins.set(
						`input:${input.index}`,
						new TrackedCoin(coin.coinType, coin.balance, normalizeAddress(coin.ownerAddress), true),
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
							getTrackedCoin(el)?.consume();
						});
						break;
					case 'MoveCall':
						if (!handleFrameworkMoveCall(command)) {
							// Generic MoveCall: consume by-value / &mut tracked
							// arguments. Immutable refs (&) can't move value.
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

			// --- Aggregate: signed delta per (address, coinType).
			//
			// For each primary (owned=true) tracked coin, charge its owner the
			// difference `initialBalance - remainingBalance`. Then credit each
			// address's returned buckets. Reservations owned by someone other
			// than the gas owner need re-attribution (their balance contributes
			// to the gas coin, which is owned by the gas owner).

			const deltas = new Map<string, Map<string, bigint>>();
			const adjustDelta = (address: string | null, coinType: string, amount: bigint) => {
				if (!address || amount === 0n) return;
				let byCoin = deltas.get(address);
				if (!byCoin) {
					byCoin = new Map();
					deltas.set(address, byCoin);
				}
				byCoin.set(coinType, (byCoin.get(coinType) ?? 0n) + amount);
			};

			for (const coin of trackedCoins.values()) {
				if (!coin.owned) continue;
				const loss = coin.initialBalance - coin.remainingBalance;
				if (loss === 0n) continue;
				adjustDelta(coin.ownerAddress, coin.coinType, -loss);
			}

			// Re-attribute the gas coin's loss for reservations owned by a
			// non-gas-owner party. The gas coin was charged the full combined
			// balance (including the reservation); we need to shift that portion
			// of the loss onto the reservation's real owner.
			const gasCoinTC = trackedCoins.get('gas');
			if (gasCoinTC && normalizedGasOwner) {
				for (const r of coinReservations) {
					const owner = normalizeAddress(r.owner);
					if (owner && owner !== normalizedGasOwner && r.balance > 0n) {
						// The gas coin "lost" this portion on behalf of the
						// reservation's real owner; shift the delta.
						adjustDelta(normalizedGasOwner, suiType, r.balance);
						adjustDelta(owner, suiType, -r.balance);
					}
				}
			}

			for (const [address, byCoin] of returned) {
				for (const [coinType, amount] of byCoin) {
					adjustDelta(address, coinType, amount);
				}
			}

			const byAddress: Record<string, CoinFlow[]> = {};
			for (const [address, byCoin] of deltas) {
				const flows: CoinFlow[] = [];
				for (const [coinType, delta] of byCoin) {
					if (delta !== 0n) flows.push({ coinType, amount: delta });
				}
				if (flows.length > 0) byAddress[address] = flows;
			}

			return {
				result: { byAddress } satisfies AddressCoinFlowsResult,
			};
		},
});

function outflowsFor(
	addressCoinFlows: AddressCoinFlowsResult,
	address: string | null,
): CoinFlowsResult {
	const flows = address ? addressCoinFlows.byAddress[address] : undefined;
	const outflows: CoinFlow[] = [];
	if (flows) {
		for (const flow of flows) {
			if (flow.amount < 0n) outflows.push({ coinType: flow.coinType, amount: -flow.amount });
		}
	}
	return { outflows };
}

/**
 * The transaction sender's net coin outflows (positive amounts). This is the
 * default rule for "what is the user spending?" — it matches the pre-PR shape
 * and is what the auto-approvals budget manager consumes. Inflows (value the
 * sender received during the transaction, e.g. via a sponsor-funded
 * `redeem_funds` transferred to them) reduce the sender's outflow on the
 * same coin type; if the net is non-positive, the coin type is omitted.
 *
 * For the sponsor view see {@link sponsorFlows}; for arbitrary addresses
 * (including third-party recipient inflows) see {@link addressCoinFlows}.
 */
export const coinFlows = createAnalyzer({
	dependencies: { addressCoinFlows, data },
	analyze:
		() =>
		({ addressCoinFlows, data }) => {
			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			return { result: outflowsFor(addressCoinFlows, sender) satisfies CoinFlowsResult };
		},
});

/**
 * The sponsor's (gas payer's) net coin outflows. Returns empty outflows for
 * non-sponsored transactions.
 */
export const sponsorFlows = createAnalyzer({
	dependencies: { addressCoinFlows, data },
	analyze:
		() =>
		({ addressCoinFlows, data }) => {
			const gasOwner = data.gasData.owner ? normalizeSuiAddress(data.gasData.owner) : null;
			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			const sponsor = gasOwner && gasOwner !== sender ? gasOwner : null;
			return { result: outflowsFor(addressCoinFlows, sponsor) satisfies CoinFlowsResult };
		},
});

class TrackedCoin {
	coinType: string;
	initialBalance: bigint;
	remainingBalance: bigint;
	/**
	 * Address that owns this tracked value. For primary coins this is who
	 * contributed the initial balance; for derived coins (splits, conversions,
	 * withdraw_all results) it's inherited from the source so a transfer back
	 * to that address still credits the right party. `null` means unknown
	 * origin (e.g. `coin::zero`).
	 */
	ownerAddress: string | null;
	/**
	 * True when this coin entered the PTB from outside (input Object, gas coin,
	 * reservation, `redeem_funds` result). Only primary coins' `initialBalance
	 * - remainingBalance` diff is attributed as an outflow on their owner;
	 * derived coins don't double-count because their source already carries the
	 * initial-remaining diff.
	 */
	owned: boolean;
	consumed = false;

	constructor(coinType: string, balance: bigint, ownerAddress: string | null, owned: boolean) {
		this.coinType = coinType;
		this.initialBalance = balance;
		this.remainingBalance = balance;
		this.ownerAddress = ownerAddress;
		this.owned = owned;
	}

	consume() {
		this.remainingBalance = 0n;
		this.consumed = true;
	}
}
