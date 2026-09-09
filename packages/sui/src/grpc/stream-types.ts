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
	/** Include the generated protobuf payload on matching items. */
	proto?: boolean;
	/** Include the terminal metadata for every successful underlying List RPC. */
	queryEnd?: boolean;
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

export interface GrpcStreamQueryEndFrame extends GrpcStreamQueryEnd {
	$kind: 'QueryEnd';
}

type Enabled<Include, Key extends PropertyKey, Value> = Key extends keyof Include
	? true extends Include[Key]
		? Value
		: never
	: never;

type Extras<Include, Proto> = ('proto' extends keyof Include
	? Include['proto'] extends true
		? { proto: Proto }
		: true extends Include['proto']
			? { proto?: Proto }
			: {}
	: {}) &
	('progress' extends keyof Include
		? true extends Include['progress']
			? { coveredCheckpoint?: string }
			: {}
		: {}) &
	('queryEnd' extends keyof Include
		? true extends Include['queryEnd']
			? Partial<GrpcStreamQueryEnd>
			: {}
		: {});

type GrpcResult<Frame, Include, Proto> =
	| (Frame extends SuiClientTypes.StreamCompletionFrame ? Frame : Frame & Extras<Include, Proto>)
	| Enabled<Include, 'progress', GrpcStreamProgressFrame & Partial<GrpcStreamQueryEnd>>
	| Enabled<Include, 'queryEnd', GrpcStreamQueryEndFrame>;

interface GrpcStreamControls {
	/** Maximum matching items per historical RPC. */
	pageSize?: number;
	/** Maximum buffered live items (not bytes). Defaults to 1,024. */
	maxBufferedItems?: number;
}

type NativeSelection<Include> = 'proto' extends keyof Include
	? true extends Include['proto']
		? { readMask?: string[] }
		: { readMask?: never }
	: { readMask?: never };

export type GrpcStreamCheckpointsOptions<Include extends GrpcStreamInclude = {}> =
	SuiClientTypes.StreamCheckpointsOptions<Include> &
		GrpcStreamControls &
		NativeSelection<Include> & {
			grpcFilter?: TransactionFilter;
			include?: Include & GrpcStreamInclude;
		};

export type GrpcStreamTransactionsOptions<Include extends GrpcStreamTransactionInclude = {}> = Omit<
	SuiClientTypes.StreamTransactionsOptions<Include>,
	'filter'
> &
	GrpcStreamControls &
	NativeSelection<Include> & {
		include?: Include & GrpcStreamTransactionInclude;
	} & (
		| { filter?: SuiClientTypes.TransactionFilter; grpcFilter?: never }
		| { filter?: never; grpcFilter: TransactionFilter }
	);

export type GrpcStreamEventsOptions<Include extends GrpcStreamInclude = {}> = Omit<
	SuiClientTypes.StreamEventsOptions<Include>,
	'filter'
> &
	GrpcStreamControls &
	NativeSelection<Include> & {
		include?: Include & GrpcStreamInclude;
	} & (
		| { filter?: SuiClientTypes.EventFilter; grpcFilter?: never }
		| { filter?: never; grpcFilter: EventFilter }
	);

export type GrpcStreamCheckpointResult<Include extends GrpcStreamInclude = {}> = GrpcResult<
	SuiClientTypes.StreamCheckpointResult<Include>,
	Include,
	Checkpoint
>;
export type GrpcStreamTransactionResult<Include extends GrpcStreamTransactionInclude = {}> =
	GrpcResult<SuiClientTypes.StreamTransactionResult<Include>, Include, ExecutedTransaction>;
export type GrpcStreamEventResult<Include extends GrpcStreamInclude = {}> = GrpcResult<
	SuiClientTypes.StreamEventResult<Include>,
	Include,
	Event
>;
