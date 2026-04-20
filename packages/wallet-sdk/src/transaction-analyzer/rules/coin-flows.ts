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
	/**
	 * Value that left this address (transferred away or consumed by a MoveCall).
	 * For a mixed-owner coin (e.g. a sender coin into which sponsor-redeemed
	 * value was merged), each origin contributes to its own address's outflow.
	 */
	outflows: CoinFlow[];
	/**
	 * Value that arrived at this address from another address. A recipient of a
	 * mixed-owner coin sees the full merged balance here, attributed across the
	 * original origins (so the sum across all recipients' inflows matches the
	 * sum across all origins' outflows per coin type).
	 *
	 * Note: `inflows[coinType] - outflows[coinType]` is NOT the same as "net
	 * position change for this address" — the analyzer can only observe
	 * movements visible in the PTB, so transfer-to-self on a mixed-owner coin
	 * reports each non-self-origin segment as an inflow without a matching
	 * self-outflow. For exact per-address delta, consume transaction effects'
	 * balance changes instead.
	 */
	inflows: CoinFlow[];
}

/**
 * Per-address coin flows. Keys are addresses that owned or received tracked
 * value at some point in the transaction. Value that enters the tracked world
 * from an unknown origin (e.g. `coin::zero`) doesn't contribute to any
 * address's outflow; value whose destination we can't determine (e.g. a
 * generic MoveCall consume) contributes to the origin's outflow but to no
 * address's inflow.
 *
 * Most consumers want {@link coinFlows} (sender-focused) or
 * {@link sponsorFlows} rather than this broader view.
 */
