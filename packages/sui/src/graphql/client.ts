// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { TadaDocumentNode } from 'gql.tada';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { minValue, number, parse, pipe, safeInteger } from 'valibot';
import { BaseClient } from '../client/index.js';
import type { SuiClientTypes } from '../client/index.js';
import { GraphQLCoreClient } from './core.js';
import type { TypedDocumentString } from './generated/queries.js';
import { GetDynamicFieldsDocument } from './generated/queries.js';
import { fromBase64 } from '@mysten/utils';
import { normalizeStructTag } from '../utils/sui-types.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { readGraphQLSSE } from './subscribe.js';
import { graphQLLedgerStream } from './streams.js';

export type GraphQLDocument<Result = Record<string, unknown>, Variables = Record<string, unknown>> =
	| string
	| DocumentNode
	| TypedDocumentString<Result, Variables>
	| TypedDocumentNode<Result, Variables>
	| TadaDocumentNode<Result, Variables>;

export type GraphQLQueryOptions<
	Result = Record<string, unknown>,
	Variables = Record<string, unknown>,
> = {
	query: GraphQLDocument<Result, Variables>;
	operationName?: string;
	extensions?: Record<string, unknown>;
	signal?: AbortSignal;
} & (Variables extends { [key: string]: never }
	? { variables?: Variables }
	: {
			variables: Variables;
		});

export type GraphQLSubscriptionOptions<
	Result = Record<string, unknown>,
	Variables = Record<string, unknown>,
> = Omit<GraphQLQueryOptions<Result, Variables>, 'variables'> &
	(Record<string, unknown> extends Variables
		? { variables?: Variables }
		: Variables extends { [key: string]: never }
			? { variables?: Variables }
			: { variables: Variables }) & {
		/** Maximum buffered SSE message length in characters. Defaults to 16 Mi characters. */
		maxMessageSize?: number;
	};

export type GraphQLQueryResult<Result = Record<string, unknown>> = {
	data?: Result;
	errors?: GraphQLResponseErrors;
	extensions?: Record<string, unknown>;
};

export type GraphQLResponseErrors = Array<{
	message: string;
	locations?: { line: number; column: number }[];
	path?: (string | number)[];
	extensions?: Record<string, unknown>;
}>;

export interface SuiGraphQLClientOptions<Queries extends Record<string, GraphQLDocument>> {
	url: string;
	/** SSE endpoint; defaults to the query URL with `/subscriptions` appended. */
	subscriptionUrl?: string;
	fetch?: typeof fetch;
	headers?: Record<string, string>;
	queries?: Queries;
	network: SuiClientTypes.Network;
	mvr?: SuiClientTypes.MvrOptions;
}

export class SuiGraphQLRequestError extends Error {
	readonly status?: number;
	readonly retryable: boolean;
	constructor(
		message: string,
		options: { status?: number; retryable?: boolean; cause?: unknown } = {},
	) {
		super(message, { cause: options.cause });
		this.status = options.status;
		this.retryable = options.retryable ?? false;
	}
}

const SUI_CLIENT_BRAND = Symbol.for('@mysten/SuiGraphQLClient') as never;

export function isSuiGraphQLClient(client: unknown): client is SuiGraphQLClient {
	return (
		typeof client === 'object' && client !== null && (client as any)[SUI_CLIENT_BRAND] === true
	);
}

export interface GraphQLSimulateTransactionOptions<
	Include extends SuiClientTypes.SimulateTransactionInclude = {},
> extends SuiClientTypes.SimulateTransactionOptions<Include> {
	/**
	 * Overrides whether the server selects gas payment during simulation.
	 *
	 * When not set, gas selection is enabled only when the transaction's gas payment is explicitly
	 * set to an empty list (`[]`), which indicates gas is paid from the sender's address balance.
	 * Transactions with gas coins set are simulated as-is, and transactions without a gas payment
	 * are simulated with a mocked gas coin.
	 */
	doGasSelection?: boolean;
}

export interface DynamicFieldInclude {
	value?: boolean;
}

export type DynamicFieldEntryWithValue<Include extends DynamicFieldInclude = {}> =
	SuiClientTypes.DynamicFieldEntry & {
		value: Include extends { value: true } ? SuiClientTypes.DynamicFieldValue : undefined;
	};

export interface ListDynamicFieldsWithValueResponse<Include extends DynamicFieldInclude = {}> {
	hasNextPage: boolean;
	cursor: string | null;
	dynamicFields: DynamicFieldEntryWithValue<Include>[];
}

