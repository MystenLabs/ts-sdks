// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TypeTagSerializer } from '../bcs/type-tag-serializer.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { deriveObjectID } from '../utils/derived-objects.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import {
	normalizeStructTag,
	normalizeSuiAddress,
	parseStructTag,
	SUI_ADDRESS_LENGTH,
} from '../utils/sui-types.js';
import { BaseClient } from './client.js';
import type { ClientWithExtensions, SuiClientTypes } from './types.js';
import { MvrClient } from './mvr.js';
import { bcs } from '../bcs/index.js';
import type { AnyLedgerStreamAdapter } from './stream/adapter.js';
import { SuiStreamError } from './stream/errors.js';
import { createLedgerStream } from './stream/run.js';
import { ObjectError } from './errors.js';

/** The shared `0x2::address_alias::AddressAliasState`, the parent of every alias set. */
const ADDRESS_ALIAS_STATE_ID = '0xa';
const ADDRESS_ALIAS_KEY_TYPE = '0x2::address_alias::AliasKey';
const ADDRESS_ALIASES_TYPE = normalizeStructTag('0x2::address_alias::AddressAliases');

/** `0x2::address_alias::AddressAliases`: its ID and a `VecSet<address>`. */
const AddressAliasesBcs = bcs.struct('AddressAliases', {
	id: bcs.Address,
	aliases: bcs.struct('VecSet<address>', { contents: bcs.vector(bcs.Address) }),
});

/** What `CoreClient.createLedgerStreamAdapter` is asked to stream. */
export type LedgerStreamRequest =
	| {
			family: 'checkpoints';
			options: SuiClientTypes.StreamCheckpointsOptions<
				SuiClientTypes.StreamCheckpointInclude,
				StreamFrames
			>;
	  }
	| {
			family: 'transactions';
			options: SuiClientTypes.StreamTransactionsOptions<
				SuiClientTypes.TransactionInclude,
				StreamFrames
			>;
	  }
	| { family: 'events'; options: SuiClientTypes.StreamEventsOptions<StreamFrames> };
type StreamFrames = SuiClientTypes.StreamFrameOptions;

export type ClientWithCoreApi = ClientWithExtensions<{
	core: CoreClient;
}>;

export interface CoreClientOptions extends SuiClientTypes.SuiClientOptions {
	base: BaseClient;
	mvr?: SuiClientTypes.MvrOptions;
}

const DEFAULT_MVR_URLS: Record<string, string> = {
	mainnet: 'https://mainnet.mvr.mystenlabs.com',
	testnet: 'https://testnet.mvr.mystenlabs.com',
};

export abstract class CoreClient extends BaseClient implements SuiClientTypes.TransportMethods {
	core = this;
	mvr: SuiClientTypes.MvrMethods;

	constructor(options: CoreClientOptions) {
		super(options);

		this.mvr = new MvrClient({
			cache: this.cache.scope('core.mvr'),
			url: options.mvr?.url ?? DEFAULT_MVR_URLS[this.network],
			pageSize: options.mvr?.pageSize,
			overrides: options.mvr?.overrides,
		});
	}

	abstract getObjects<Include extends SuiClientTypes.ObjectInclude = {}>(
		options: SuiClientTypes.GetObjectsOptions<Include>,
	): Promise<SuiClientTypes.GetObjectsResponse<Include>>;

	async getObject<Include extends SuiClientTypes.ObjectInclude = {}>(
		options: SuiClientTypes.GetObjectOptions<Include>,
	): Promise<SuiClientTypes.GetObjectResponse<Include>> {
		const { objectId } = options;
		const {
			objects: [result],
		} = await this.getObjects({
			objectIds: [objectId],
			signal: options.signal,
			include: options.include,
		});
		if (result instanceof Error) {
			throw result;
		}
		return { object: result };
	}

	abstract listCoins(
		options: SuiClientTypes.ListCoinsOptions,
	): Promise<SuiClientTypes.ListCoinsResponse>;

