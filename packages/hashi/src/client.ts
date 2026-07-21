// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import type { VariablesOf } from '@mysten/sui/graphql/schema';
import { graphql } from '@mysten/sui/graphql/schema';
import type { Signer } from '@mysten/sui/cryptography';
import { bcs, TypeTagSerializer } from '@mysten/sui/bcs';
import { fromHex, deriveDynamicFieldID, normalizeSuiAddress } from '@mysten/sui/utils';
import { base58 } from '@scure/base';
import { Transaction } from '@mysten/sui/transactions';
import { Hashi } from './contracts/hashi/hashi.js';
import { BitcoinState, BitcoinStateKey } from './contracts/hashi/bitcoin_state.js';
import { DepositRequest } from './contracts/hashi/deposit_queue.js';
import { Bag } from './contracts/hashi/deps/sui/bag.js';
import { WithdrawalRequest, WithdrawalTransaction } from './contracts/hashi/withdrawal_queue.js';
import { UtxoId as UtxoIdBcs } from './contracts/hashi/utxo.js';
import * as depositModule from './contracts/hashi/deposit.js';
import * as withdrawModule from './contracts/hashi/withdraw.js';
import * as utxoModule from './contracts/hashi/utxo.js';
import type { RawTransactionArgument } from './contracts/utils/index.js';
import {
	generateDepositAddress as generateDepositAddressRaw,
	arkworksToSec1Compressed,
	bitcoinAddressToWitnessProgram,
} from './bitcoin.js';
import {
	DUST_RELAY_MIN_VALUE,
	GUARDIAN_BTC_PUBLIC_KEY_LEN,
	GUARDIAN_PUBLIC_KEY_LEN,
	NETWORK_CONFIG,
} from './constants.js';
import type { AmountViolation } from './errors.js';
import {
	AmountBelowMinimumError,
	HashiConfigError,
	HashiFetchError,
	HashiGuardianError,
	HashiPausedError,
	InvalidParamsError,
} from './errors.js';
import type {
	BitcoinNetwork,
	CancelWithdrawalParams,
	DepositFees,
	DepositHistoryItem,
	DepositInfo,
	DepositParams,
	DepositStatus,
	GovernanceConfig,
	GuardianInfoProvider,
	GuardianLimiterRaw,
	GuardianLimiterSnapshot,
	GuardianWithdrawCheck,
	HashiClientOptions,
	HbtcBalance,
	RawGuardianInfo,
	SuiNetwork,
	TransactionHistoryItem,
	UtxoId,
	UtxoLookupResult,
	UtxoUsageResult,
	WaitOptions,
	WithdrawalFees,
	WithdrawalHistoryItem,
	WithdrawalInfo,
	WithdrawalParams,
	WithdrawalStatus,
} from './types.js';
import { lookupVout, lookupAllVouts, getTxConfirmations } from './btc-rpc.js';
import { projectCapacity, estimateWaitSecs, fetchGuardianInfo } from './guardian.js';
import { assertHex32, configBytes, entry, reverseTxidBytes, type ConfigEntry } from './util.js';

/** ObjectBag dynamic field name type (Wrapper<address> for dynamic_object_field lookups). */
const OBJECT_BAG_ADDRESS_TYPE =
	'0x0000000000000000000000000000000000000000000000000000000000000002::dynamic_object_field::Wrapper<address>';

/** Max value of an unsigned 32-bit integer; vout is a u32 on the Bitcoin side. */
const U32_MAX = 0xffffffff;

/** Events of a type emitted by a sender, paginated; used by `#queryEventRequestIds`. */
const EVENT_REQUEST_IDS_QUERY = graphql(`
	query EventRequestIds($sender: SuiAddress!, $type: String!, $after: String) {
		events(filter: { sender: $sender, type: $type }, first: 50, after: $after) {
			nodes {
				contents {
					json
				}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
	}
`);

const GRAPHQL_URLS: Record<string, string> = {
	devnet: 'https://fullnode.devnet.sui.io:443/graphql',
	testnet: 'https://fullnode.testnet.sui.io:443/graphql',
	mainnet: 'https://fullnode.mainnet.sui.io:443/graphql',
	localnet: 'http://127.0.0.1:9000/graphql',
};

function defaultGraphqlUrl(network: string): string {
	return GRAPHQL_URLS[network] ?? GRAPHQL_URLS['mainnet']!;
}

/**
 * Recognize the per-object errors that mean "the object (or dynamic field)
 * genuinely does not exist" — the only Error shape that `findUsedUtxos` is
 * allowed to treat as a pool miss. Anything else (deleted, displayError,
 * unknown) must propagate so other per-object failures can't be silently
 * downgraded to "not used."
 *
 * Two transports, two shapes:
 * - JSON-RPC returns a typed `ObjectError` whose `.code` is `notExists` or
 *   `dynamicFieldNotFound`. `ObjectError` is not re-exported from
 *   `@mysten/sui/client`, so the guard duck-types the field.
 * - gRPC stringifies the per-object error into `new Error(message)` with no
 *   code (see the `TODO: improve error handling` in `@mysten/sui/grpc/core.ts`).
 *   For now the only signal is the message, which the Sui ledger service
 *   returns as exactly `Object <id> not found` for missing objects.
 *
 * Transport-level failures don't show up here — they reject the whole
 * `getObjects` promise rather than appearing in the result array.
 */
const GRPC_NOT_FOUND_MESSAGE_RE = /^Object 0x[0-9a-f]+ not found$/i;

function isObjectNotFoundError(err: Error): boolean {
	const code = (err as Error & { code?: unknown }).code;
	if (code === 'notExists' || code === 'dynamicFieldNotFound') return true;
	return code === undefined && GRPC_NOT_FOUND_MESSAGE_RE.test(err.message);
}

export function hashi<const Name = 'hashi'>({
	name = 'hashi' as Name,
	...options
}: HashiClientOptions<Name> = {}) {
	return {
		name,
		register: (client: ClientWithCoreApi) => {
			return new HashiClient({ client, ...options });
		},
	};
}

/**
 * User-facing SDK client for the Hashi protocol. Constructed via the
 * `hashi({...})` factory and attached to any Sui client via `$extend`:
 *
 * ```ts
 * const client = new SuiGrpcClient({ network: "devnet", ... }).$extend(hashi());
 * const result = await client.hashi.deposit({ signer, ... });
 * ```
 *
 * **Direct methods (`deposit`, `withdraw`) sign and execute transactions** on
 * behalf of the caller — pass a `Signer` and receive the execution result.
 * For composable flows (bundling into a larger PTB, sponsored transactions,
 * dry-run/simulation), use the `tx.*` builders instead; they return unsigned
 * `Transaction` objects and leave signing to the caller.
 */
export class HashiClient {
	#client: ClientWithCoreApi;
	#hashiObjectId: string;
	#packageId: string;
	#bitcoinNetwork: BitcoinNetwork;
	#btcRpcUrl: string | undefined;
	#graphql: SuiGraphQLClient;
	#guardianUrl: string | undefined;
	#guardianInfoProvider: GuardianInfoProvider | undefined;
	// A URL resolved from the on-chain `guardian_url`, cached once found. Stays
	// `undefined` while `guardian_url` is still absent (pre-launch), so we keep
	// re-reading the chain until launch (`finish_publish`) publishes it.
	#resolvedGuardianUrl: string | undefined;

