// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../client/types.js';
import type { Checkpoint } from './proto/sui/rpc/v2/checkpoint.js';
import type { Event } from './proto/sui/rpc/v2/event.js';
import type { ExecutedTransaction } from './proto/sui/rpc/v2/executed_transaction.js';
import type { EventFilter, TransactionFilter } from './proto/sui/rpc/v2/filter.js';
import type { QueryEnd, Watermark } from './proto/sui/rpc/v2/query_options.js';

export interface GrpcStreamInclude extends SuiClientTypes.StreamInclude {
	/** Emit safe scan progress even when no item matches. */
	progress?: boolean;
}

export interface GrpcStreamTransactionInclude
	extends SuiClientTypes.StreamTransactionInclude, GrpcStreamInclude {}

export type GrpcStreamStage = 'historical' | 'recovery' | 'tip';

export interface GrpcStreamQueryEnd {
	queryEnd: QueryEnd;
	watermark: Watermark;
	stage: GrpcStreamStage;
	/** Native item associated with a diagnostic RPC terminal frame. */
	lastItem?: Checkpoint | ExecutedTransaction | Event;
}

export interface GrpcStreamProgressFrame {
	$kind: 'Progress';
	resumeToken: SuiClientTypes.StreamResumeToken;
	coveredCheckpoint?: string;
}

type Enabled<Include, Key extends PropertyKey, Value> = Key extends keyof Include
	? true extends Include[Key]
		? Value
		: never
	: never;

type Extras<Include> = 'progress' extends keyof Include
	? true extends Include['progress']
		? { coveredCheckpoint?: string }
		: {}
	: {};

type GrpcResult<Frame, Include> =
	| (Frame extends SuiClientTypes.StreamCompletionFrame ? Frame : Frame & Extras<Include>)
	| Enabled<Include, 'progress', GrpcStreamProgressFrame>;

interface GrpcStreamControls {
	/**
	 * Observe terminal metadata from underlying List RPCs synchronously.
	 * This is diagnostic, not resumable progress. Throwing terminates the stream without retrying.
	 */
	onQueryEnd?: (metadata: GrpcStreamQueryEnd) => void;
	/** Maximum matching items per historical RPC. */
	pageSize?: number;
	/** Maximum buffered live items (not bytes). Defaults to 1,024. */
	maxBufferedItems?: number;
}

export type GrpcStreamCheckpointsOptions<Include extends GrpcStreamInclude = {}> =
	SuiClientTypes.StreamCheckpointsOptions<Include> &
		GrpcStreamControls & {
			grpcFilter?: TransactionFilter;
			include?: Include & GrpcStreamInclude;
		};

export type GrpcStreamTransactionsOptions<Include extends GrpcStreamTransactionInclude = {}> = Omit<
	SuiClientTypes.StreamTransactionsOptions<Include>,
	'filter'
> &
	GrpcStreamControls & {
		include?: Include & GrpcStreamTransactionInclude;
	} & (
		| { filter?: SuiClientTypes.TransactionFilter; grpcFilter?: never }
		| { filter?: never; grpcFilter: TransactionFilter }
	);

export type GrpcStreamEventsOptions<Include extends GrpcStreamInclude = {}> = Omit<
	SuiClientTypes.StreamEventsOptions<Include>,
	'filter'
> &
	GrpcStreamControls & {
		include?: Include & GrpcStreamInclude;
	} & (
		| { filter?: SuiClientTypes.EventFilter; grpcFilter?: never }
		| { filter?: never; grpcFilter: EventFilter }
	);

export type GrpcStreamCheckpointResult<Include extends GrpcStreamInclude = {}> = GrpcResult<
	SuiClientTypes.StreamCheckpointResult<Include>,
	Include
>;
export type GrpcStreamTransactionResult<Include extends GrpcStreamTransactionInclude = {}> =
	GrpcResult<SuiClientTypes.StreamTransactionResult<Include>, Include>;
export type GrpcStreamEventResult<Include extends GrpcStreamInclude = {}> = GrpcResult<
	SuiClientTypes.StreamEventResult<Include>,
	Include
>;