export interface AddressCoinFlowsResult {
	byAddress: Record<string, AddressFlows>;
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

/**
 * Each tracked coin carries origin segments — a list of `{ owner, amount }`
 * entries that preserve where the value came from through splits, joins, and
 * conversions. On any movement event (transfer, send_funds, generic consume,
 * gas budget, MakeMoveVec), each segment is charged to its own owner and
 * credited to the destination, so mixed-origin coins produce correct per-
 * address accounting even when their parts took different paths.
 */
interface OriginSegment {
	ownerAddress: string | null;
	amount: bigint;
}

/**
 * Per-address flow tracking. See {@link AddressCoinFlowsResult}.
 */
export const addressCoinFlows = createAnalyzer({
	dependencies: { data, commands, inputs, coins, gasCoins, coinReservations },
	analyze:
		() =>
		async ({ data, commands, inputs, coins, gasCoins, coinReservations }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const trackedCoins = new Map<string, TrackedCoin>();
			const flowsByAddress = new Map<
				string,
				{ outflows: Map<string, bigint>; inflows: Map<string, bigint> }
			>();

			const gasOwner = data.gasData.owner ?? data.sender;
			const sender = data.sender ?? null;

			const normalizeAddress = (address: string | null): string | null =>
				address == null ? null : normalizeSuiAddress(address);

			const getBucket = (address: string) => {
				let bucket = flowsByAddress.get(address);
				if (!bucket) {
					bucket = { outflows: new Map(), inflows: new Map() };
					flowsByAddress.set(address, bucket);
				}
				return bucket;
			};

			const addOutflow = (owner: string, coinType: string, amount: bigint) => {
				if (amount <= 0n) return;
				const bucket = getBucket(owner);
				bucket.outflows.set(coinType, (bucket.outflows.get(coinType) ?? 0n) + amount);
			};

			const addInflow = (recipient: string, coinType: string, amount: bigint) => {
				if (amount <= 0n) return;
				const bucket = getBucket(recipient);
				bucket.inflows.set(coinType, (bucket.inflows.get(coinType) ?? 0n) + amount);
			};

			/**
			 * Move a tracked coin's full remaining balance to `destAddress`,
			 * producing outflow/inflow events for each origin segment. `destAddress
			 * = null` means the destination is unknown (generic MoveCall consume,
			 * dynamic transfer address) — each origin is still charged an outflow,
			 * but no inflow is recorded.
			 */
			const flushToDestination = (tracked: TrackedCoin, destAddress: string | null) => {
				const dest = normalizeAddress(destAddress);
				for (const segment of tracked.segments) {
					if (segment.amount <= 0n) continue;
					if (segment.ownerAddress && segment.ownerAddress !== dest) {
						addOutflow(segment.ownerAddress, tracked.coinType, segment.amount);
					}
					if (dest && dest !== segment.ownerAddress) {
						addInflow(dest, tracked.coinType, segment.amount);
					}
				}
				tracked.consume();
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

				// Dynamic amounts force us to assume the coin is fully consumed.
				if (!command.amounts.every((a) => a.$kind === 'Pure')) {
					flushToDestination(coin, null);
					return;
				}

				const amounts = command.amounts.map((a) => {
					if (a.$kind !== 'Pure') throw new Error('Expected pure value');
					return BigInt(bcs.u64().fromBase64(a.bytes));
				});

				amounts.forEach((amount, i) => {
					const taken = coin.takeSegments(amount);
					trackedCoins.set(
						`result:${command.index},${i}`,
						TrackedCoin.fromSegments(coin.coinType, taken),
					);
				});
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const dest = getTrackedCoin(command.destination);
				const sources = command.sources.map(getTrackedCoin);
				for (const src of sources) {
					if (!src) continue;
					if (dest) {
						// Preserve each source's origin segments in dest. If dest is later
						// moved, per-segment flush correctly attributes each origin's
						// contribution — no up-front charging and no lost balance.
						dest.absorbSegments(src.segments);
						src.consume();
					} else {
						// Missing dest: charge every source segment to an unknown
						// destination so nothing is lost.
						flushToDestination(src, null);
					}
				}
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				// A dynamic (non-Pure) address — e.g. a MoveCall result — is treated
				// as an unknown destination: each origin segment is charged an outflow,
				// no inflow recorded. Conservative; consumers needing exact accounting
				// should reconcile with the transaction's real balance changes.
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
					const owner =
						arg.withdrawFrom === 'Sender'
							? (sender ?? null)
							: (normalizeAddress(gasOwner ?? null) ?? sender);
					trackedCoins.set(
						`result:${command.index},0`,
						TrackedCoin.single(arg.coinType, arg.amount, normalizeAddress(owner)),
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
					// Value-preserving 1:1 conversion — just re-key the existing
					// TrackedCoin instead of cloning its segments.
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
					const taken = source.takeSegments(amount);
					trackedCoins.set(
						`result:${command.index},0`,
						TrackedCoin.fromSegments(source.coinType, taken),
					);
					return true;
				}

				if (fn === 'withdraw_all' && mod === 'balance') {
					// balance::withdraw_all(&mut Balance<T>) -> Balance<T>
					// Moves the entire balance out of the source into a new Balance.
					// The source balance reference still exists on-chain (it's `&mut`),
					// but its value is now 0 — keep the old tracked coin around with
					// drained segments so stale references see an empty coin.
					if (command.arguments.length < 1) return false;
					const source = getTrackedCoin(command.arguments[0]);
					if (source) {
						trackedCoins.set(
							`result:${command.index},0`,
							TrackedCoin.fromSegments(source.coinType, source.drainSegments()),
						);
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
					// Asymmetry note: if `source` is untracked we silently no-op
					// (nothing to fold into dest). If `dest` is untracked we flush
					// `source` to an unknown destination so its origins are still
					// charged. Either way the source's value is accounted for.
					if (command.arguments.length < 2) return false;
					const dest = getTrackedCoin(command.arguments[0]);
					const source = getTrackedCoin(command.arguments[1]);
					if (!source) return true;
					if (dest) {
						dest.absorbSegments(source.segments);
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
					if (coinType) {
						trackedCoins.set(`result:${command.index},0`, TrackedCoin.single(coinType, 0n, null));
					}
					return true;
				}

				// Known gaps worth covering in a follow-up:
				//   - coin::mint / coin::mint_and_transfer (TreasuryCap<T>): untracked inflow
				//   - 0x2::pay module (split, split_and_transfer, join_vec)
				// All other 0x2::coin / 0x2::balance functions (destroy_zero, divide_into_n,
				// value, etc.) fall through to the generic MoveCall handler which flushes
				// all by-value arguments as outflow from their owner.
				return false;
			};

			// --- Setup: gas coin + reservations + object inputs ---

			const suiType = normalizeStructTag('0x2::sui::SUI');
			const normalizedGasOwner = normalizeAddress(gasOwner ?? null);

			// Gas coin segments: one per real gas coin (owned by gas owner) plus one
			// per reservation. Reservations live on a dedicated rule but behave the
			// same as coins owned by the gas owner for outflow tracking.
			const gasSegments: OriginSegment[] = [];
			for (const c of gasCoins) {
				if (c.balance > 0n) {
					gasSegments.push({ ownerAddress: normalizedGasOwner, amount: c.balance });
				}
			}
			for (const r of coinReservations) {
				if (r.balance > 0n) {
					gasSegments.push({
						ownerAddress: normalizeAddress(r.owner),
						amount: r.balance,
					});
				}
			}
			trackedCoins.set('gas', TrackedCoin.fromSegments(suiType, gasSegments));

			if (data.gasData.budget) {
				const budget = BigInt(data.gasData.budget);
				// Gas budget is paid to the network — outflow from whoever holds the
				// gas coin's balance (the gas owner in the normal case, or a mix when
				// reservations owned by a different address are included). Take the
				// budget off the gas coin's segments and charge each segment's owner.
				const gas = trackedCoins.get('gas')!;
				const paid = gas.takeSegments(budget);
				for (const seg of paid) {
					if (seg.ownerAddress) {
						addOutflow(seg.ownerAddress, suiType, seg.amount);
					}
				}
			} else {
				issues.push({ message: 'Gas budget not set in Transaction' });
			}

			for (const input of inputs) {
				if (input.$kind === 'Object' && coins[input.object.objectId]) {
					const coin = coins[input.object.objectId];
					trackedCoins.set(
						`input:${input.index}`,
						TrackedCoin.single(coin.coinType, coin.balance, normalizeAddress(coin.ownerAddress)),
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
							// by value or &mut as outflow from their origin(s). Immutable
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

			const toFlowList = (m: Map<string, bigint>): CoinFlow[] =>
				Array.from(m, ([coinType, amount]) => ({ coinType, amount })).filter((f) => f.amount > 0n);

			const byAddress: Record<string, AddressFlows> = {};
			for (const [address, bucket] of flowsByAddress) {
				const outflows = toFlowList(bucket.outflows);
				const inflows = toFlowList(bucket.inflows);
				if (outflows.length === 0 && inflows.length === 0) continue;
				byAddress[address] = { outflows, inflows };
			}

			return {
				result: { byAddress } satisfies AddressCoinFlowsResult,
			};
		},
});

const EMPTY_FLOWS: AddressFlows = { outflows: [], inflows: [] };

/**
 * The transaction sender's coin flows. Default rule for "what is the user
 * spending/receiving?" — `outflows` lists value that left the sender,
 * `inflows` lists value that arrived at the sender. For the sponsor view see
 * {@link sponsorFlows}; for arbitrary addresses see {@link addressCoinFlows}.
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
	/**
	 * Origin segments composing this coin's current balance, coalesced by owner:
	 * each owner appears at most once. Invariant maintained by the constructors
	 * and by {@link absorbSegments}; {@link takeSegments} preserves it because it
	 * only reduces per-segment amounts and filters zeros.
	 */
	segments: OriginSegment[];

	private constructor(coinType: string, segments: OriginSegment[]) {
		this.coinType = coinType;
		this.segments = segments;
	}

	/** Create a coin with a single origin owning the full balance. */
	static single(coinType: string, balance: bigint, ownerAddress: string | null): TrackedCoin {
		return new TrackedCoin(coinType, balance > 0n ? [{ ownerAddress, amount: balance }] : []);
	}

	/**
	 * Create a coin from an existing list of segments (deep-copied). Zero /
	 * negative amounts are dropped and same-owner segments are coalesced so the
	 * instance starts with the coalesced-by-owner invariant satisfied.
	 */
	static fromSegments(coinType: string, segments: OriginSegment[]): TrackedCoin {
		const coalesced: OriginSegment[] = [];
		for (const seg of segments) {
			if (seg.amount <= 0n) continue;
			const existing = coalesced.find((s) => s.ownerAddress === seg.ownerAddress);
			if (existing) {
				existing.amount += seg.amount;
			} else {
				coalesced.push({ ownerAddress: seg.ownerAddress, amount: seg.amount });
			}
		}
		return new TrackedCoin(coinType, coalesced);
	}

	get remainingBalance(): bigint {
		let total = 0n;
		for (const s of this.segments) total += s.amount;
		return total;
	}

	/** Empty this coin's segments (e.g. fully consumed by a PTB command). */
	consume() {
		this.segments = [];
	}

	/**
	 * Remove and return all segments. Used by conversions (into_balance /
	 * from_balance / withdraw_all) that preserve value 1:1 into a new tracked
	 * coin at a different result key.
	 */
	drainSegments(): OriginSegment[] {
		const drained = this.segments;
		this.segments = [];
		return drained;
	}

	/**
	 * Take `amount` off this coin, returning the removed segments and shrinking
	 * `this.segments` in place. Each origin loses a share proportional to its
	 * fraction of the total.
	 *
	 * Ordering invariant: the algorithm walks segments in array order and uses
	 * floor(seg.amount * amount / total); the last segment absorbs any rounding
	 * remainder. Exact fractions are deterministic, but under inexact divisions
	 * the per-origin split of a take can shift by up to 1 unit depending on
	 * which origin happens to be last in the list (i.e., which merge order
	 * produced the current segments). Total conservation is unaffected. Callers
	 * should not rely on exact per-origin numbers after inexact splits.
	 *
	 * If `amount` >= the remaining balance, drains everything.
	 */
	takeSegments(amount: bigint): OriginSegment[] {
		if (amount <= 0n || this.segments.length === 0) return [];
		const total = this.remainingBalance;
		if (amount >= total) return this.drainSegments();

		const taken: OriginSegment[] = [];
		let remaining = amount;
		for (let i = 0; i < this.segments.length; i++) {
			const seg = this.segments[i];
			const take = i === this.segments.length - 1 ? remaining : (seg.amount * amount) / total;
			if (take > 0n) {
				taken.push({ ownerAddress: seg.ownerAddress, amount: take });
				seg.amount -= take;
				remaining -= take;
			}
		}
		this.segments = this.segments.filter((s) => s.amount > 0n);
		return taken;
	}

	/**
	 * Absorb segments from another coin (destination side of a merge/join).
	 * Segments with the same owner are coalesced so the list stays compact
	 * even under repeated merges.
	 */
	absorbSegments(incoming: OriginSegment[]) {
		for (const seg of incoming) {
			if (seg.amount <= 0n) continue;
			const existing = this.segments.find((s) => s.ownerAddress === seg.ownerAddress);
			if (existing) {
				existing.amount += seg.amount;
			} else {
				this.segments.push({ ...seg });
			}
		}
	}
}