	constructor({
		client,
		hashiObjectId,
		packageId,
		bitcoinNetwork,
		btcRpcUrl,
		graphqlUrl,
		guardianUrl,
		guardianInfoProvider,
	}: {
		client: ClientWithCoreApi;
		hashiObjectId?: string;
		packageId?: string;
		bitcoinNetwork?: BitcoinNetwork;
		btcRpcUrl?: string;
		graphqlUrl?: string;
		guardianUrl?: string;
		guardianInfoProvider?: GuardianInfoProvider;
	}) {
		const network = client.network;
		const config = NETWORK_CONFIG[network as SuiNetwork];
		const resolvedObjectId = hashiObjectId ?? config?.hashiObjectId;
		const resolvedPackageId = packageId ?? config?.packageId;
		if (!resolvedObjectId || !resolvedPackageId) {
			throw new Error(
				`Hashi is not yet supported on Sui ${network}. Provide a custom hashiObjectId and packageId.`,
			);
		}
		this.#client = client;
		this.#hashiObjectId = resolvedObjectId;
		this.#packageId = resolvedPackageId;
		this.#bitcoinNetwork = bitcoinNetwork ?? config?.bitcoinNetwork ?? 'testnet';
		this.#btcRpcUrl = btcRpcUrl;
		this.#graphql = new SuiGraphQLClient({
			url: graphqlUrl ?? defaultGraphqlUrl(network),
			network,
		});
		this.#guardianUrl = guardianUrl;
		this.#guardianInfoProvider = guardianInfoProvider;
	}

	/**
	 * Generates a unique Bitcoin P2TR deposit address for a Sui address.
	 *
	 * Fetches the MPC committee public key and the guardian's BTC public key
	 * from on-chain, derives an MPC child key against the Sui address, and
	 * builds the Hashi taproot script tree: an immediate 2-of-2 leaf
	 * (`multi_a(2, guardian, derived_mpc)`) plus a delayed MPC-only recovery
	 * leaf. The address matches the bridge's on-chain
	 * `validate_deposit_request_derivation_path` check byte-for-byte.
	 *
	 * The MPC key (`committee_set.mpc_public_key`) and the guardian key
	 * (`guardian_btc_public_key` config) come from a single fetch of the
	 * Hashi object, and only those two fields are parsed — an unrelated
	 * malformed config entry can't block deposit-address generation.
	 *
	 * Throws `HashiConfigError` if the deployment isn't guardian-provisioned
	 * yet (no `guardian_btc_public_key` on chain). The SDK refuses to fall
	 * back to a single-key address because the bridge validator rejects it.
	 *
	 * @example
	 * ```ts
	 * const btcAddress = await client.hashi.generateDepositAddress({
	 *   suiAddress: signer.toSuiAddress(),
	 * });
	 * ```
	 */
	async generateDepositAddress({
		suiAddress,
		bitcoinNetwork = this.#bitcoinNetwork,
	}: {
		/** The Sui address to generate a deposit address for (hex string with 0x prefix). */
		suiAddress: string;
		/** Override the default Bitcoin network for this call. */
		bitcoinNetwork?: BitcoinNetwork;
	}): Promise<string> {
		const { json, contents } = await this.#fetchHashiObject();
		return generateDepositAddressRaw({
			mpcMasterCompressed: parseMpcPublicKey(json.committee_set.mpc_public_key),
			guardianBtcXOnly: configBytes(
				contents,
				'guardian_btc_public_key',
				GUARDIAN_BTC_PUBLIC_KEY_LEN,
			),
			suiAddress: fromHex(normalizeSuiAddress(suiAddress)),
			network: bitcoinNetwork,
		});
	}

	/**
	 * Submit one or more Bitcoin deposits for committee confirmation, batched
	 * into a single Sui PTB. Signs with `signer` and submits, returning the
	 * execution result (`$kind: "Transaction" | "FailedTransaction"`). The
	 * result includes `effects` and `events` so callers can confirm
	 * `DepositRequested` without an extra round-trip.
	 *
	 * The method runs three preflight stages before signing:
	 *
	 *   1. **Structural validation** — `txid` and `recipient` must be
	 *      0x-prefixed 32-byte hex; `utxos` must be non-empty; every `vout`
	 *      must be a non-negative u32 and unique within the call. Violations
	 *      throw `InvalidParamsError` without any chain read.
	 *   2. **Pause check** — reads the governance snapshot via `view.all()`
	 *      and throws `HashiPausedError` if `paused` is `true`. Mirrors the
	 *      Move-side `hashi::assert_unpaused`.
	 *   3. **Minimum check** — every UTXO must have `amountSats ≥
	 *      snap.bitcoinDepositMinimum`. All offenders are collected into one
	 *      `AmountBelowMinimumError`, so callers can fix the batch in one
	 *      round-trip. Mirrors `EBelowMinimumDeposit` in `deposit::deposit`.
	 *
	 * Both chain-reading checks (2, 3) read from the same `view.all()`
	 * snapshot, so validation is internally consistent. Chain state can still
	 * drift between the snapshot and execution — the Move side re-asserts
	 * both invariants, so a genuine race simply aborts the tx.
	 *
	 * For composable flows (sponsored tx, dry-run, or bundling into a larger
	 * PTB), use `tx.deposit(params)` instead — it returns the unsigned
	 * `Transaction` and leaves signing to the caller.
	 */
	async deposit({
		signer,
		...params
	}: DepositParams & {
		/** Signs and pays for the resulting transaction. The signer's address becomes the tx sender. */
		signer: Signer;
	}) {
		this.#validateDepositParams(params);

		const snap = await this.view.all();
		if (snap.paused) {
			throw new HashiPausedError({ operation: 'deposit' });
		}

		const violations: AmountViolation[] = [];
		for (const { vout, amountSats } of params.utxos) {
			if (amountSats < snap.bitcoinDepositMinimum) {
				violations.push({
					amount: amountSats,
					minimum: snap.bitcoinDepositMinimum,
					vout,
				});
			}
		}
		if (violations.length > 0) {
			throw new AmountBelowMinimumError({ violations });
		}

		const transaction = this.tx.deposit(params);
		return this.#client.core.signAndExecuteTransaction({
			signer,
			transaction,
			include: { effects: true, events: true },
		});
	}
	/**
	 * Submit a BTC withdrawal request for committee processing. Burns `hBTC`
	 * from the signer's balance and enqueues a request for the committee to
	 * send `amountSats` to `bitcoinAddress` on the Bitcoin network. Signs
	 * with `signer` and submits, returning the execution result including
	 * `effects` and `events` (`WithdrawalRequested`).
	 *
	 * The method runs three preflight stages before signing:
	 *
	 *   1. **Address decoding** — `bitcoinAddress` is decoded as bech32 (v0
	 *      P2WPKH, 20 bytes) or bech32m (v1 P2TR, 32 bytes) via
	 *      `bitcoinAddressToWitnessProgram`. The HRP must match the client's
	 *      configured Bitcoin network. Violations throw
	 *      `InvalidBitcoinAddressError` with a structured `code` so callers
	 *      can distinguish a typo from a wrong-network mistake.
	 *   2. **Pause check** — reads the governance snapshot via `view.all()`
	 *      and throws `HashiPausedError` if `paused` is `true`. Mirrors the
	 *      Move-side `hashi::assert_unpaused` in `request_withdrawal`.
	 *   3. **Minimum check** — `amountSats` must be ≥
	 *      `snap.bitcoinWithdrawalMinimum`. Below-minimum throws
	 *      `AmountBelowMinimumError` with a single violation. Mirrors
	 *      `EBelowMinimumWithdrawal` in `withdraw::request_withdrawal`.
	 *
	 * For composable flows (sponsored tx, dry-run, or bundling into a
	 * larger PTB), use `tx.requestWithdrawal(options)` instead — it returns
	 * the unsigned `Transaction` and leaves signing to the caller.
	 */
	async requestWithdrawal({
		signer,
		...params
	}: WithdrawalParams & {
		/** Signs and pays for the resulting transaction. The signer's address becomes the tx sender. */
		signer: Signer;
	}) {
		const { program } = bitcoinAddressToWitnessProgram(params.bitcoinAddress, this.#bitcoinNetwork);

		const snap = await this.view.all();
		if (snap.paused) {
			throw new HashiPausedError({ operation: 'withdraw' });
		}
		if (params.amountSats < snap.bitcoinWithdrawalMinimum) {
			throw new AmountBelowMinimumError({
				violations: [
					{
						amount: params.amountSats,
						minimum: snap.bitcoinWithdrawalMinimum,
					},
				],
			});
		}

		const transaction = this.tx.requestWithdrawal({
			amount: params.amountSats,
			bitcoinAddress: program,
		});
		return this.#client.core.signAndExecuteTransaction({
			signer,
			transaction,
			include: { effects: true, events: true },
		});
	}

	/**
	 * Cancel a pending withdrawal request and return the locked BTC to the
	 * signer. Signs with `signer` and submits, returning the execution result.
	 *
	 * The only client-side precondition is that `requestId` is 0x-prefixed
	 * 32-byte hex. All other constraints — ownership (only the original
	 * requester can cancel), state window (cancellable only while `Requested`
	 * or `Approved`, not after committee commitment), and the on-chain
	 * `withdrawal_cancellation_cooldown_ms` — are enforced by the Move side
	 * and left to abort at execution. Pre-fetching them would cost an extra
	 * round-trip and still race chain state.
	 *
	 * Unlike `requestWithdrawal`, no pause check is performed: the Move
	 * `cancel_withdrawal` function has no `assert_unpaused`, so users can
	 * always unwind a pending request even when the system is paused.
	 *
	 * For composable flows, use `tx.cancelWithdrawal({ requestId, recipient })`.
	 */
	async cancelWithdrawal({
		signer,
		requestId,
	}: CancelWithdrawalParams & {
		/** Signs and pays for the resulting transaction. The signer's address becomes the tx sender and the recipient of the returned BTC. */
		signer: Signer;
	}) {
		assertHex32(requestId, 'requestId');

		const transaction = this.tx.cancelWithdrawal({
			requestId,
			recipient: signer.toSuiAddress(),
		});
		return this.#client.core.signAndExecuteTransaction({
			signer,
			transaction,
			include: { effects: true, events: true },
		});
	}

	#validateDepositParams(params: DepositParams): void {
		assertHex32(params.txid, 'txid');
		assertHex32(params.recipient, 'recipient');
		if (params.utxos.length === 0) {
			throw new InvalidParamsError({
				reason: '`utxos` must contain at least one UTXO',
			});
		}
		const seen = new Set<number>();
		for (const { vout } of params.utxos) {
			if (!Number.isInteger(vout) || vout < 0 || vout > U32_MAX) {
				throw new InvalidParamsError({
					reason: '`vout` must be a non-negative u32 integer',
					detail: `got ${JSON.stringify(vout)}`,
				});
			}
			if (seen.has(vout)) {
				throw new InvalidParamsError({
					reason: 'duplicate `vout` within a single deposit',
					detail: `vout ${vout} appears more than once (each output of a single txid must be unique)`,
				});
			}
			seen.add(vout);
		}
	}

	// User-facing transaction builders — compose `call.*` thunks into a full
	// PTB and return the unsigned `Transaction`. Execution (sign + dry-run +
	// submit) is the direct-method layer's concern and happens elsewhere.
	tx = {
		/**
		 * Build a transaction that submits one or more Bitcoin deposits for
		 * committee confirmation, batched into a single Sui PTB.
		 *
		 * A single Bitcoin funding tx can pay the same deposit address on
		 * multiple outputs (e.g. change + donation, or a coinjoin). Rather
		 * than forcing the user to submit one Sui tx per output, this method
		 * accepts every qualifying output and emits a dedicated Move-call
		 * triple per UTXO:
		 *
		 *     utxo::utxo_id(txid, vout_i)   → UtxoId
		 *     utxo::utxo(utxoId, amount_i, derivationPath = recipient)  → Utxo
		 *     deposit::deposit(hashi, utxo)
		 *
		 * The triples are emitted in `params.utxos` order, so N UTXOs yield
		 * exactly `3 * N` PTB commands.
		 *
		 * Because all triples live in one PTB, execution is atomic: either
		 * every deposit is recorded, or none are (any abort — wrong minimum,
		 * replayed UTXO, paused system — reverts the whole transaction).
		 *
		 * All UTXOs share the `txid` because `DepositParams` has a single
		 * top-level `txid` field, and are credited to the same `recipient`.
		 *
		 * The `txid` is provided in **display byte order** (the form
		 * mempool.space and `bitcoin-cli` show); this method reverses it
		 * to internal byte order before recording on-chain via
		 * `reverseTxidBytes`. The committee verifier reads `Utxo.txid`
		 * as a `bitcoin::Txid`, which expects internal byte order — so
		 * recording display-order bytes leaves the committee searching
		 * for a phantom (byte-reversed) tx and the deposit never confirms.
		 *
		 * @example
		 * ```ts
		 * const tx = client.hashi.tx.deposit({
		 *   txid: `0x${btcTxid}`,
		 *   utxos: [
		 *     { vout: 0, amountSats: 100_000n },
		 *     { vout: 2, amountSats:  50_000n },
		 *   ],
		 *   recipient: signer.toSuiAddress(),
		 * });
		 * await client.signAndExecuteTransaction({ signer, transaction: tx });
		 * ```
		 */
		deposit: (params: DepositParams): Transaction => {
			const tx = new Transaction();
			const internalTxid = `0x${reverseTxidBytes(params.txid)}`;
			for (const { vout, amountSats } of params.utxos) {
				const utxoId = tx.add(
					utxoModule.utxoId({
						package: this.#packageId,
						arguments: { txid: internalTxid, vout },
					}),
				);
				const utxo = tx.add(
					utxoModule.utxo({
						package: this.#packageId,
						arguments: {
							utxoId,
							amount: amountSats,
							derivationPath: params.recipient,
						},
					}),
				);
				tx.add(this.call.deposit({ utxo }));
			}
			return tx;
		},

		/**
		 * Build a transaction that submits a BTC withdrawal request. Sources a
		 * `Balance<BTC>` via `tx.balance` and passes it to
		 * `withdraw::request_withdrawal` along with the target Bitcoin output
		 * address.
		 */
		requestWithdrawal: (options: {
			/** Amount in sats to withdraw. Must be ≥ the on-chain withdrawal minimum. */
			amount: bigint;
			/**
			 * Target Bitcoin address as raw witness program bytes — 20 bytes for
			 * P2WPKH, 32 bytes for P2TR. Callers decode their own bech32(m)
			 * strings for now; a string-input overload may land in a follow-up.
			 */
			bitcoinAddress: Uint8Array;
		}): Transaction => {
			const tx = new Transaction();
			const balance = tx.balance({
				type: `${this.#packageId}::btc::BTC`,
				balance: options.amount,
			});
			tx.add(
				this.call.requestWithdrawal({
					btc: balance,
					bitcoinAddress: Array.from(options.bitcoinAddress),
				}),
			);
			return tx;
		},

		/**
		 * Build a transaction that cancels a pending withdrawal request and
		 * returns the locked BTC to the user. Consumes the `Balance<BTC>`
		 * hot-potato returned by `withdraw::cancel_withdrawal` by wrapping it
		 * into a `Coin<BTC>` and transferring to `recipient`.
		 */
		cancelWithdrawal: (options: {
			/** The withdrawal request ID to cancel. */
			requestId: string;
			/**
			 * Sui address that will receive the returned `Coin<BTC>`. Required
			 * because the unsigned `Transaction` does not know its sender at
			 * build time — the caller must pass their own address explicitly.
			 */
			recipient: string;
		}): Transaction => {
			const tx = new Transaction();
			const balance = tx.add(this.call.cancelWithdrawal({ requestId: options.requestId }));
			const [coin] = tx.moveCall({
				package: '0x2',
				module: 'coin',
				function: 'from_balance',
				typeArguments: [`${this.#packageId}::btc::BTC`],
				arguments: [balance],
			});
			tx.transferObjects([coin], options.recipient);
			return tx;
		},
	};

	// Move call helpers — thin wrappers over generated bindings that auto-inject
	// the Hashi shared object and the resolved package id. Each returns a thunk
	// suitable for `tx.add(...)`. Only user-facing Hashi calls are exposed here;
	// operator/committee calls are intentionally not part of this surface.
	call = {
		deposit: (options: { utxo: RawTransactionArgument<string> }) =>
			depositModule.deposit({
				package: this.#packageId,
				arguments: { hashi: this.#hashiObjectId, utxo: options.utxo },
			}),
		requestWithdrawal: (options: {
			btc: RawTransactionArgument<string>;
			bitcoinAddress: RawTransactionArgument<number[]>;
		}) =>
			withdrawModule.requestWithdrawal({
				package: this.#packageId,
				arguments: {
					hashi: this.#hashiObjectId,
					btc: options.btc,
					bitcoinAddress: options.bitcoinAddress,
				},
			}),
		/**
		 * Cancel a pending withdrawal request. Returns a `Balance<BTC>` hot potato
		 * that must be consumed in the same PTB (e.g. wrapped into a Coin and
		 * transferred back to the sender).
		 */
		cancelWithdrawal: (options: { requestId: RawTransactionArgument<string> }) =>
			withdrawModule.cancelWithdrawal({
				package: this.#packageId,
				arguments: { hashi: this.#hashiObjectId, requestId: options.requestId },
			}),
	};

	/**
	 * Parses the `Hashi.config.config` VecMap contents into a typed snapshot,
	 * applying the same floors as the Move accessors so the SDK matches
	 * on-chain semantics exactly.
	 */
	#parseConfig(contents: readonly ConfigEntry[]): GovernanceConfig {
		const u64 = (key: string): bigint => {
			const v = entry(contents, key, 'U64');
			try {
				return BigInt(v.U64);
			} catch (cause) {
				throw HashiConfigError.malformedPayload(
					key,
					'U64',
					`"${v.U64}" is not a valid integer`,
					cause,
				);
			}
		};
		const bool = (key: string): boolean => entry(contents, key, 'Bool').Bool;
		const addr = (key: string): string => entry(contents, key, 'Address').Address;
		// Guardian keys are optional today — pre-feature deployments don't
		// have them at all. We surface `null` for missing entries; downstream
		// callers (e.g. `generateDepositAddress`) hard-fail when they need a
		// value but find `null`.
		const optionalString = (key: string): string | null => {
			try {
				return entry(contents, key, 'String').String;
			} catch (e) {
				if (e instanceof HashiConfigError && e.actualVariant === undefined) {
					return null;
				}
				throw e;
			}
		};
		const optionalBytes = (key: string, expectedLen: number): Uint8Array | null => {
			try {
				return configBytes(contents, key, expectedLen);
			} catch (e) {
				// A genuinely-absent key (no `actualVariant`) is optional; a
				// wrong variant or bad length is a real malformation — rethrow.
				if (e instanceof HashiConfigError && e.actualVariant === undefined) {
					return null;
				}
				throw e;
			}
		};

		const rawDepositMin = u64('bitcoin_deposit_minimum');
		const rawWithdrawalMin = u64('bitcoin_withdrawal_minimum');
		const bitcoinDepositMinimum =
			rawDepositMin < DUST_RELAY_MIN_VALUE ? DUST_RELAY_MIN_VALUE : rawDepositMin;
		const bitcoinWithdrawalMinimum =
			rawWithdrawalMin < DUST_RELAY_MIN_VALUE + 1n ? DUST_RELAY_MIN_VALUE + 1n : rawWithdrawalMin;

		return {
			paused: bool('paused'),
			bitcoinChainId: addr('bitcoin_chain_id'),
			bitcoinDepositMinimum,
			bitcoinWithdrawalMinimum,
			bitcoinConfirmationThreshold: u64('bitcoin_confirmation_threshold'),
			withdrawalCancellationCooldownMs: u64('withdrawal_cancellation_cooldown_ms'),
			bitcoinDepositTimeDelayMs: u64('bitcoin_deposit_time_delay_ms'),
			depositMinimum: bitcoinDepositMinimum,
			worstCaseNetworkFee: bitcoinWithdrawalMinimum - DUST_RELAY_MIN_VALUE,
			guardianUrl: optionalString('guardian_url'),
			guardianPublicKey: optionalBytes('guardian_public_key', GUARDIAN_PUBLIC_KEY_LEN),
			guardianBtcPublicKey: optionalBytes('guardian_btc_public_key', GUARDIAN_BTC_PUBLIC_KEY_LEN),
		};
	}

	view = {
		/**
		 * Fetches the MPC committee's threshold public key from on-chain.
		 *
		 * This is the 33-byte compressed secp256k1 key stored in `CommitteeSet.mpc_public_key`.
		 * It is set after the committee completes DKG and is updated at epoch boundaries.
		 *
		 * @returns 33-byte compressed secp256k1 public key
		 * @throws If the MPC key is not yet available (DKG not completed)
		 */
		mpcPublicKey: async (): Promise<Uint8Array> => {
			const result = await Hashi.get({
				client: this.#client,
				objectId: this.#hashiObjectId,
			});
			return parseMpcPublicKey(result.json.committee_set.mpc_public_key);
		},

		/**
		 * Fetches all governance values in a single round-trip and returns a
		 * consistent snapshot. Prefer this over individual methods when you
		 * need 2+ values — it avoids redundant `Hashi.get` calls and gives
		 * you all fields from the same on-chain state.
		 */
		all: async (): Promise<GovernanceConfig> => {
			const { contents } = await this.#fetchHashiObject();
			return this.#parseConfig(contents);
		},

		paused: async (): Promise<boolean> => (await this.view.all()).paused,

		/** Floored to `DUST_RELAY_MIN_VALUE` if the on-chain value is lower. */
		bitcoinDepositMinimum: async (): Promise<bigint> =>
			(await this.view.all()).bitcoinDepositMinimum,

		/** Floored to `DUST_RELAY_MIN_VALUE + 1` so `worstCaseNetworkFee` is always ≥ 1. */
		bitcoinWithdrawalMinimum: async (): Promise<bigint> =>
			(await this.view.all()).bitcoinWithdrawalMinimum,

		bitcoinConfirmationThreshold: async (): Promise<bigint> =>
			(await this.view.all()).bitcoinConfirmationThreshold,

		withdrawalCancellationCooldownMs: async (): Promise<bigint> =>
			(await this.view.all()).withdrawalCancellationCooldownMs,

		bitcoinChainId: async (): Promise<string> => (await this.view.all()).bitcoinChainId,

		/** Alias of `bitcoinDepositMinimum`. */
		depositMinimum: async (): Promise<bigint> => (await this.view.all()).depositMinimum,

		/**
		 * Worst-case Bitcoin miner fee (sats) deducted from a withdrawal.
		 * Derived as `bitcoinWithdrawalMinimum - DUST_RELAY_MIN_VALUE`; always ≥ 1.
		 */
		worstCaseNetworkFee: async (): Promise<bigint> => (await this.view.all()).worstCaseNetworkFee,

		/**
		 * Check whether one or more Bitcoin UTXOs already exist in the
		 * on-chain `UtxoPool` — either as active (confirmed deposit, not yet
		 * consumed) or spent (consumed by a withdrawal). Callers use this to
		 * detect already-used outputs before submitting a deposit.
		 *
		 * `txid` in each `UtxoId` is **display byte order**; the method
		 * reverses to internal byte order before encoding the on-chain key.
		 *
		 * Throws on any RPC failure that isn't a clean "object does not
		 * exist" — a transient transport error must not be downgraded to
		 * `isUsed: false`, because that could lead a caller to re-spend an
		 * already-used UTXO.
		 */
		findUsedUtxos: async (utxos: readonly UtxoId[]): Promise<UtxoUsageResult[]> => {
			if (utxos.length === 0) return [];

			const btcState = await this.#fetchBitcoinState();
			const activePoolId = btcState.utxo_pool.utxo_records.id;
			const spentPoolId = btcState.utxo_pool.spent_utxos.id;

			const typeTag = TypeTagSerializer.parseFromStr(`${this.#packageId}::utxo::UtxoId`);

			// Derive dynamic field IDs for every UTXO in both pools.
			const fieldIds: string[] = [];
			for (const u of utxos) {
				const keyBcs = UtxoIdBcs.serialize({
					txid: `0x${reverseTxidBytes(u.txid)}`,
					vout: u.vout,
				}).toBytes();
				fieldIds.push(
					deriveDynamicFieldID(activePoolId, typeTag, keyBcs),
					deriveDynamicFieldID(spentPoolId, typeTag, keyBcs),
				);
			}

			// Existence test only, no content needed. `core.getObjects`
			// batches internally, so any number of ids is fine.
			const { objects } = await this.#client.core.getObjects({ objectIds: fieldIds });

			if (objects.length !== fieldIds.length) {
				throw new HashiFetchError(
					`findUsedUtxos: getObjects returned ${objects.length} results, expected ${fieldIds.length}`,
					this.#hashiObjectId,
				);
			}

			// Only "object not found" errors mean the UTXO is absent from a
			// pool. Anything else (transient RPC failure, unexpected code,
			// opaque gRPC Error) must propagate — otherwise callers could
			// silently treat a still-used UTXO as free and re-spend it.
			for (const result of objects) {
				if (result instanceof Error && !isObjectNotFoundError(result)) {
					throw result;
				}
			}

			return utxos.map((u, i) => {
				const inActivePool = !(objects[i * 2] instanceof Error);
				const inSpentPool = !(objects[i * 2 + 1] instanceof Error);
				return {
					utxoId: u,
					inActivePool,
					inSpentPool,
					isUsed: inActivePool || inSpentPool,
				};
			});
		},

		/**
		 * Get the hBTC balance for a Sui address.
		 *
		 * @returns Total balance in satoshis and the number of coin objects held.
		 */
		balance: async (owner: string): Promise<HbtcBalance> => {
			const btcType = `${this.#packageId}::btc::BTC`;
			const { balance } = await this.#client.core.getBalance({
				owner,
				coinType: btcType,
			});

			let coinObjectCount = 0;
			let cursor: string | null = null;
			let hasNextPage = true;
			while (hasNextPage) {
				const page = await this.#client.core.listCoins({
					owner,
					coinType: btcType,
					cursor: cursor ?? undefined,
				});
				coinObjectCount += page.objects.length;
				cursor = page.cursor;
				hasNextPage = page.hasNextPage;
			}

			return {
				totalBalance: BigInt(balance.balance ?? '0'),
				coinObjectCount,
			};
		},

		/**
		 * Get the status and details of a deposit by its Sui transaction digest.
		 *
		 * Fetches the `DepositRequested` event from the transaction, extracts the
		 * request ID, then probes on-chain state to determine whether the deposit
		 * is pending (still in `requests` ObjectBag), confirmed (object exists
		 * but not in requests), or expired (object destroyed).
		 */
		depositStatus: async (suiTxDigest: string): Promise<DepositInfo | null> => {
			const txResult = await this.#client.core.getTransaction({
				digest: suiTxDigest,
				include: { events: true },
			});

			const txData = txResult.Transaction ?? txResult.FailedTransaction;
			if (!txData?.events) return null;

			const depositEvent = txData.events.find((e: { eventType: string }) =>
				e.eventType.includes('::deposit::DepositRequested'),
			);
			if (!depositEvent?.json) return null;

			const parsed = depositEvent.json as {
				request_id: string;
				utxo_id: { txid: string; vout: number };
				amount: string;
				derivation_path: string | null;
				timestamp_ms: string;
			};

			let status: DepositStatus = 'unknown';
			let approvalTimestampMs: bigint | null = null;
			let confirmableAtMs: bigint | null = null;
			try {
				const reqObj = await DepositRequest.get({
					client: this.#client,
					objectId: parsed.request_id,
				});

				if (reqObj.json.approved_timestamp_ms != null) {
					approvalTimestampMs = BigInt(reqObj.json.approved_timestamp_ms);
				}

				const [btcState, config] = await Promise.all([
					this.#fetchBitcoinState(),
					this.view.all().catch(() => null),
				]);

				if (approvalTimestampMs !== null && config) {
					confirmableAtMs = approvalTimestampMs + config.bitcoinDepositTimeDelayMs;
				}

				const requestsBagId = btcState.deposit_queue.requests.id;

				const reqResult = await this.#client.core
					.getDynamicField({
						parentId: requestsBagId,
						name: {
							type: OBJECT_BAG_ADDRESS_TYPE,
							bcs: bcs.Address.serialize(parsed.request_id).toBytes(),
						},
					})
					.catch(() => null);

				status = reqResult?.dynamicField ? 'pending' : 'confirmed';
			} catch (err) {
				if (err instanceof Error && isObjectNotFoundError(err)) {
					status = 'expired';
				} else {
					throw err;
				}
			}

			return {
				requestId: parsed.request_id,
				amountSats: BigInt(parsed.amount),
				recipient: parsed.derivation_path,
				btcTxid: reverseTxidBytes(parsed.utxo_id.txid),
				btcVout: parsed.utxo_id.vout,
				timestampMs: BigInt(parsed.timestamp_ms),
				approvalTimestampMs,
				confirmableAtMs,
				status,
				suiTxDigest,
			};
		},

		/**
		 * Get the status and details of a withdrawal by its Sui transaction digest.
		 *
		 * Fetches the `WithdrawalRequested` event from the transaction, extracts the
		 * request ID, then reads the `WithdrawalRequest` object to determine the
		 * current lifecycle state. If a `WithdrawalTransaction` is linked, its
		 * Bitcoin txid is populated.
		 */
		withdrawalStatus: async (suiTxDigest: string): Promise<WithdrawalInfo | null> => {
			const txResult = await this.#client.core.getTransaction({
				digest: suiTxDigest,
				include: { events: true },
			});

			const txData = txResult.Transaction ?? txResult.FailedTransaction;
			if (!txData?.events) return null;

			const withdrawEvent = txData.events.find((e: { eventType: string }) =>
				e.eventType.includes('::withdrawal_queue::WithdrawalRequested'),
			);
			if (!withdrawEvent?.json) return null;

			const parsed = withdrawEvent.json as {
				request_id: string;
				btc_amount: string;
				bitcoin_address: number[];
				timestamp_ms: string;
				requester_address: string;
			};

			let status: WithdrawalStatus | 'cancelled' = 'Requested';
			let btcTxid: string | null = null;

			try {
				const reqObj = await WithdrawalRequest.get({
					client: this.#client,
					objectId: parsed.request_id,
				});
				status = reqObj.json.status.$kind as WithdrawalStatus;

				const withdrawalTxnId = reqObj.json.withdrawal_txn_id;
				if (
					withdrawalTxnId &&
					(status === 'Processing' || status === 'Signed' || status === 'Confirmed')
				) {
					try {
						const txnObj = await WithdrawalTransaction.get({
							client: this.#client,
							objectId: withdrawalTxnId,
						});
						btcTxid = reverseTxidBytes(txnObj.json.txid);
					} catch {
						// best effort
					}
				}
			} catch (err) {
				if (err instanceof Error && isObjectNotFoundError(err)) {
					status = 'cancelled';
				} else {
					throw err;
				}
			}

			return {
				requestId: parsed.request_id,
				btcAmountSats: BigInt(parsed.btc_amount),
				bitcoinAddress: new Uint8Array(parsed.bitcoin_address),
				sender: parsed.requester_address,
				timestampMs: BigInt(parsed.timestamp_ms),
				status,
				suiTxDigest,
				btcTxid,
			};
		},

		/**
		 * Estimate the gas cost for a deposit transaction via dry-run.
		 * Returns `0n` if simulation fails (best-effort).
		 */
		depositGasEstimate: async (sender: string): Promise<DepositFees> => {
			const snap = await this.view.all();
			const dummyAmount = snap.bitcoinDepositMinimum + 1n;
			// Reuse the real builder with dummy values so the dry-run transaction
			// can never drift out of sync with what users actually sign.
			const tx = this.tx.deposit({
				txid: '0x' + '01'.repeat(32),
				utxos: [{ vout: 0, amountSats: dummyAmount }],
				recipient: sender,
			});
			tx.setSender(sender);
			return { gasEstimateMist: await this.#estimateGas(tx) };
		},

		/**
		 * Fetch current withdrawal fees, minimums, and gas estimates.
		 *
		 * @param sender - If provided, estimates gas cost via dry-run.
		 */
		withdrawalFees: async (sender?: string): Promise<WithdrawalFees> => {
			const snap = await this.view.all();

			let gasEstimateMist = 0n;
			if (sender) {
				const dummyAmount = snap.bitcoinWithdrawalMinimum + 1n;
				// Reuse the real builder with dummy values so the dry-run
				// transaction can never drift out of sync with what users sign.
				const tx = this.tx.requestWithdrawal({
					amount: dummyAmount,
					bitcoinAddress: new Uint8Array(20),
				});
				tx.setSender(sender);
				gasEstimateMist = await this.#estimateGas(tx);
			}

			return {
				worstCaseNetworkFeeSats: snap.worstCaseNetworkFee,
				withdrawalMinimumSats: snap.bitcoinWithdrawalMinimum,
				gasEstimateMist,
			};
		},

		/**
		 * Fetch the unified transaction history (deposits + withdrawals) for
		 * a Sui address. Confirmed requests come from the on-chain
		 * `user_requests` index; in-flight deposits are discovered via
		 * GraphQL `DepositRequested` event queries (indexed by sender).
		 */
		transactionHistory: async (suiAddress: string): Promise<TransactionHistoryItem[]> => {
			const [btcState, timeDelayMs] = await Promise.all([
				this.#fetchBitcoinState(),
				this.view.all().then(
					(c) => c.bitcoinDepositTimeDelayMs,
					() => null,
				),
			]);

			// 1. Confirmed requests from user_requests on-chain index.
			const confirmedIds = new Set<string>();
			const items: TransactionHistoryItem[] = [];

			const userBagId = await this.#fetchUserRequestsBagId(btcState.user_requests.id, suiAddress);
			if (userBagId !== null) {
				const requestIds = await this.#listAllDynamicFieldAddressKeys(userBagId);
				if (requestIds.length > 0) {
					const { objects } = await this.#client.core.getObjects({
						objectIds: requestIds,
						include: { content: true },
					});
					const classified = this.#classifyRequestObjects(objects, timeDelayMs);
					items.push(...classified.items);
					await this.#populateWithdrawalBtcTxids(items, classified.withdrawalTxnLookups);
					for (const id of requestIds) confirmedIds.add(id);
				}
			}

			// 2. In-flight deposits via GraphQL events (not yet in user_requests).
			//    Best-effort: if GraphQL is unavailable (e.g. localnet) we
			//    still return the confirmed set from step 1.
			try {
				const depositEventType = `${this.#packageId}::deposit::DepositRequested`;
				const allDepositIds = await this.#queryEventRequestIds(suiAddress, depositEventType);
				const pendingIds = allDepositIds.filter((id) => !confirmedIds.has(id));

				if (pendingIds.length > 0) {
					const { objects } = await this.#client.core.getObjects({
						objectIds: pendingIds,
						include: { content: true },
					});
					const classified = this.#classifyRequestObjects(objects, timeDelayMs);
					items.push(...classified.items);
				}
			} catch {
				// GraphQL endpoint may not be available (localnet, custom deployments).
			}

			items.sort((a, b) => Number(b.timestampMs - a.timestampMs));
			return items;
		},
	};

	// ------------------------------------------------------------------
	// Polling helpers
	// ------------------------------------------------------------------

	/**
	 * Poll deposit status until it reaches a terminal state (confirmed or expired).
	 */
	async waitForDeposit(suiTxDigest: string, options?: WaitOptions): Promise<DepositInfo> {
		const intervalMs = options?.intervalMs ?? 15_000;
		const signal = options?.signal;
		while (!signal?.aborted) {
			const info = await this.view.depositStatus(suiTxDigest);
			if (!info) throw new Error(`Deposit not found for digest: ${suiTxDigest}`);
			if (info.status === 'confirmed' || info.status === 'expired') return info;
			await sleep(intervalMs, signal);
		}
		throw new Error('Polling aborted');
	}

	/**
	 * Poll withdrawal status until it reaches a terminal state (confirmed or cancelled).
	 */
	async waitForWithdrawal(suiTxDigest: string, options?: WaitOptions): Promise<WithdrawalInfo> {
		const intervalMs = options?.intervalMs ?? 15_000;
		const signal = options?.signal;
		while (!signal?.aborted) {
			const info = await this.view.withdrawalStatus(suiTxDigest);
			if (!info) throw new Error(`Withdrawal not found for digest: ${suiTxDigest}`);
			if (info.status === 'Confirmed' || info.status === 'cancelled') return info;
			await sleep(intervalMs, signal);
		}
		throw new Error('Polling aborted');
	}

	// ------------------------------------------------------------------
	// Bitcoin RPC (optional — requires btcRpcUrl)
	// ------------------------------------------------------------------

	bitcoin = {
		/**
		 * Look up the first UTXO output in a Bitcoin transaction that pays
		 * to the given deposit address.
		 *
		 * Requires `btcRpcUrl` to be configured.
		 */
		lookupVout: async (txid: string, depositAddress: string): Promise<UtxoLookupResult | null> => {
			this.#requireBtcRpc();
			return lookupVout(this.#btcRpcUrl!, txid, depositAddress);
		},

		/**
		 * Look up ALL outputs in a Bitcoin transaction that pay to the given
		 * deposit address.
		 *
		 * Requires `btcRpcUrl` to be configured.
		 */
		lookupAllVouts: async (txid: string, depositAddress: string): Promise<UtxoLookupResult[]> => {
			this.#requireBtcRpc();
			return lookupAllVouts(this.#btcRpcUrl!, txid, depositAddress);
		},

		/**
		 * Returns the current confirmation count for a Bitcoin transaction.
		 * Returns 0 if the transaction is in the mempool but not yet mined.
		 *
		 * Requires `btcRpcUrl` to be configured.
		 */
		confirmations: async (txid: string): Promise<number> => {
			this.#requireBtcRpc();
			return getTxConfirmations(this.#btcRpcUrl!, txid);
		},
	};

	#requireBtcRpc(): void {
		if (!this.#btcRpcUrl) {
			throw new Error(
				'btcRpcUrl is required for Bitcoin RPC operations. ' + 'Pass it in HashiClientOptions.',
			);
		}
	}

	// ------------------------------------------------------------------
	// Guardian rate limiter (optional — requires guardianUrl,
	// guardianInfoProvider, or an on-chain `guardian_url` config value)
	// ------------------------------------------------------------------

	guardian = {
		/**
		 * Fetch the guardian's curated `/info` (identity + limiter). `limiter`
		 * is `null` when the guardian is not yet provisioned/activated; this
		 * method never throws for that state, so it can detect an uninitialized
		 * guardian without a try/catch.
		 */
		info: async (): Promise<RawGuardianInfo> => {
			const provider = await this.#resolveGuardianProvider();
			return provider();
		},

		/**
		 * Fetch the limiter and compute derived fields: capacity projected to
		 * now, bucket fill percentage, and the refill-to-full ETA. Throws
		 * `HashiGuardianError` (`code: "not-initialized"`) if the guardian has
		 * no limiter yet.
		 */
		limiterStatus: async (): Promise<GuardianLimiterSnapshot> => {
			const { state, config } = this.#requireLimiter(await this.guardian.info());
			const nowSecs = BigInt(Math.floor(Date.now() / 1000));
			const availableNowSats = projectCapacity(config, state, nowSecs);
			const max = config.maxBucketCapacitySats;
			const bucketFillPercent = max > 0n ? (Number(availableNowSats) / Number(max)) * 100 : 0;
			let fullAtSecs: bigint | null = null;
			if (availableNowSats < max && config.refillRateSatsPerSec > 0n) {
				const deficit = max - availableNowSats;
				const secsToFull =
					(deficit + config.refillRateSatsPerSec - 1n) / config.refillRateSatsPerSec;
				fullAtSecs = nowSecs + secsToFull;
			}
			return { state, config, availableNowSats, bucketFillPercent, fullAtSecs };
		},

		/**
		 * Check whether the guardian can sign a withdrawal of `amountSats` right
		 * now, with an estimated wait if not. Throws `HashiGuardianError`
		 * (`code: "not-initialized"`) if the guardian has no limiter yet.
		 */
		canWithdraw: async (amountSats: bigint): Promise<GuardianWithdrawCheck> => {
			const { state, config } = this.#requireLimiter(await this.guardian.info());
			const nowSecs = BigInt(Math.floor(Date.now() / 1000));
			const availableNowSats = projectCapacity(config, state, nowSecs);
			const estimatedWaitSecs = estimateWaitSecs(config, state, amountSats, nowSecs);
			return { allowed: availableNowSats >= amountSats, availableNowSats, estimatedWaitSecs };
		},
	};

	#requireLimiter(info: RawGuardianInfo): GuardianLimiterRaw {
		if (info.limiter === null) {
			throw new HashiGuardianError({
				message: 'Guardian rate limiter is not initialized (limiter is null).',
				code: 'not-initialized',
			});
		}
		return info.limiter;
	}

	async #resolveGuardianProvider(): Promise<GuardianInfoProvider> {
		if (this.#guardianInfoProvider) return this.#guardianInfoProvider;
		const url = this.#guardianUrl || (await this.#resolveOnChainGuardianUrl());
		if (!url) {
			throw new HashiGuardianError({
				message:
					'Guardian URL is not configured. Pass `guardianUrl` or `guardianInfoProvider` ' +
					'to hashi({...}), or set `guardian_url` in the on-chain config.',
				code: 'not-configured',
			});
		}
		return () => fetchGuardianInfo(url);
	}

	/**
	 * Resolve the guardian origin from the on-chain `guardian_url`, caching only
	 * a found URL. `guardian_url` is absent until launch (`finish_publish`
	 * publishes it), so a missing value is left uncached and each call re-reads
	 * the chain — a client created before launch starts working once the URL is
	 * published, rather than caching the absence forever (mirrors the node's
	 * lazy `guardian_client()` resolution). Returns `undefined` while unresolved.
	 */
	async #resolveOnChainGuardianUrl(): Promise<string | undefined> {
		if (this.#resolvedGuardianUrl) return this.#resolvedGuardianUrl;
		let onChain: string | null;
		try {
			onChain = (await this.view.all()).guardianUrl;
		} catch (cause) {
			// A transient chain-read failure must not permanently disable
			// guardian resolution for this client; surface it, cache nothing.
			throw new HashiGuardianError(
				{
					message:
						'Could not read the on-chain guardian_url config. Pass ' +
						'`guardianUrl` or `guardianInfoProvider` to bypass the on-chain read.',
					code: 'not-configured',
				},
				{ cause },
			);
		}
		return (this.#resolvedGuardianUrl = onChain || undefined);
	}

	async #estimateGas(tx: Transaction): Promise<bigint> {
		try {
			const result = await this.#client.core.simulateTransaction({
				transaction: tx,
				include: { effects: true },
			});
			const simTx = result.Transaction ?? result.FailedTransaction;
			if (simTx?.effects?.gasUsed) {
				const gas = simTx.effects.gasUsed;
				const total =
					BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
				return total > 0n ? (total * 120n) / 100n : 0n;
			}
		} catch {
			// simulation may fail — gas estimate is best-effort
		}
		return 0n;
	}

	// ------------------------------------------------------------------
	// Private helpers
	// ------------------------------------------------------------------

	/**
	 * Fetches the Hashi shared object once and returns its decoded `json`
	 * alongside the validated governance-config `contents` array. Wraps
	 * transport failures and unexpected shapes in `HashiFetchError`. Shared by
	 * `view.all()` and `generateDepositAddress` so a single round-trip serves
	 * both the committee key (from `json`) and the config reads (from
	 * `contents`).
	 */
	async #fetchHashiObject(): Promise<{
		json: Awaited<ReturnType<typeof Hashi.get>>['json'];
		contents: readonly ConfigEntry[];
	}> {
		let result;
		try {
			result = await Hashi.get({
				client: this.#client,
				objectId: this.#hashiObjectId,
			});
		} catch (cause) {
			throw new HashiFetchError(
				`Failed to fetch Hashi shared object ${this.#hashiObjectId}.`,
				this.#hashiObjectId,
				{ cause },
			);
		}
		const contents = result.json?.config?.config?.contents;
		if (!Array.isArray(contents)) {
			throw new HashiFetchError(
				`Hashi object ${this.#hashiObjectId} returned an unexpected shape: config.config.contents is not an array.`,
				this.#hashiObjectId,
			);
		}
		return { json: result.json, contents };
	}

	/**
	 * Fetches the `BitcoinState` dynamic field from the Hashi shared object.
	 * Returns the BCS-parsed struct whose nested Bag/Table IDs are used by
	 * `findUsedUtxos` and `transactionHistory`.
	 *
	 * `BitcoinState` is attached via `df::add` on the Move side (it has
	 * `store` only, not `key`), so the regular-DF accessor is the right tool
	 * — `getDynamicObjectField` would look for a `dynamic_object_field::
	 * Wrapper<BitcoinStateKey>` that doesn't exist and abort with "not
	 * found". The previous `listDynamicFields` workaround filtered for
	 * `$kind === "DynamicObject"` and hit the same dof/df mismatch.
	 */
	async #fetchBitcoinState() {
		const { dynamicField } = await this.#client.core.getDynamicField({
			parentId: this.#hashiObjectId,
			name: {
				type: `${this.#packageId}::bitcoin_state::BitcoinStateKey`,
				bcs: BitcoinStateKey.serialize({ dummy_field: false }).toBytes(),
			},
		});
		return BitcoinState.parse(new Uint8Array(dynamicField.value.bcs));
	}

	/**
	 * Resolve the Bag id holding a user's request IDs from `user_requests`,
	 * or `null` if the user has never had a request.
	 */
	async #fetchUserRequestsBagId(tableId: string, suiAddress: string): Promise<string | null> {
		try {
			const { dynamicField } = await this.#client.core.getDynamicField({
				parentId: tableId,
				name: {
					type: 'address',
					bcs: bcs.Address.serialize(suiAddress).toBytes(),
				},
			});
			return Bag.parse(new Uint8Array(dynamicField.value.bcs)).id;
		} catch {
			return null;
		}
	}

	/**
	 * Enumerate every `address`-keyed dynamic field on `parentId`, paginating
	 * through `listDynamicFields` until exhausted.
	 */
	async #listAllDynamicFieldAddressKeys(parentId: string): Promise<string[]> {
		const keys: string[] = [];
		let cursor: string | null = null;
		do {
			const page = await this.#client.core.listDynamicFields({
				parentId,
				cursor: cursor ?? undefined,
			});
			for (const df of page.dynamicFields) {
				keys.push(bcs.Address.parse(new Uint8Array(df.name.bcs)));
			}
			cursor = page.hasNextPage ? page.cursor : null;
		} while (cursor);
		return keys;
	}

	/**
	 * Query the Sui GraphQL endpoint for events of a given type emitted by
	 * a sender. Returns the `request_id` from each event's JSON payload,
	 * paginating through all results.
	 */
	async #queryEventRequestIds(sender: string, eventType: string): Promise<string[]> {
		const ids: string[] = [];
		let cursor: string | null = null;
		let hasMore = true;

		while (hasMore) {
			// The annotation pins `after` to the document's variable type; without
			// it, `cursor`'s narrowed type feeds the query's inference while also
			// flowing from the previous result, which is a type-inference cycle.
			const variables: VariablesOf<typeof EVENT_REQUEST_IDS_QUERY> = {
				sender,
				type: eventType,
				after: cursor,
			};
			const { data, errors } = await this.#graphql.query({
				query: EVENT_REQUEST_IDS_QUERY,
				variables,
			});
			if (errors?.length) {
				throw new Error(`GraphQL error: ${errors[0].message}`);
			}
			const events = data?.events;
			if (!events) break;

			for (const node of events.nodes) {
				const json = node.contents?.json as { request_id: string } | undefined;
				if (json) ids.push(json.request_id);
			}
			hasMore = events.pageInfo.hasNextPage;
			cursor = events.pageInfo.endCursor ?? null;
		}

		return ids;
	}

	/**
	 * Classify a batch of request objects into deposit / withdrawal history
	 * items. Errors in the batch are skipped (the request object may have
	 * been deleted between the bag enumeration and the fetch). Returns the
	 * items plus the indices that need a follow-up `WithdrawalTransaction`
	 * fetch to populate `btcTxid`.
	 */
	#classifyRequestObjects(
		objects: readonly (SuiClientTypes.Object<{ content: true }> | Error)[],
		timeDelayMs: bigint | null,
	): {
		items: TransactionHistoryItem[];
		withdrawalTxnLookups: { itemIndex: number; txnId: string }[];
	} {
		const items: TransactionHistoryItem[] = [];
		const withdrawalTxnLookups: { itemIndex: number; txnId: string }[] = [];
		const depositRequestType = `${this.#packageId}::deposit_queue::DepositRequest`;
		const withdrawalRequestType = `${this.#packageId}::withdrawal_queue::WithdrawalRequest`;

		for (const obj of objects) {
			if (obj instanceof Error) continue;
			if (obj.type === depositRequestType) {
				items.push(parseDepositHistoryItem(obj.content, timeDelayMs));
			} else if (obj.type === withdrawalRequestType) {
				const item = parseWithdrawalHistoryItem(obj.content);
				items.push(item);
				if (item.withdrawalTxnId) {
					withdrawalTxnLookups.push({
						itemIndex: items.length - 1,
						txnId: item.withdrawalTxnId,
					});
				}
			}
		}

		return { items, withdrawalTxnLookups };
	}

	/**
	 * Batch-fetch `WithdrawalTransaction` objects for the withdrawal items
	 * that have a linked txn and overwrite their `btcTxid` in place. Errors
	 * in the batch leave `btcTxid` at the initial `null`.
	 */
	async #populateWithdrawalBtcTxids(
		items: TransactionHistoryItem[],
		lookups: readonly { itemIndex: number; txnId: string }[],
	): Promise<void> {
		if (lookups.length === 0) return;
		const { objects: txnObjects } = await this.#client.core.getObjects({
			objectIds: lookups.map((l) => l.txnId),
			include: { content: true },
		});
		for (let i = 0; i < lookups.length; i++) {
			const txnObj = txnObjects[i];
			if (txnObj instanceof Error) continue;
			const parsed = WithdrawalTransaction.parse(txnObj.content);
			const item = items[lookups[i].itemIndex] as WithdrawalHistoryItem;
			(item as { btcTxid: string | null }).btcTxid = reverseTxidBytes(parsed.txid);
		}
	}
}

