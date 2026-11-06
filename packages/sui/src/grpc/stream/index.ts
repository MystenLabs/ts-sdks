// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { LedgerStreamRequest } from '../../client/core.js';
import { resolveEventFilter, resolveTransactionFilter } from '../../client/query-filters.js';
import type {
	Bound,
	ItemFrame,
	LedgerStreamAdapter,
	PageRequest,
	StreamFamily,
} from '../../client/stream/index.js';
import { SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import { toGrpcEventFilter, toGrpcTransactionFilter } from '../filters.js';
import { isNonRetryable } from '../pull-call.js';
import { openLedgerCall, type LedgerCall } from './call.js';
import {
	GRPC_FAMILIES,
	mapGrpcItem,
	type GrpcFamily,
	type GrpcItem,
	type ListFrame,
	type LiveFrame,
	type NativeFilter,
} from './families.js';
import { liveSubscription } from './live.js';
import { fetchListPage, readIndexedTip, type ListQuery } from './page.js';

/** What the adapter needs from `GrpcCoreClient`. */
export interface GrpcStreamContext {
	transport: RpcTransport;
	mvr: SuiClientTypes.MvrMethods;
	chainIdentifier(signal: AbortSignal): Promise<string>;
}

/** A core stream request; `SuiGrpcClient` may pass a native `grpcFilter` through its options. */
export type GrpcLedgerStreamRequest = LedgerStreamRequest & {
	options: { grpcFilter?: NativeFilter };
};

/** This stream's calls, with its resolved filter and read mask fixed. */
interface GrpcStreamCalls {
	readonly family: GrpcFamily;
	list(query: ListQuery, signal: AbortSignal): LedgerCall<ListFrame>;
	subscribe(signal: AbortSignal): LedgerCall<LiveFrame>;
}

/** A ledger stream over gRPC: List calls for pages, Subscribe calls for live delivery. */
export class GrpcLedgerStreamAdapter implements LedgerStreamAdapter<GrpcItem, ItemFrame> {
	readonly transport = 'grpc' as const;
	readonly family: StreamFamily;
	/** Subscriptions take no start: the core pages history and replays the gap itself. */
	readonly live = 'fromTip';
	readonly #context: GrpcStreamContext;
	readonly #request: GrpcLedgerStreamRequest;
	#calls: GrpcStreamCalls | undefined;

	constructor(context: GrpcStreamContext, request: GrpcLedgerStreamRequest) {
		if (request.options.grpcFilter && 'filter' in request.options && request.options.filter) {
			throw new SuiStreamError('InvalidOptions', 'Use either filter or grpcFilter, not both');
		}
		this.#context = context;
		this.#request = request;
		this.family = request.family;
	}

	async initialize(signal: AbortSignal) {
		const { grpcFilter } = this.#request.options;
		const shared = grpcFilter ? undefined : await this.#sharedFilter(signal);
		const chain = await this.#context.chainIdentifier(signal);
		this.#calls = this.#streamCalls(grpcFilter ?? shared?.native);
		// Tokens bind to the resolved shared filter, not to its protobuf conversion.
		return { chain, filter: grpcFilter ?? shared?.resolved ?? null };
	}

	indexedTip(signal: AbortSignal) {
		return readIndexedTip(this.#context.transport, signal);
	}

	fetchPage(request: PageRequest) {
		const { family, list } = this.#initializedCalls();
		return fetchListPage(family, list, request);
	}

	subscribe(_from: Bound | undefined, signal: AbortSignal) {
		const { family, subscribe } = this.#initializedCalls();
		return liveSubscription(subscribe(signal), family);
	}

	mapItem(item: GrpcItem) {
		return mapGrpcItem(item, this.#transactionInclude());
	}

	retryReason(error: unknown): SuiClientTypes.RetryReason | undefined {
		if (!(error instanceof RpcError) || isNonRetryable(error)) return undefined;
		switch (error.code) {
			case 'UNAVAILABLE':
			case 'CANCELLED':
			case 'ABORTED':
				return 'Unavailable';
			case 'RESOURCE_EXHAUSTED':
				return 'RateLimited';
			case 'DEADLINE_EXCEEDED':
			case 'UNKNOWN':
				return 'ServerError';
			default:
				return undefined;
		}
	}

	async #sharedFilter(
		signal: AbortSignal,
	): Promise<{ resolved: unknown; native: NativeFilter | undefined } | undefined> {
		const { mvr } = this.#context;
		const request = this.#request;
		switch (request.family) {
			case 'checkpoints':
				return undefined;
			case 'transactions': {
				if (!request.options.filter) return undefined;
				const resolved = await resolveTransactionFilter(mvr, request.options.filter, signal);
				return { resolved, native: toGrpcTransactionFilter(resolved) };
			}
			case 'events': {
				if (!request.options.filter) return undefined;
				const resolved = await resolveEventFilter(mvr, request.options.filter, signal);
				return { resolved, native: toGrpcEventFilter(resolved) };
			}
		}
	}

	#streamCalls(filter: NativeFilter | undefined): GrpcStreamCalls {
		const { transport } = this.#context;
		const family = GRPC_FAMILIES[this.family];
		const readMask = { paths: family.readMask(this.#transactionInclude()) };
		const isItem = (frame: object) => family.item(frame) !== undefined;
		return {
			family,
			// A List call holds at most one page, as much as reading the page whole would.
			list: (query, signal) =>
				openLedgerCall(
					transport,
					family.list,
					{ ...query, readMask, filter },
					{ signal, isItem, maxBytes: Infinity },
				),
			subscribe: (signal) =>
				openLedgerCall(
					transport,
					family.subscribe,
					{ readMask, filter },
					{ signal, isItem, coalesceProgress: true },
				),
		};
	}

	/** The fields of each streamed transaction, or of each checkpoint's transactions. */
	#transactionInclude(): SuiClientTypes.TransactionInclude | undefined {
		const request = this.#request;
		if (request.family === 'transactions') return request.options.include ?? {};
		if (request.family === 'checkpoints') return request.options.include?.transactions;
		return undefined;
	}

	#initializedCalls(): GrpcStreamCalls {
		if (!this.#calls) throw new Error('gRPC ledger stream used before initialize');
		return this.#calls;
	}
}
