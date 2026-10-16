// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { LedgerStreamRequest } from '../../client/core.js';
import { resolveEventFilter, resolveTransactionFilter } from '../../client/query-filters.js';
import type {
	ErrorClass,
	FollowSession,
	ItemFrame,
	LedgerStreamAdapter,
	ScanRequest,
	StreamFamily,
} from '../../client/stream/index.js';
import { SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import { toGrpcEventFilter, toGrpcTransactionFilter } from '../filters.js';
import { isNonRetryable } from '../pull-call.js';
import { isBufferOverflow, openLedgerCall } from './call.js';
import { followLedger } from './follow.js';
import { GRPC_FAMILIES, mapGrpcItem, type GrpcItem, type NativeFilter } from './families.js';
import {
	comparePositions,
	grpcPositionCodec,
	locatePosition,
	positionCoverage,
	type GrpcPosition,
} from './position.js';
import { readIndexedTip, scanLedger, type GrpcStreamCalls } from './scan.js';

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

const RETRYABLE_CODES = new Set([
	'UNAVAILABLE',
	'DEADLINE_EXCEEDED',
	'RESOURCE_EXHAUSTED',
	'ABORTED',
	'UNKNOWN',
	'CANCELLED',
]);

/** A ledger stream over gRPC: List calls for history, Subscribe calls for live delivery. */
export class GrpcLedgerStreamAdapter implements LedgerStreamAdapter<
	GrpcPosition,
	GrpcItem,
	ItemFrame
> {
	readonly transport = 'grpc' as const;
	readonly family: StreamFamily;
	readonly position = grpcPositionCodec();
	/** A subscription starts at the live tip, so a fresh follow needs no indexed tip. */
	readonly anchorsAtLiveTip = true;
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
		const filter = this.#request.options.grpcFilter ?? (await this.#sharedFilter(signal));
		const chain = await this.#context.chainIdentifier(signal);
		this.#calls = this.#streamCalls(filter);
		return { chain, filter: filter ?? null };
	}

	indexedTip(signal: AbortSignal) {
		return readIndexedTip(this.#context.transport, signal);
	}

	scan(request: ScanRequest<GrpcPosition>) {
		return scanLedger(this.#initializedCalls(), request);
	}

	follow(session: FollowSession<GrpcPosition, GrpcItem, ItemFrame>) {
		return followLedger(this.#initializedCalls(), session);
	}

	compare(a: GrpcPosition, b: GrpcPosition) {
		return comparePositions(a, b);
	}

	coverage(position: GrpcPosition) {
		return positionCoverage(position, this.family);
	}

	locate(position: GrpcPosition) {
		return locatePosition(position);
	}

	mapItem(item: GrpcItem) {
		const include = this.#request.family === 'transactions' ? this.#request.options.include : {};
		return mapGrpcItem(item, include);
	}

	classify(error: unknown): ErrorClass {
		if (isBufferOverflow(error)) return 'disconnect';
		if (!(error instanceof RpcError) || isNonRetryable(error)) return 'fatal';
		return RETRYABLE_CODES.has(error.code) ? 'retry' : 'fatal';
	}

	async #sharedFilter(signal: AbortSignal): Promise<NativeFilter | undefined> {
		const { mvr } = this.#context;
		const request = this.#request;
		switch (request.family) {
			case 'checkpoints':
				return undefined;
			case 'transactions':
				return request.options.filter
					? toGrpcTransactionFilter(
							await resolveTransactionFilter(mvr, request.options.filter, signal),
						)
					: undefined;
			case 'events':
				return request.options.filter
					? toGrpcEventFilter(await resolveEventFilter(mvr, request.options.filter, signal))
					: undefined;
		}
	}

	#streamCalls(filter: NativeFilter | undefined): GrpcStreamCalls {
		const { transport } = this.#context;
		const family = GRPC_FAMILIES[this.family];
		const include =
			this.#request.family === 'transactions' ? this.#request.options.include : undefined;
		const readMask = { paths: family.readMask(include) };
		const isItem = (frame: object) => family.item(frame) !== undefined;
		return {
			family,
			list: (query, signal) =>
				openLedgerCall(transport, family.list, { ...query, readMask, filter }, { signal, isItem }),
			subscribe: (signal) =>
				openLedgerCall(
					transport,
					family.subscribe,
					{ readMask, filter },
					{ signal, isItem, coalesceProgress: true },
				),
			indexedTip: (signal) => readIndexedTip(transport, signal),
		};
	}

	#initializedCalls(): GrpcStreamCalls {
		if (!this.#calls) throw new Error('gRPC ledger stream used before initialize');
		return this.#calls;
	}
}