/**
 * Convert the on-chain `committee_set.mpc_public_key` (arkworks-compressed)
 * into a 33-byte SEC1 key. Throws `HashiConfigError` if DKG hasn't populated
 * it yet (empty vector).
 */
function parseMpcPublicKey(raw: ArrayLike<number>): Uint8Array {
	const mpcKey = new Uint8Array(raw);
	if (mpcKey.length === 0) {
		throw HashiConfigError.missing('committee_set.mpc_public_key', 'Bytes');
	}
	return arkworksToSec1Compressed(mpcKey);
}

function parseDepositHistoryItem(
	content: Uint8Array,
	timeDelayMs: bigint | null,
): DepositHistoryItem {
	const parsed = DepositRequest.parse(content);
	const approvalTimestampMs =
		parsed.approved_timestamp_ms === null ? null : BigInt(parsed.approved_timestamp_ms);
	return {
		kind: 'deposit',
		requestId: parsed.id,
		sender: parsed.sender,
		timestampMs: BigInt(parsed.created_timestamp_ms),
		suiTxDigest: base58.encode(new Uint8Array(parsed.sui_tx_digest)),
		amountSats: BigInt(parsed.utxo.amount),
		btcTxid: reverseTxidBytes(parsed.utxo.id.txid),
		btcVout: parsed.utxo.id.vout,
		approved: parsed.approval_cert !== null,
		approvalTimestampMs,
		confirmableAtMs:
			approvalTimestampMs !== null && timeDelayMs !== null
				? approvalTimestampMs + timeDelayMs
				: null,
	};
}

function parseWithdrawalHistoryItem(content: Uint8Array): WithdrawalHistoryItem {
	const parsed = WithdrawalRequest.parse(content);
	return {
		kind: 'withdrawal',
		requestId: parsed.id,
		sender: parsed.sender,
		btcAmountSats: BigInt(parsed.btc_amount),
		bitcoinAddress: new Uint8Array(parsed.bitcoin_address),
		timestampMs: BigInt(parsed.created_timestamp_ms),
		suiTxDigest: base58.encode(new Uint8Array(parsed.sui_tx_digest)),
		status: parsed.status.$kind as WithdrawalStatus,
		withdrawalTxnId: parsed.withdrawal_txn_id ?? null,
		btcTxid: null,
	};
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error('Aborted'));
			return;
		}
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(new Error('Aborted'));
			},
			{ once: true },
		);
	});
}