	abstract listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = {}>(
		options: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListOwnedObjectsResponse<Include>>;

	abstract getBalance(
		options: SuiClientTypes.GetBalanceOptions,
	): Promise<SuiClientTypes.GetBalanceResponse>;

	abstract listBalances(
		options: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse>;

	abstract getCoinMetadata(
		options: SuiClientTypes.GetCoinMetadataOptions,
	): Promise<SuiClientTypes.GetCoinMetadataResponse>;

	abstract getTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		options: SuiClientTypes.GetTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>>;

	abstract executeTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		options: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>>;

	abstract simulateTransaction<Include extends SuiClientTypes.SimulateTransactionInclude = {}>(
		options: SuiClientTypes.SimulateTransactionOptions<Include>,
	): Promise<SuiClientTypes.SimulateTransactionResult<Include>>;

	abstract getReferenceGasPrice(
		options?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse>;

	abstract getCurrentSystemState(
		options?: SuiClientTypes.GetCurrentSystemStateOptions,
	): Promise<SuiClientTypes.GetCurrentSystemStateResponse>;

	abstract getProtocolConfig(
		options?: SuiClientTypes.GetProtocolConfigOptions,
	): Promise<SuiClientTypes.GetProtocolConfigResponse>;

	abstract getChainIdentifier(
		options?: SuiClientTypes.GetChainIdentifierOptions,
	): Promise<SuiClientTypes.GetChainIdentifierResponse>;

	abstract listDynamicFields<Include extends SuiClientTypes.DynamicFieldInclude = {}>(
		options: SuiClientTypes.ListDynamicFieldsOptions<Include>,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse<Include>>;

	abstract listTransactions<Include extends SuiClientTypes.TransactionInclude = {}>(
		options: SuiClientTypes.ListTransactionsOptions<Include>,
	): Promise<SuiClientTypes.ListTransactionsResponse<Include>>;

	abstract listEvents(
		options: SuiClientTypes.ListEventsOptions,
	): Promise<SuiClientTypes.ListEventsResponse>;

	abstract listCheckpoints(
		options: SuiClientTypes.ListCheckpointsOptions,
	): Promise<SuiClientTypes.ListCheckpointsResponse>;

	abstract resolveTransactionPlugin(): TransactionPlugin;

	/**
	 * Verifies a personal message or transaction signature on the node; see the top-level
	 * `client.verifySignature`. `valid: false` means invalid, malformed or not authorized for
	 * `address`; network and protocol errors and a node that didn't apply a requested alias check
	 * throw.
	 */
	abstract verifySignature(
		options: SuiClientTypes.VerifySignatureOptions,
	): Promise<SuiClientTypes.VerifySignatureResponse>;

	/** @deprecated Use `verifySignature`, which supports every scheme and address aliases. */
	abstract verifyZkLoginSignature(
		options: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse>;

	abstract getMoveFunction(
		options: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse>;

	abstract defaultNameServiceName(
		options: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse>;

	abstract resolveNameServiceAddress(
		options: SuiClientTypes.ResolveNameServiceAddressOptions,
	): Promise<SuiClientTypes.ResolveNameServiceAddressResponse>;

	/**
	 * Streams checkpoints in ledger order, resumable from any delivered frame's `resumeToken`.
	 * Follows new checkpoints by default; see `SuiClientTypes.StreamOptions`.
	 */
	streamCheckpoints<
		Include extends SuiClientTypes.StreamCheckpointInclude = {},
		Frames extends SuiClientTypes.StreamFrameOptions = {},
	>(
		options: SuiClientTypes.StreamCheckpointsOptions<Include, Frames> = {},
	): AsyncGenerator<SuiClientTypes.StreamCheckpointResult<Include, Frames>> {
		return this.#ledgerStream({ family: 'checkpoints', options });
	}

	/** Streams transactions matching `filter` in ledger order. See `streamCheckpoints`. */
	streamTransactions<
		Include extends SuiClientTypes.TransactionInclude = {},
		Frames extends SuiClientTypes.StreamFrameOptions = {},
	>(
		options: SuiClientTypes.StreamTransactionsOptions<Include, Frames> = {},
	): AsyncGenerator<SuiClientTypes.StreamTransactionResult<Include, Frames>> {
		return this.#ledgerStream({ family: 'transactions', options });
	}

	/** Streams events matching `filter` in ledger order. See `streamCheckpoints`. */
	streamEvents<Frames extends SuiClientTypes.StreamFrameOptions = {}>(
		options: SuiClientTypes.StreamEventsOptions<Frames> = {},
	): AsyncGenerator<SuiClientTypes.StreamEventResult<Frames>> {
		return this.#ledgerStream({ family: 'events', options });
	}

	/**
	 * Returns the transport's stream adapter. Called on the stream's first `next()`; must not do I/O.
	 * The default throws, for transports without stream support.
	 */
	protected createLedgerStreamAdapter(_request: LedgerStreamRequest): AnyLedgerStreamAdapter {
		throw new SuiStreamError(
			'InvalidOptions',
			`${this.constructor.name} does not support ledger streams`,
		);
	}

	#ledgerStream<Result>(request: LedgerStreamRequest): AsyncGenerator<Result> {
		return createLedgerStream(request.options, () =>
			this.createLedgerStreamAdapter(request),
		) as AsyncGenerator<Result>;
	}

	async getDynamicField(
		options: SuiClientTypes.GetDynamicFieldOptions,
	): Promise<SuiClientTypes.GetDynamicFieldResponse> {
		const field = await this.#getDynamicFieldObject(options);
		const { fieldObject, nameType, isDynamicObject, valueBcs } = field;

		const entry = {
			fieldId: fieldObject.objectId,
			type: fieldObject.type,
			name: { type: nameType, bcs: options.name.bcs },
			digest: fieldObject.digest,
			version: fieldObject.version,
			previousTransaction: fieldObject.previousTransaction,
		};

		if (!isDynamicObject) {
			return {
				dynamicField: {
					...entry,
					$kind: 'DynamicField',
					valueType: field.valueType,
					value: { type: field.valueType, bcs: valueBcs },
				},
			};
		}

		const childId = bcs.Address.parse(valueBcs);
		const { object: child } = await this.getObject({
			objectId: childId,
			signal: options.signal,
			include: { content: true },
		});

		return {
			dynamicField: {
				...entry,
				$kind: 'DynamicObject',
				childId,
				valueType: child.type,
				value: { type: child.type, bcs: child.content },
			},
		};
	}

	/**
	 * The current alias set of `address`: the addresses whose signatures are accepted for it. An
	 * address that never enabled aliases has none on chain and is only its own alias.
	 */
	async getAddressAliases(
		options: SuiClientTypes.GetAddressAliasesOptions,
	): Promise<SuiClientTypes.GetAddressAliasesResponse> {
		const address = normalizeSuiAddress(options.address);
		const objectId = deriveObjectID(
			ADDRESS_ALIAS_STATE_ID,
			ADDRESS_ALIAS_KEY_TYPE,
			bcs.Address.serialize(address).toBytes(),
		);
		const {
			objects: [object],
		} = await this.getObjects({
			objectIds: [objectId],
			signal: options.signal,
			include: { content: true },
		});

		if (object instanceof ObjectError && object.reason === 'notFound') {
			return {
				addressAliases: { address, enabled: false, aliases: [address], objectId, version: null },
			};
		}
		if (object instanceof Error) {
			throw object;
		}
		if (normalizeStructTag(object.type) !== ADDRESS_ALIASES_TYPE) {
			throw new Error(`Object ${objectId} is a ${object.type}, not an address alias set`);
		}

		return {
			addressAliases: {
				address,
				enabled: true,
				aliases: AddressAliasesBcs.parse(object.content).aliases.contents,
				objectId,
				version: object.version,
			},
		};
	}

	/** Fetches and decodes the `Field` object without resolving a dynamic object field's child. */
	async #getDynamicFieldObject(options: SuiClientTypes.GetDynamicFieldOptions) {
		const normalizedNameType = TypeTagSerializer.parseFromStr(
			(
				await this.core.mvr.resolveType({
					type: options.name.type,
					signal: options.signal,
				})
			).type,
		);
		const fieldId = deriveDynamicFieldID(options.parentId, normalizedNameType, options.name.bcs);
		const {
			objects: [fieldObject],
		} = await this.getObjects({
			objectIds: [fieldId],
			signal: options.signal,
			include: {
				previousTransaction: true,
				content: true,
			},
		});

		if (fieldObject instanceof Error) {
			throw fieldObject;
		}

		const fieldType = parseStructTag(fieldObject.type);
		const [nameTypeParam, valueTypeParam] = fieldType.typeParams;
		const isDynamicObject =
			typeof nameTypeParam !== 'string' &&
			nameTypeParam.module === 'dynamic_object_field' &&
			nameTypeParam.name === 'Wrapper';
		// Report the unwrapped name type for dynamic object fields, as listDynamicFields does
		const nameTypeTag = isDynamicObject ? nameTypeParam.typeParams[0] : nameTypeParam;

		return {
			fieldObject,
			isDynamicObject,
			nameType: typeof nameTypeTag === 'string' ? nameTypeTag : normalizeStructTag(nameTypeTag),
			valueType:
				typeof valueTypeParam === 'string' ? valueTypeParam : normalizeStructTag(valueTypeParam),
			valueBcs: fieldObject.content.slice(SUI_ADDRESS_LENGTH + options.name.bcs.length),
		};
	}

	async getDynamicObjectField<Include extends SuiClientTypes.ObjectInclude = {}>(
		options: SuiClientTypes.GetDynamicObjectFieldOptions<Include>,
	): Promise<SuiClientTypes.GetDynamicObjectFieldResponse<Include>> {
		const resolvedNameType = (
			await this.core.mvr.resolveType({
				type: options.name.type,
				signal: options.signal,
			})
		).type;

		const { valueBcs } = await this.#getDynamicFieldObject({
			parentId: options.parentId,
			name: {
				type: `0x2::dynamic_object_field::Wrapper<${resolvedNameType}>`,
				bcs: options.name.bcs,
			},
			signal: options.signal,
		});

		const { object } = await this.getObject({
			objectId: bcs.Address.parse(valueBcs),
			signal: options.signal,
			include: options.include,
		});

		return { object };
	}

	async waitForTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		options: SuiClientTypes.WaitForTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		const { signal, timeout = 60 * 1000, pollSchedule, include } = options;

		const digest =
			'result' in options && options.result
				? (options.result.Transaction ?? options.result.FailedTransaction)!.digest
				: options.digest;

		const abortSignal = signal
			? AbortSignal.any([AbortSignal.timeout(timeout), signal])
			: AbortSignal.timeout(timeout);

		const abortPromise = new Promise((_, reject) => {
			abortSignal.addEventListener('abort', () => reject(abortSignal.reason));
		});

		abortPromise.catch(() => {
			// Swallow unhandled rejections that might be thrown after early return
		});

		// Default schedule tuned to testnet measurements:
		// - Fullnode (gRPC): p50=130ms, p95=330ms
		// - GraphQL indexer: p50=1300ms, p95=1430ms
		// After schedule exhausted, repeats the last interval.
		const schedule = pollSchedule ?? [0, 300, 600, 1500, 3500];
		const t0 = Date.now();
		let scheduleIndex = 0;
		const lastInterval =
			schedule.length > 0
				? schedule[schedule.length - 1] - (schedule[schedule.length - 2] ?? 0)
				: 2_000;

		while (true) {
			if (scheduleIndex < schedule.length) {
				const remaining = t0 + schedule[scheduleIndex] - Date.now();
				scheduleIndex++;
				if (remaining > 0) {
					await Promise.race([
						new Promise((resolve) => setTimeout(resolve, remaining)),
						abortPromise,
					]);
				}
			} else {
				await Promise.race([
					new Promise((resolve) => setTimeout(resolve, lastInterval)),
					abortPromise,
				]);
			}

			abortSignal.throwIfAborted();
			try {
				return await this.getTransaction({
					digest,
					include,
					signal: abortSignal,
				});
			} catch {}
		}
	}

	async signAndExecuteTransaction<Include extends SuiClientTypes.TransactionInclude = {}>({
		transaction,
		signer,
		additionalSignatures = [],
		...input
	}: SuiClientTypes.SignAndExecuteTransactionOptions<Include>): Promise<
		SuiClientTypes.TransactionResult<Include>
	> {
		let transactionBytes;

		if (transaction instanceof Uint8Array) {
			transactionBytes = transaction;
		} else {
			transaction.setSenderIfNotSet(signer.toSuiAddress());
			transactionBytes = await transaction.build({ client: this });
		}

		const { signature } = await signer.signTransaction(transactionBytes);

		return this.executeTransaction({
			transaction: transactionBytes,
			signatures: [signature, ...additionalSignatures],
			...input,
		});
	}
}