export class SuiGraphQLClient<Queries extends Record<string, GraphQLDocument> = {}>
	extends BaseClient
	implements SuiClientTypes.TransportMethods
{
	#url: string;
	#subscriptionUrl: string;
	#queries: Queries;
	#headers: Record<string, string>;
	#fetch: typeof fetch;
	core: GraphQLCoreClient;
	get mvr(): SuiClientTypes.MvrMethods {
		return this.core.mvr;
	}

	get [SUI_CLIENT_BRAND]() {
		return true;
	}

	constructor({
		url,
		subscriptionUrl,
		fetch: fetchFn = fetch,
		headers = {},
		queries = {} as Queries,
		network,
		mvr,
	}: SuiGraphQLClientOptions<Queries>) {
		super({
			network,
		});
		this.#url = url;
		const suffixIndex = url.search(/[?#]/);
		const path = suffixIndex === -1 ? url : url.slice(0, suffixIndex);
		const suffix = suffixIndex === -1 ? '' : url.slice(suffixIndex);
		this.#subscriptionUrl = subscriptionUrl ?? `${path.replace(/\/$/, '')}/subscriptions${suffix}`;
		this.#queries = queries;
		this.#headers = headers;
		this.#fetch = (...args) => fetchFn(...args);
		this.core = new GraphQLCoreClient({
			graphqlClient: this,
			mvr,
		});
	}

	async query<Result = Record<string, unknown>, Variables = Record<string, unknown>>(
		options: GraphQLQueryOptions<Result, Variables>,
	): Promise<GraphQLQueryResult<Result>> {
		const res = await this.#fetchResponse(this.#url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...this.#headers,
			},
			body: JSON.stringify({
				query:
					typeof options.query === 'string' || options.query instanceof String
						? String(options.query)
						: print(options.query),
				variables: options.variables,
				extensions: options.extensions,
				operationName: options.operationName,
			}),
			signal: options.signal,
		});

		if (!res.ok) {
			throw new SuiGraphQLRequestError(
				`GraphQL request failed: ${res.statusText} (${res.status})`,
				{ status: res.status },
			);
		}

		let body: string;
		try {
			body = await res.text();
		} catch (cause) {
			options.signal?.throwIfAborted();
			throw new SuiGraphQLRequestError('GraphQL response body could not be read', {
				retryable: true,
				cause,
			});
		}
		// JSON syntax and subsequent response mapping failures are protocol errors, not
		// transport failures. Keep them outside the retryable body-read boundary.
		return JSON.parse(body);
	}

	async #fetchResponse(url: string, init: RequestInit): Promise<Response> {
		try {
			return await this.#fetch(url, init);
		} catch (cause) {
			init.signal?.throwIfAborted();
			if (!(cause instanceof TypeError)) throw cause;
			throw new SuiGraphQLRequestError('GraphQL network request failed', {
				retryable: true,
				cause,
			});
		}
	}

	/** Subscribe to an arbitrary GraphQL document over HTTP SSE. GraphQL errors remain in each response. */
	subscribe<Result = Record<string, unknown>, Variables = Record<string, unknown>>(
		options: GraphQLSubscriptionOptions<Result, Variables>,
	): AsyncGenerator<GraphQLQueryResult<Result>> {
		const controller = new AbortController();
		const abort = () => controller.abort(options.signal?.reason);
		const run = async function* (
			client: SuiGraphQLClient,
		): AsyncGenerator<GraphQLQueryResult<Result>> {
			if (options.signal?.aborted) abort();
			else options.signal?.addEventListener('abort', abort, { once: true });
			try {
				controller.signal.throwIfAborted();
				const maxMessageSize = options.maxMessageSize ?? 16 * 1024 * 1024;
				parse(
					pipe(
						number(),
						safeInteger('maxMessageSize must be a positive integer'),
						minValue(1, 'maxMessageSize must be a positive integer'),
					),
					maxMessageSize,
				);
				const response = await client.#fetchResponse(client.#subscriptionUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'text/event-stream',
						...client.#headers,
					},
					body: JSON.stringify({
						query:
							typeof options.query === 'string' || options.query instanceof String
								? String(options.query)
								: print(options.query),
						variables: options.variables,
						operationName: options.operationName,
						extensions: options.extensions,
					}),
					signal: controller.signal,
				});
				yield* readGraphQLSSE<Result>(response, controller.signal, maxMessageSize);
			} catch (error) {
				controller.signal.throwIfAborted();
				throw error;
			} finally {
				controller.abort();
				options.signal?.removeEventListener('abort', abort);
			}
		};
		const iterator = run(this);
		const originalReturn = iterator.return.bind(iterator);
		iterator.return = (value) => {
			controller.abort();
			return originalReturn(value);
		};
		const originalThrow = iterator.throw.bind(iterator);
		iterator.throw = (error) => {
			controller.abort(error);
			return originalThrow(error);
		};
		return iterator;
	}

	streamCheckpoints<Include extends SuiClientTypes.StreamInclude = {}>(
		options: SuiClientTypes.StreamCheckpointsOptions<Include> = {},
	): AsyncGenerator<SuiClientTypes.StreamCheckpointResult<Include>> {
		return graphQLLedgerStream(this, 'checkpoints', options) as AsyncGenerator<
			SuiClientTypes.StreamCheckpointResult<Include>
		>;
	}

	streamTransactions<Include extends SuiClientTypes.StreamTransactionInclude = {}>(
		options: SuiClientTypes.StreamTransactionsOptions<Include> = {},
	): AsyncGenerator<SuiClientTypes.StreamTransactionResult<Include>> {
		return graphQLLedgerStream(this, 'transactions', options) as AsyncGenerator<
			SuiClientTypes.StreamTransactionResult<Include>
		>;
	}

	streamEvents<Include extends SuiClientTypes.StreamInclude = {}>(
		options: SuiClientTypes.StreamEventsOptions<Include> = {},
	): AsyncGenerator<SuiClientTypes.StreamEventResult<Include>> {
		return graphQLLedgerStream(this, 'events', options) as AsyncGenerator<
			SuiClientTypes.StreamEventResult<Include>
		>;
	}

	async execute<
		const Query extends Extract<keyof Queries, string>,
		Result = Queries[Query] extends GraphQLDocument<infer R, unknown> ? R : Record<string, unknown>,
		Variables = Queries[Query] extends GraphQLDocument<unknown, infer V>
			? V
			: Record<string, unknown>,
	>(
		query: Query,
		options: Omit<GraphQLQueryOptions<Result, Variables>, 'query'>,
	): Promise<GraphQLQueryResult<Result>> {
		return this.query({
			...(options as { variables: Record<string, unknown> }),
			query: this.#queries[query]!,
		}) as Promise<GraphQLQueryResult<Result>>;
	}

	getObjects<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.GetObjectsOptions<Include>,
	): Promise<SuiClientTypes.GetObjectsResponse<Include>> {
		return this.core.getObjects(input);
	}

	getObject<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.GetObjectOptions<Include>,
	): Promise<SuiClientTypes.GetObjectResponse<Include>> {
		return this.core.getObject(input);
	}

	listCoins(input: SuiClientTypes.ListCoinsOptions): Promise<SuiClientTypes.ListCoinsResponse> {
		return this.core.listCoins(input);
	}

	listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListOwnedObjectsResponse<Include>> {
		return this.core.listOwnedObjects(input);
	}

	getBalance(input: SuiClientTypes.GetBalanceOptions): Promise<SuiClientTypes.GetBalanceResponse> {
		return this.core.getBalance(input);
	}

	listBalances(
		input: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse> {
		return this.core.listBalances(input);
	}

	getCoinMetadata(
		input: SuiClientTypes.GetCoinMetadataOptions,
	): Promise<SuiClientTypes.GetCoinMetadataResponse> {
		return this.core.getCoinMetadata(input);
	}

	getTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.GetTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		return this.core.getTransaction(input);
	}

	executeTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		return this.core.executeTransaction(input);
	}

	signAndExecuteTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.SignAndExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		return this.core.signAndExecuteTransaction(input);
	}

	waitForTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.WaitForTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		return this.core.waitForTransaction(input);
	}

	simulateTransaction<Include extends SuiClientTypes.SimulateTransactionInclude = {}>(
		input: GraphQLSimulateTransactionOptions<Include>,
	): Promise<SuiClientTypes.SimulateTransactionResult<Include>> {
		return this.core.simulateTransaction(input);
	}

	getReferenceGasPrice(
		input?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		return this.core.getReferenceGasPrice(input);
	}

	getCurrentSystemState(
		input?: SuiClientTypes.GetCurrentSystemStateOptions,
	): Promise<SuiClientTypes.GetCurrentSystemStateResponse> {
		return this.core.getCurrentSystemState(input);
	}

	getProtocolConfig(
		input?: SuiClientTypes.GetProtocolConfigOptions,
	): Promise<SuiClientTypes.GetProtocolConfigResponse> {
		return this.core.getProtocolConfig(input);
	}

	getChainIdentifier(
		input?: SuiClientTypes.GetChainIdentifierOptions,
	): Promise<SuiClientTypes.GetChainIdentifierResponse> {
		return this.core.getChainIdentifier(input);
	}

	async listDynamicFields<Include extends DynamicFieldInclude = {}>(
		input: SuiClientTypes.ListDynamicFieldsOptions & { include?: Include & DynamicFieldInclude },
	): Promise<ListDynamicFieldsWithValueResponse<Include>> {
		const includeValue = input.include?.value ?? false;

		const { data, errors } = await this.query({
			query: GetDynamicFieldsDocument,
			signal: input.signal,
			variables: {
				parentId: input.parentId,
				first: input.limit,
				cursor: input.cursor,
				includeValue,
			},
		});

		if (errors?.length) {
			throw errors.length === 1
				? new Error(errors[0].message)
				: new AggregateError(errors.map((e) => new Error(e.message)));
		}

		const result = data?.address?.dynamicFields;
		if (!result) {
			throw new Error('Missing response data');
		}

		return {
			dynamicFields: result.nodes.map((dynamicField): DynamicFieldEntryWithValue<Include> => {
				const valueType =
					dynamicField.value?.__typename === 'MoveObject'
						? dynamicField.value.contents?.type?.repr!
						: dynamicField.value?.type?.repr!;
				const isDynamicObject = dynamicField.value?.__typename === 'MoveObject';
				const derivedNameType = isDynamicObject
					? `0x2::dynamic_object_field::Wrapper<${dynamicField.name?.type?.repr}>`
					: dynamicField.name?.type?.repr!;

				let value: SuiClientTypes.DynamicFieldValue | undefined;
				if (includeValue) {
					let valueBcs: Uint8Array;
					if (dynamicField.value?.__typename === 'MoveValue') {
						valueBcs = fromBase64(dynamicField.value.bcs ?? '');
					} else if (dynamicField.value?.__typename === 'MoveObject') {
						valueBcs = fromBase64(dynamicField.value.contents?.bcs ?? '');
					} else {
						valueBcs = new Uint8Array();
					}
					value = { type: valueType, bcs: valueBcs };
				}

				return {
					$kind: isDynamicObject ? 'DynamicObject' : 'DynamicField',
					fieldId: deriveDynamicFieldID(
						input.parentId,
						derivedNameType,
						fromBase64(dynamicField.name?.bcs!),
					),
					type: normalizeStructTag(
						isDynamicObject
							? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${dynamicField.name?.type?.repr}>,0x2::object::ID>`
							: `0x2::dynamic_field::Field<${dynamicField.name?.type?.repr},${valueType}>`,
					),
					name: {
						type: dynamicField.name?.type?.repr!,
						bcs: fromBase64(dynamicField.name?.bcs!),
					},
					valueType,
					childId:
						isDynamicObject && dynamicField.value?.__typename === 'MoveObject'
							? dynamicField.value.address
							: undefined,
					value: (includeValue ? value : undefined) as DynamicFieldEntryWithValue<Include>['value'],
				} as DynamicFieldEntryWithValue<Include>;
			}),
			cursor: result.pageInfo.endCursor ?? null,
			hasNextPage: result.pageInfo.hasNextPage,
		};
	}

	getDynamicField(
		input: SuiClientTypes.GetDynamicFieldOptions,
	): Promise<SuiClientTypes.GetDynamicFieldResponse> {
		return this.core.getDynamicField(input);
	}

	getDynamicObjectField<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.GetDynamicObjectFieldOptions<Include>,
	): Promise<SuiClientTypes.GetDynamicObjectFieldResponse<Include>> {
		return this.core.getDynamicObjectField(input);
	}

	listTransactions<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.ListTransactionsOptions<Include>,
	): Promise<SuiClientTypes.ListTransactionsResponse<Include>> {
		return this.core.listTransactions(input);
	}

	listEvents(input: SuiClientTypes.ListEventsOptions): Promise<SuiClientTypes.ListEventsResponse> {
		return this.core.listEvents(input);
	}

	getMoveFunction(
		input: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse> {
		return this.core.getMoveFunction(input);
	}

	resolveTransactionPlugin(): TransactionPlugin {
		return this.core.resolveTransactionPlugin();
	}

	verifyZkLoginSignature(
		input: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse> {
		return this.core.verifyZkLoginSignature(input);
	}

	defaultNameServiceName(
		input: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		return this.core.defaultNameServiceName(input);
	}

	resolveNameServiceAddress(
		input: SuiClientTypes.ResolveNameServiceAddressOptions,
	): Promise<SuiClientTypes.ResolveNameServiceAddressResponse> {
		return this.core.resolveNameServiceAddress(input);
	}
}
