// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { TadaDocumentNode } from 'gql.tada';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { BaseClient } from '../client/index.js';
import type { SuiClientTypes } from '../client/index.js';
import { GraphQLCoreClient } from './core.js';
import type { TypedDocumentString } from './generated/queries.js';
import type { TransactionPlugin } from '../transactions/index.js';

export type GraphQLDocument<
	Result = Record<string, unknown>,
	Variables = Record<string, unknown>,
> =
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

export type GraphQLQueryResult<Result = Record<string, unknown>> = {
	data?: Result;
	errors?: GraphQLResponseErrors;
	extensions?: Record<string, unknown>;
};

export type GraphQLResponseErrors = Array<{
	message: string;
	locations?: { line: number; column: number }[];
	path?: (string | number)[];
}>;

export interface SuiGraphQLClientOptions<Queries extends Record<string, GraphQLDocument>> {
	url: string;
	fetch?: typeof fetch;
	headers?: Record<string, string>;
	queries?: Queries;
	network: SuiClientTypes.Network;
	mvr?: SuiClientTypes.MvrOptions;
}

export class SuiGraphQLRequestError extends Error {}

const SUI_CLIENT_BRAND = Symbol.for('@mysten/SuiGraphQLClient') as never;

export function isSuiGraphQLClient(client: unknown): client is SuiGraphQLClient {
	return (
		typeof client === 'object' && client !== null && (client as any)[SUI_CLIENT_BRAND] === true
	);
}

export class SuiGraphQLClient<Queries extends Record<string, GraphQLDocument> = {}>
	extends BaseClient
	implements SuiClientTypes.TransportMethods
{
	#url: string;
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
		const res = await this.#fetch(this.#url, {
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
			throw new SuiGraphQLRequestError(`GraphQL request failed: ${res.statusText} (${res.status})`);
		}

		return await res.json();
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

	getReferenceGasPrice(): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		return this.core.getReferenceGasPrice();
	}

	listDynamicFields(
		input: SuiClientTypes.ListDynamicFieldsOptions,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse> {
		return this.core.listDynamicFields(input);
	}

	getDynamicField(
		input: SuiClientTypes.GetDynamicFieldOptions,
	): Promise<SuiClientTypes.GetDynamicFieldResponse> {
		return this.core.getDynamicField(input);
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
}
