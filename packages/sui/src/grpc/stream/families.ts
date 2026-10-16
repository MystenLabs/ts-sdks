// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MethodInfo, ServiceType } from '@protobuf-ts/runtime-rpc';

import type { ItemFrame, StreamFamily } from '../../client/stream/index.js';
import { SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import {
	CHECKPOINT_READ_MASK_PATHS,
	EVENT_READ_MASK_PATHS,
	parseGrpcCheckpoint,
	parseGrpcEvent,
	parseGrpcTransactionResponse,
	transactionReadMaskPaths,
} from '../core.js';
import type { FieldMask } from '../proto/google/protobuf/field_mask.js';
import type { Checkpoint } from '../proto/sui/rpc/v2/checkpoint.js';
import type { Event } from '../proto/sui/rpc/v2/event.js';
import type { ExecutedTransaction } from '../proto/sui/rpc/v2/executed_transaction.js';
import type { EventFilter, TransactionFilter } from '../proto/sui/rpc/v2/filter.js';
import { LedgerService } from '../proto/sui/rpc/v2/ledger_service.js';
import type { QueryEnd, QueryOptions, Watermark } from '../proto/sui/rpc/v2/query_options.js';
import { SubscriptionService } from '../proto/sui/rpc/v2/subscription_service.js';
import { checkpointCursorPosition, type GrpcPosition } from './position.js';

/** The ledger item a frame carries. */
export type GrpcItem =
	| { $kind: 'Checkpoint'; checkpoint: Checkpoint }
	| { $kind: 'Transaction'; transaction: ExecutedTransaction }
	| { $kind: 'Event'; event: Event };

export type NativeFilter = TransactionFilter | EventFilter;

/** The fields every `List*Request` shares. */
export interface ListRequest {
	readMask: FieldMask;
	filter?: NativeFilter;
	startCheckpoint?: bigint;
	endCheckpoint?: bigint;
	options: QueryOptions;
}

/** The fields every `Subscribe*Request` shares. */
export interface SubscribeRequest {
	readMask: FieldMask;
	filter?: NativeFilter;
}

/** A `List*Response`: each family sets only its own item field. */
export interface ListFrame {
	checkpoint?: Checkpoint;
	transaction?: ExecutedTransaction;
	event?: Event;
	watermark?: Watermark;
	end?: QueryEnd;
}

/** A `Subscribe*Response`. Checkpoint subscriptions report `cursor` instead of a watermark. */
export interface LiveFrame {
	checkpoint?: Checkpoint;
	transaction?: ExecutedTransaction;
	event?: Event;
	watermark?: Watermark;
	cursor?: bigint;
}

/** What differs between the three streams. Everything else is shared. */
export interface GrpcFamily {
	readonly name: StreamFamily;
	readonly list: MethodInfo<ListRequest, ListFrame>;
	readonly subscribe: MethodInfo<SubscribeRequest, LiveFrame>;
	readMask(include: SuiClientTypes.TransactionInclude | undefined): string[];
	item(frame: ListFrame | LiveFrame): GrpcItem | undefined;
	/** The position a subscription frame reports. */
	livePosition(frame: LiveFrame, item: GrpcItem | undefined): GrpcPosition;
}

export const GRPC_FAMILIES: Record<StreamFamily, GrpcFamily> = {
	checkpoints: {
		name: 'checkpoints',
		list: streamingMethod(LedgerService, 'ListCheckpoints'),
		subscribe: streamingMethod(SubscriptionService, 'SubscribeCheckpoints'),
		readMask: () => CHECKPOINT_READ_MASK_PATHS,
		item: (frame) => frame.checkpoint && { $kind: 'Checkpoint', checkpoint: frame.checkpoint },
		livePosition(frame, item) {
			if (frame.cursor === undefined) {
				throw new SuiStreamError('Protocol', 'Checkpoint subscription frame is missing its cursor');
			}
			return checkpointCursorPosition(frame.cursor, item !== undefined);
		},
	},
	transactions: {
		name: 'transactions',
		list: streamingMethod(LedgerService, 'ListTransactions'),
		subscribe: streamingMethod(SubscriptionService, 'SubscribeTransactions'),
		// `transaction_index` orders transactions within a checkpoint.
		readMask: (include) => [...transactionReadMaskPaths(include), 'transaction_index'],
		item: (frame) => frame.transaction && { $kind: 'Transaction', transaction: frame.transaction },
		livePosition: framePosition,
	},
	events: {
		name: 'events',
		list: streamingMethod(LedgerService, 'ListEvents'),
		subscribe: streamingMethod(SubscriptionService, 'SubscribeEvents'),
		readMask: () => [...EVENT_READ_MASK_PATHS, 'transaction_index'],
		item: (frame) => frame.event && { $kind: 'Event', event: frame.event },
		livePosition: framePosition,
	},
};

/**
 * A generated service method by name. `ListRequest`/`ListFrame` and their subscription
 * counterparts name the fields every family's messages share, so the typed result is safe.
 */
function streamingMethod<I extends object, O extends object>(
	service: ServiceType,
	name: string,
): MethodInfo<I, O> {
	const method = service.methods.find((candidate) => candidate.name === name);
	if (!method?.serverStreaming) {
		throw new Error(`${service.typeName}/${name} is not a server-streaming method`);
	}
	return method;
}

/**
 * The position a watermarked frame reports. Its coverage is the watermark's checkpoint as sent;
 * `CoverageTracker` fills in what the frame omitted.
 */
export function framePosition(
	frame: { watermark?: Watermark },
	item: GrpcItem | undefined,
): GrpcPosition {
	const { watermark } = frame;
	if (!watermark?.cursor?.length) {
		throw new SuiStreamError('Protocol', 'Ledger response is missing its watermark cursor');
	}
	return {
		cursor: { $kind: 'Native', bytes: watermark.cursor },
		coverage:
			watermark.checkpoint === undefined
				? { $kind: 'Unknown' }
				: { $kind: 'Through', checkpoint: watermark.checkpoint },
		checkpointBoundary: null,
		...itemCoordinates(item),
	};
}

/** Where an item sits in the ledger. Transactions and events must report their indexes. */
function itemCoordinates(item: GrpcItem | undefined) {
	const none = { checkpoint: null, transactionIndex: null, eventIndex: null };
	const missing = (field: string) =>
		new SuiStreamError('Protocol', `Ledger item is missing its ${field}`);
	switch (item?.$kind) {
		case undefined:
			return none;
		case 'Checkpoint': {
			const checkpoint = item.checkpoint.sequenceNumber;
			if (checkpoint === undefined) throw missing('sequence number');
			return { ...none, checkpoint };
		}
		case 'Transaction': {
			const { checkpoint, transactionIndex } = item.transaction;
			if (checkpoint === undefined) throw missing('checkpoint');
			if (transactionIndex === undefined) throw missing('transaction index');
			return { ...none, checkpoint, transactionIndex };
		}
		case 'Event': {
			const { checkpoint, transactionIndex, eventIndex } = item.event;
			if (checkpoint === undefined) throw missing('checkpoint');
			if (transactionIndex === undefined) throw missing('transaction index');
			if (eventIndex === undefined) throw missing('event index');
			return { checkpoint, transactionIndex, eventIndex };
		}
	}
}

type WithoutToken<Frame> = Frame extends unknown ? Omit<Frame, 'resumeToken'> : never;

/** The public frame for an item, without its token. */
export function mapGrpcItem(
	item: GrpcItem,
	include: SuiClientTypes.TransactionInclude | undefined,
): WithoutToken<ItemFrame> {
	switch (item.$kind) {
		case 'Checkpoint':
			return {
				$kind: 'Checkpoint',
				checkpoint: parseGrpcCheckpoint(item.checkpoint, 'Checkpoint stream'),
			};
		case 'Transaction':
			if (!item.transaction.digest || !item.transaction.effects?.status) {
				throw new SuiStreamError('Protocol', 'Transaction stream response is incomplete');
			}
			return {
				$kind: 'Transaction',
				transaction: parseGrpcTransactionResponse(item.transaction, { include }),
			};
		case 'Event':
			return { $kind: 'Event', event: parseGrpcEvent(item.event, 'Event stream') };
	}
}
