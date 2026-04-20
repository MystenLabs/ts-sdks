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
	/** Value that left this address (transferred away or consumed by a MoveCall). */
	outflows: CoinFlow[];
	/** Value that arrived at this address from another address. */
	inflows: CoinFlow[];
}

/**
 * Per-address coin flows. Keys are addresses that owned tracked value at some
 * point in the transaction; values describe what that address sent out and
 * what it received. Value that enters the tracked world from an unknown
 * origin (e.g. `coin::zero`) doesn't contribute to any address's outflow,
 * and value whose destination we can't determine (e.g. a generic MoveCall
 * consume) contributes to the origin's outflow but to no address's inflow.
 *
 * Most consumers want {@link coinFlows} (sender-focused) or
 * {@link sponsorFlows} rather than this broader view.
 */
export interface AddressCoinFlowsResult {
	byAddress: Record<string, AddressFlows>;
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

/**
 * Per-address flow tracking. Each tracked value is tagged with the address
 * that owns it; splits/joins/conversions preserve the owner. Movement events
 * produce outflows for the current owner and inflows for the destination
 * when it can be determined.
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
			 * Credit movement of `tracked.remainingBalance` from its current owner to
			 * `destAddress`. `destAddress = null` means the destination is unknown
			 * (generic MoveCall consumption, dynamic transfer address, etc.) — the
			 * owner is charged an outflow but no inflow is recorded.
			 */
			const flushToDestination = (tracked: TrackedCoin, destAddress: string | null) => {
				const amount = tracked.remainingBalance;
				const owner = tracked.ownerAddress;
				const dest = normalizeAddress(destAddress);

				if (owner && dest !== owner) {
					addOutflow(owner, tracked.coinType, amount);
				}
				if (dest && dest !== owner) {
					addInflow(dest, tracked.coinType, amount);
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

				// Dynamic amounts force us to assume the coin is fully consumed to an
				// unknown destination.
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
						new TrackedCoin(coin.coinType, amount, coin.ownerAddress),
					);
				});
			};

			const mergeCoins = (command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) => {
				const dest = getTrackedCoin(command.destination);
				const sources = command.sources.map(getTrackedCoin);

				for (const src of sources) {
					if (!src) continue;
					if (dest && src.ownerAddress === dest.ownerAddress) {
						// Same owner: fold source balance into dest.
						dest.remainingBalance += src.remainingBalance;
						src.consume();
					} else {
						// Mixed-owner merge: charge source's owner an outflow and credit
						// the dest owner (if known) an inflow. Crucially we do NOT add
						// the balance to dest.remainingBalance — that value has already
						// been accounted for via this outflow/inflow pair, and if dest is
						// later transferred we only want to charge dest's own owner.
						flushToDestination(src, dest?.ownerAddress ?? null);
					}
				}
			};

			const transferObjects = (command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) => {
				// A dynamic (non-Pure) address — e.g. a MoveCall result — is treated
				// as an unknown destination and charged as outflow from the origin
				// with no inflow recorded. Conservative: if the runtime would route
				// the transfer back to sender, we'll over-count.
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
					// Sender and Sponsor both map to real addresses here. Sponsor's
					// address is the gas owner by construction; if gasOwner isn't set
					// we fall back to sender.
					const owner =
						arg.withdrawFrom === 'Sender'
							? (sender ?? null)
							: (normalizeAddress(gasOwner ?? null) ?? sender);
					trackedCoins.set(
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
					if (command.arguments.length < 1) return false;
					const tracked = getTrackedCoin(command.arguments[0]);
					if (tracked) {
						trackedCoins.set(
							`result:${command.index},0`,
							new TrackedCoin(tracked.coinType, tracked.remainingBalance, tracked.ownerAddress),
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
						new TrackedCoin(source.coinType, amount, source.ownerAddress),
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
							new TrackedCoin(source.coinType, source.remainingBalance, source.ownerAddress),
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
						if (dest && source.ownerAddress === dest.ownerAddress) {
							dest.remainingBalance += source.remainingBalance;
							source.consume();
						} else {
							// Mixed-owner join: see mergeCoins above for the reasoning.
							flushToDestination(source, dest?.ownerAddress ?? null);
						}
					}
					return true;
				}

				// --- Zero creation ---

				if (fn === 'zero' && (mod === 'coin' || mod === 'balance')) {
					// coin::zero(&mut TxContext) -> Coin<T>
					// balance::zero() -> Balance<T>
					if (coinType) {
						trackedCoins.set(`result:${command.index},0`, new TrackedCoin(coinType, 0n, null));
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

			// Gas coin balance = sum of real gas coins plus reservation balances.
			const gasBalance =
				gasCoins.reduce((a, c) => a + c.balance, 0n) +
				coinReservations.reduce((a, r) => a + r.balance, 0n);

			trackedCoins.set('gas', new TrackedCoin(suiType, gasBalance, normalizedGasOwner));

			if (data.gasData.budget) {
				if (normalizedGasOwner) {
					// Gas budget is paid to the network — an outflow from the gas owner,
					// no inflow anywhere.
					addOutflow(normalizedGasOwner, suiType, BigInt(data.gasData.budget));
				}
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
							// Generic MoveCall: flush tracked coin/balance arguments passed
							// by value or &mut as outflow from their owner. Immutable
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
 * The transaction sender's coin flows. This is the default rule for "what is
 * the user spending/receiving?" — `outflows` lists value that left the
 * sender, `inflows` lists value that arrived at the sender. For the sponsor
 * view see {@link sponsorFlows}; for arbitrary addresses see {@link addressCoinFlows}.
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
	remainingBalance: bigint;
	/**
	 * Address that owns this tracked value. `null` means the value didn't come
	 * from any known address (e.g. `coin::zero`) — movement doesn't produce an
	 * outflow for any address, though a known destination still records an
	 * inflow.
	 */
	ownerAddress: string | null;
	consumed = false;

	constructor(coinType: string, balance: bigint, ownerAddress: string | null) {
		this.coinType = coinType;
		this.remainingBalance = balance;
		this.ownerAddress = ownerAddress;
	}

	consume() {
		this.remainingBalance = 0n;
		this.consumed = true;
	}
}
