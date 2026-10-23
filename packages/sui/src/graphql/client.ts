// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { TadaDocumentNode } from 'gql.tada';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import {
	CLIENT_PROTOCOL_VERSION_HEADER,
	MAX_PROTOCOL_VERSION,
} from '../client/protocol-version.js';
import { BaseClient } from '../client/index.js';
import type { SuiClientTypes } from '../client/index.js';
import { GraphQLCoreClient } from './core.js';
import type { TypedDocumentString } from './generated/queries.js';
import { GetDynamicFieldsDocument } from './generated/queries.js';
import { fromBase64 } from '@mysten/utils';
import { normalizeStructTag } from '../utils/sui-types.js';
import { deriveDynamicFieldID } from '../utils/dynamic-fields.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { abortableAsyncGenerator } from '../utils/abort.js';
import { isRetryableStatus, SuiGraphQLRequestError } from './errors.js';
import { readGraphQLSSE } from './subscribe.js';

export { SuiGraphQLRequestError } from './errors.js';

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
		/**
		 * Largest SSE event, in characters, before the subscription fails.
		 * @default 16 * 1024 * 1024
		 */
		maxMessageSize?: number;
		/** Called once the server accepts the subscription, before the first result. */
		onOpen?: () => void;
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

const DEFAULT_MAX_SSE_MESSAGE_SIZE = 16 * 1024 * 1024;

/** Serialize the request body before `fetch`, so serialization errors are never retryable. */
function requestBody(options: {
	query: GraphQLDocument<any, any>;
	variables?: unknown;
	operationName?: string;
	extensions?: Record<string, unknown>;
}) {
	return JSON.stringify({
		query:
			typeof options.query === 'string' || options.query instanceof String
				? String(options.query)
				: print(options.query),
		variables: options.variables,
		extensions: options.extensions,
		operationName: options.operationName,
	});
}

const SUI_CLIENT_BRAND = Symbol.for('@mysten/SuiGraphQLClient') as never;

export function isSuiGraphQLClient(client: unknown): client is SuiGraphQLClient {
	return (
		typeof client === 'object' && client !== null && (client as any)[SUI_CLIENT_BRAND] === true
	);
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
			headers: this.#requestHeaders({ 'Content-Type': 'application/json' }),
			body: requestBody(options),
			signal: options.signal,
		});

		if (!res.ok) {
			throw new SuiGraphQLRequestError(
				`GraphQL request failed: ${res.statusText} (${res.status})`,
				{ status: res.status, retryable: isRetryableStatus(res.status) },
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
		// Invalid JSON is a protocol error, not a transport failure, so it is not retryable.
		return JSON.parse(body);
	}

	/**
	 * Run a GraphQL subscription over server-sent events. Does not reconnect; transport failures
	 * throw `SuiGraphQLRequestError`.
	 */
	subscribe<Result = Record<string, unknown>, Variables = Record<string, unknown>>(
		options: GraphQLSubscriptionOptions<Result, Variables>,
	): AsyncGenerator<GraphQLQueryResult<Result>> {
		const run = async function* (
			client: SuiGraphQLClient,
			signal: AbortSignal,
		): AsyncGenerator<GraphQLQueryResult<Result>> {
			const response = await client.#fetchResponse(client.#subscriptionUrl, {
				method: 'POST',
				headers: client.#requestHeaders({
					'Content-Type': 'application/json',
					Accept: 'text/event-stream',
				}),
				body: requestBody(options),
				signal,
			});
			if (response.ok) options.onOpen?.();
			yield* readGraphQLSSE<Result>(
				response,
				signal,
				options.maxMessageSize ?? DEFAULT_MAX_SSE_MESSAGE_SIZE,
			);
		};
		return abortableAsyncGenerator((signal) => run(this, signal), options.signal);
	}

	#requestHeaders(defaults: Record<string, string>): Headers {
		const headers = new Headers({ ...defaults, ...this.#headers });
		if (!headers.has(CLIENT_PROTOCOL_VERSION_HEADER)) {
			headers.set(CLIENT_PROTOCOL_VERSION_HEADER, String(MAX_PROTOCOL_VERSION));
		}
		return headers;
	}

	/** `fetch` that reports network failures (a `TypeError`) as a retryable `SuiGraphQLRequestError`. */
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
		input: SuiClientTypes.SimulateTransactionOptions<Include>,
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

	listCheckpoints(
		input: SuiClientTypes.ListCheckpointsOptions,
	): Promise<SuiClientTypes.ListCheckpointsResponse> {
		return this.core.listCheckpoints(input);
	}

	streamCheckpoints<
		Include extends SuiClientTypes.StreamCheckpointInclude = {},
		Frames extends SuiClientTypes.StreamFrameOptions = {},
	>(
		input?: SuiClientTypes.StreamCheckpointsOptions<Include, Frames>,
	): AsyncGenerator<SuiClientTypes.StreamCheckpointResult<Include, Frames>> {
		return this.core.streamCheckpoints(input);
	}

	streamTransactions<
		Include extends SuiClientTypes.TransactionInclude = {},
		Frames extends SuiClientTypes.StreamFrameOptions = {},
	>(
		input?: SuiClientTypes.StreamTransactionsOptions<Include, Frames>,
	): AsyncGenerator<SuiClientTypes.StreamTransactionResult<Include, Frames>> {
		return this.core.streamTransactions(input);
	}

	streamEvents<Frames extends SuiClientTypes.StreamFrameOptions = {}>(
		input?: SuiClientTypes.StreamEventsOptions<Frames>,
	): AsyncGenerator<SuiClientTypes.StreamEventResult<Frames>> {
		return this.core.streamEvents(input);
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
