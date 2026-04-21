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

export interface AddressFlows {
	/** Value that left this address net of what it received back. */
	outflows: CoinFlow[];
	/** Value that arrived at this address net of what it started by giving up. */
	inflows: CoinFlow[];
}

/**
 * Per-address coin flows, derived from a single signed delta per
 * `(address, coinType)` pair:
 *
 *   - When a coin enters tracking (an input Object, a gas coin, a
 *     `redeem_funds` result), its balance is deducted from its owner.
 *   - When a coin is transferred or `send_funds`-ed to a destination, its
 *     balance is credited to that destination.
 *   - When a tracked coin is still alive at the end of the PTB (it wasn't
 *     transferred or consumed by a MoveCall), its remaining balance is
 *     implicitly credited back to its current owner. This models the Move
 *     semantics where an input Object stays at its owner's address with
 *     whatever balance changes the PTB applied.
 *   - The gas budget is taken off the gas coin's tracked balance (reducing
 *     what's returned at end), so the gas owner's net delta for SUI is
 *     exactly `-budget` in the simple case.
 *
 * A negative delta means value left the address on net; positive means it
 * arrived on net. Zero deltas are filtered out. Conservation holds: for each
 * coinType, the sum of all addresses' deltas is zero (every outflow has a
 * matching inflow somewhere, modulo coins consumed to an unknown destination
 * which leave a net negative at the origin with no matching credit).
 *
 * Most consumers want {@link coinFlows} (sender-focused) or
 * {@link sponsorFlows} rather than this broader view.
 */
export interface AddressCoinFlowsResult {
	byAddress: Record<string, AddressFlows>;
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

export const addressCoinFlows = createAnalyzer({
	dependencies: { data, commands, inputs, coins, gasCoins, coinReservations },
	analyze:
		() =>
		async ({ data, commands, inputs, coins, gasCoins, coinReservations }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const trackedCoins = new Map<string, TrackedCoin>();
			// Signed per-(address, coinType) delta. Negative = net outflow from
			// the address; positive = net inflow.
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

			/**
			 * Register a coin as entering the tracked world from outside the PTB
			 * (an input Object, a gas coin, a reservation, or a `redeem_funds`
			 * result). Deducts the coin's balance from its owner — the owner
			 * gets credit back at end-of-PTB (implicit return) or on an explicit
			 * transfer-to-self.
			 */
			const trackExternal = (key: string, coin: TrackedCoin) => {
				trackedCoins.set(key, coin);
				adjustDelta(coin.ownerAddress, coin.coinType, -coin.balance);
			};

			/**
			 * Register a coin derived from intra-PTB redistribution (split,
			 * conversion, withdraw_all). No delta change — the value came from a
			 * previously-tracked coin whose owner was already charged.
			 */
			const trackDerived = (key: string, coin: TrackedCoin) => {
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
				}
			};

			const getTrackedCoin = (ref: AnalyzedCommandArgument): TrackedCoin | null => {
				const key = trackedCoinKey(ref);
				return key ? (trackedCoins.get(key) ?? null) : null;
			};

			/**
			 * Credit `tracked.balance` to `destAddress` and mark the coin
			 * consumed. `destAddress = null` means the destination is unknown
			 * (generic MoveCall consume, MakeMoveVec, dynamic transfer address) —
			 * no one is credited, so the coin's initial-tracking deduction stays
			 * as a net outflow on its owner.
			 */
			const flushToDestination = (tracked: TrackedCoin, destAddress: string | null) => {
				const dest = normalizeAddress(destAddress);
				adjustDelta(dest, tracked.coinType, tracked.balance);
				tracked.consume();
			};

			const splitCoin = (command: Extract<AnalyzedCommand, { $kind: 'SplitCoins' }>) => {
				const coin = getTrackedCoin(command.coin);
				if (!coin) return;

				// Dynamic amounts: can't predict the split, treat as fully consumed
				// to an unknown destination.
				if (!command.amounts.every((a) => a.$kind === 'Pure')) {
					flushToDestination(coin, null);
					return;
				}

				for (let i = 0; i < command.amounts.length; i++) {
					const a = command.amounts[i];
					if (a.$kind !== 'Pure') throw new Error('Expected pure value');
					const amount = BigInt(bcs.u64().fromBase64(a.bytes));
					const take = amount > coin.balance ? coin.balance : amount;
					coin.balance -= take;
					trackDerived(
						`result:${command.index},${i}`,
						new TrackedCoin(coin.coinType, take, coin.ownerAddress),
					);
				}
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const dest = getTrackedCoin(command.destination);
				for (const srcRef of command.sources) {
					const src = getTrackedCoin(srcRef);
					if (!src) continue;
					if (dest) {
						// Fold the source's balance into dest. The source's owner
						// already took the tracking-start deduction; any subsequent
						// transfer of dest credits the recipient by the full merged
						// balance, so conservation is preserved automatically.
						dest.balance += src.balance;
						src.consume();
					} else {
						// No tracked dest: treat source as flushed to an unknown
						// destination so its owner is charged for the value.
						flushToDestination(src, null);
					}
				}
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				// A dynamic (non-Pure) address — e.g. a MoveCall result — is
				// treated as unknown: the object's owner's tracking-start deduction
				// stays as net outflow and no recipient is credited. Consumers
				// needing exact accounting should reconcile with the transaction's
				// real balance changes.
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
					trackExternal(
						`result:${command.index},0`,
						new TrackedCoin(arg.coinType, arg.amount, normalizeAddress(owner)),
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
					// Value-preserving 1:1 conversion — re-key the existing
					// TrackedCoin instead of allocating a new one.
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
						flushToDestination(source, null);
						return true;
					}

					const amount = BigInt(bcs.u64().fromBase64(amountArg.bytes));
					const take = amount > source.balance ? source.balance : amount;
					source.balance -= take;
					trackDerived(
						`result:${command.index},0`,
						new TrackedCoin(source.coinType, take, source.ownerAddress),
					);
					return true;
				}

				if (fn === 'withdraw_all' && mod === 'balance') {
					// balance::withdraw_all(&mut Balance<T>) -> Balance<T>
					// Moves the entire balance into a new Balance. Source stays
					// tracked (it's `&mut`) with 0 balance so stale refs see an
					// empty coin rather than a moved one.
					if (command.arguments.length < 1) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (source) {
						trackDerived(
							`result:${command.index},0`,
							new TrackedCoin(source.coinType, source.balance, source.ownerAddress),
						);
						source.balance = 0n;
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
					// Asymmetry: if `source` is untracked we no-op (nothing to
					// fold); if `dest` is untracked we flush source to an unknown
					// destination so its owner's deduction stays as an outflow.
					if (command.arguments.length < 2) return false;
					const dest = getTrackedCoin(command.arguments[0]);
					const source = getTrackedCoin(command.arguments[1]);
					if (!source) return true;
					if (dest) {
						dest.balance += source.balance;
						source.consume();
					} else {
						flushToDestination(source, null);
					}
					return true;
				}

				// --- Zero creation ---

				if (fn === 'zero' && (mod === 'coin' || mod === 'balance')) {
					// coin::zero(&mut TxContext) -> Coin<T>
					// balance::zero() -> Balance<T>
					// Null owner + zero balance — no deduction, no implicit return.
					if (coinType) {
						trackDerived(`result:${command.index},0`, new TrackedCoin(coinType, 0n, null));
					}
					return true;
				}

				// Known gaps worth covering in a follow-up:
				//   - coin::mint / coin::mint_and_transfer (TreasuryCap<T>): new
				//     value appears from nowhere, so a conservation mismatch shows
				//     up as an uncredited inflow at the recipient.
				//   - 0x2::pay module (split, split_and_transfer, join_vec)
				// All other 0x2::coin / 0x2::balance functions (destroy_zero,
				// divide_into_n, value, etc.) fall through to the generic handler
				// which flushes all by-value arguments as outflow from their owner.
				return false;
			};

			// --- Setup: gas coin + reservations + object inputs ---

			const suiType = normalizeStructTag('0x2::sui::SUI');
			const normalizedGasOwner = normalizeAddress(gasOwner);

			// Sum real gas coins (they're all owned by the gas owner) plus
			// reservations (each with its own owner, typically but not always the
			// gas owner).
			const gasBalance =
				gasCoins.reduce((a, c) => a + c.balance, 0n) +
				coinReservations.reduce((a, r) => a + r.balance, 0n);
			trackExternal('gas', new TrackedCoin(suiType, gasBalance, normalizedGasOwner));

			// Reservations owned by a different party than the gas owner contribute
			// balance but deducted from the wrong party above. Re-attribute the
			// difference so each reservation's balance is charged to its real
			// owner, not the gas owner.
			for (const r of coinReservations) {
				const owner = normalizeAddress(r.owner);
				if (owner && owner !== normalizedGasOwner && r.balance > 0n) {
					adjustDelta(normalizedGasOwner, suiType, r.balance);
					adjustDelta(owner, suiType, -r.balance);
				}
			}

			if (data.gasData.budget) {
				// Gas budget is paid to the network. Subtract it from the gas
				// coin's tracked balance (so less is returned to owner at end)
				// without crediting anyone — the owner ends up net `-budget`.
				const budget = BigInt(data.gasData.budget);
				const gas = trackedCoins.get('gas')!;
				gas.balance = gas.balance >= budget ? gas.balance - budget : 0n;
			} else {
				issues.push({ message: 'Gas budget not set in Transaction' });
			}

			for (const input of inputs) {
				if (input.$kind === 'Object' && coins[input.object.objectId]) {
					const coin = coins[input.object.objectId];
					trackExternal(
						`input:${input.index}`,
						new TrackedCoin(coin.coinType, coin.balance, normalizeAddress(coin.ownerAddress)),
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
							// Generic MoveCall: flush by-value / &mut tracked arguments
							// as outflow from their owner. Immutable refs (&) can't
							// move value.
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

			// --- Implicit return: any tracked coin still alive at end credits
			//     its current owner with its remaining balance.
			for (const coin of trackedCoins.values()) {
				if (coin.balance > 0n && coin.ownerAddress) {
					adjustDelta(coin.ownerAddress, coin.coinType, coin.balance);
				}
			}

			if (issues.length) return { issues };

			const byAddress: Record<string, AddressFlows> = {};
			for (const [address, byCoin] of deltas) {
				const outflows: CoinFlow[] = [];
				const inflows: CoinFlow[] = [];
				for (const [coinType, delta] of byCoin) {
					if (delta < 0n) outflows.push({ coinType, amount: -delta });
					else if (delta > 0n) inflows.push({ coinType, amount: delta });
				}
				if (outflows.length > 0 || inflows.length > 0) {
					byAddress[address] = { outflows, inflows };
				}
			}

			return {
				result: { byAddress } satisfies AddressCoinFlowsResult,
			};
		},
});

const EMPTY_FLOWS: AddressFlows = { outflows: [], inflows: [] };

/**
 * The transaction sender's coin flows. Default rule for "what is the user
 * spending/receiving?" — `outflows` lists value that left the sender on net,
 * `inflows` lists value that arrived at the sender on net. For the sponsor
 * view see {@link sponsorFlows}; for arbitrary addresses see
 * {@link addressCoinFlows}.
 */
export const coinFlows = createAnalyzer({
	dependencies: { addressCoinFlows, data },
	analyze:
		() =>
		({ addressCoinFlows, data }) => {
			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			const bucket = sender ? addressCoinFlows.byAddress[sender] : undefined;
			return { result: bucket ?? EMPTY_FLOWS };
		},
});

/**
 * The sponsor's (gas payer's) coin flows, for transactions where
 * `gasData.owner` differs from `data.sender`. Returns empty lists for
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
			const bucket = sponsor ? addressCoinFlows.byAddress[sponsor] : undefined;
			return { result: bucket ?? EMPTY_FLOWS };
		},
});

class TrackedCoin {
	coinType: string;
	balance: bigint;
	/**
	 * Address that currently owns this coin. Used for implicit return at the
	 * end of the PTB: any still-alive tracked coin credits its owner with
	 * whatever balance it has, which models the Move semantics where an input
	 * Object stays at its owner's address after the transaction. `null` means
	 * the coin has no known owner (e.g. `coin::zero`) — it was never deducted
	 * from anyone and isn't credited back to anyone.
	 */
	ownerAddress: string | null;

	constructor(coinType: string, balance: bigint, ownerAddress: string | null) {
		this.coinType = coinType;
		this.balance = balance;
		this.ownerAddress = ownerAddress;
	}

	consume() {
		this.balance = 0n;
	}
}
