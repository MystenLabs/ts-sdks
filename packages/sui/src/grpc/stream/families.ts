// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MethodInfo, ServiceType } from '@protobuf-ts/runtime-rpc';

import type { ItemFrame, StreamFamily, StreamPosition } from '../../client/stream/index.js';
import { boundaryPosition, itemPosition, SuiStreamError } from '../../client/stream/index.js';
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
	readonly list: MethodInfo<ListRequest, ListFrame>;
	readonly subscribe: MethodInfo<SubscribeRequest, LiveFrame>;
	readMask(include: SuiClientTypes.TransactionInclude | undefined): string[];
	item(frame: ListFrame | LiveFrame): GrpcItem | undefined;
	/** The position of a List item, or of any subscription frame. */
	position(
		frame: { watermark?: Watermark; cursor?: bigint },
		item: GrpcItem | undefined,
	): StreamPosition;
}

export const GRPC_FAMILIES: Record<StreamFamily, GrpcFamily> = {
	checkpoints: {
		list: streamingMethod(LedgerService, 'ListCheckpoints'),
		subscribe: streamingMethod(SubscriptionService, 'SubscribeCheckpoints'),
		// With included transactions, the checkpoint frame carries every one of them.
		readMask: (include) =>
			include
				? [...CHECKPOINT_READ_MASK_PATHS, ...transactionReadMaskPaths(include, 'transactions.')]
				: CHECKPOINT_READ_MASK_PATHS,
		item: (frame) => frame.checkpoint && { $kind: 'Checkpoint', checkpoint: frame.checkpoint },
		// A checkpoint is positioned by its sequence number alone; streams resume after it by number.
		position(frame, item) {
			if (item) return itemPosition(sequenceNumber(item));
			if (frame.cursor === undefined) {
				throw new SuiStreamError('Protocol', 'Checkpoint subscription frame is missing its cursor');
			}
			return boundaryPosition(frame.cursor + 1n);
		},
	},
	transactions: {
		list: streamingMethod(LedgerService, 'ListTransactions'),
		subscribe: streamingMethod(SubscriptionService, 'SubscribeTransactions'),
		// `transaction_index` orders transactions within a checkpoint.
		readMask: (include) => [...transactionReadMaskPaths(include), 'transaction_index'],
		item: (frame) => frame.transaction && { $kind: 'Transaction', transaction: frame.transaction },
		position: framePosition,
	},
	events: {
		list: streamingMethod(LedgerService, 'ListEvents'),
		subscribe: streamingMethod(SubscriptionService, 'SubscribeEvents'),
		readMask: () => [...EVENT_READ_MASK_PATHS, 'transaction_index'],
		item: (frame) => frame.event && { $kind: 'Event', event: frame.event },
		position: framePosition,
	},
};

/** A generated method by name; its messages share the fields `ListRequest` and friends name. */
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

/** The position a watermarked frame reports. */
export function framePosition(
	frame: { watermark?: Watermark },
	item: GrpcItem | undefined,
): StreamPosition {
	const position = watermarkPosition(frame.watermark);
	if (!item) return position;
	const { checkpoint, ...indexes } = itemCoordinates(item);
	return itemPosition(checkpoint, {
		...indexes,
		cursor: frame.watermark!.cursor!,
		nextUncovered: position.nextUncovered,
	});
}

/** The resume point a watermark reports, as the boundary at its `cursor_position`. */
export function watermarkPosition(watermark: Watermark | undefined): StreamPosition {
	if (!watermark?.cursor?.length) {
		throw new SuiStreamError('Protocol', 'Ledger response is missing its watermark cursor');
	}
	const at = watermark.cursorPosition;
	if (at?.checkpoint === undefined) {
		throw new SuiStreamError('Protocol', 'Ledger watermark is missing its cursor position');
	}
	return boundaryPosition(at.checkpoint, {
		cursor: watermark.cursor,
		// Unset indexes read as 0, as on the server.
		transactionIndex: at.transactionIndex ?? 0n,
		eventIndex: at.eventIndex ?? null,
		nextUncovered: watermark.checkpoint === undefined ? null : watermark.checkpoint + 1n,
	});
}

function sequenceNumber(item: GrpcItem): bigint {
	const checkpoint = item.$kind === 'Checkpoint' ? item.checkpoint.sequenceNumber : undefined;
	if (checkpoint === undefined) {
		throw new SuiStreamError('Protocol', 'Checkpoint is missing its sequence number');
	}
	return checkpoint;
}

/** Where an item sits in the ledger. Transactions and events must report their indexes. */
function itemCoordinates(item: GrpcItem) {
	const none = { transactionIndex: null, eventIndex: null };
	const missing = (field: string) =>
		new SuiStreamError('Protocol', `Ledger item is missing its ${field}`);
	switch (item.$kind) {
		case 'Checkpoint':
			throw new SuiStreamError('Protocol', 'A checkpoint is positioned by its sequence number');
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

function parseTransaction(
	transaction: ExecutedTransaction,
	include: SuiClientTypes.TransactionInclude | undefined,
	source: string,
) {
	if (!transaction.digest || !transaction.effects?.status) {
		throw new SuiStreamError('Protocol', `${source} response is incomplete`);
	}
	return parseGrpcTransactionResponse(transaction, { include });
}

type WithoutToken<Frame> = Frame extends unknown ? Omit<Frame, 'resumeToken'> : never;

/** The public frame for an item, without its token. */
export function mapGrpcItem(
	item: GrpcItem,
	include: SuiClientTypes.TransactionInclude | undefined,
): WithoutToken<ItemFrame> {
	switch (item.$kind) {
		case 'Checkpoint': {
			const checkpoint = parseGrpcCheckpoint(item.checkpoint, 'Checkpoint stream');
			if (!include) return { $kind: 'Checkpoint', checkpoint };
			const transactions = item.checkpoint.transactions.map((transaction) =>
				parseTransaction(transaction, include, 'Checkpoint stream'),
			);
			return { $kind: 'Checkpoint', checkpoint: { ...checkpoint, transactions } };
		}
		// Positioning the item already required its checkpoint.
		case 'Transaction':
			return {
				$kind: 'Transaction',
				transaction: parseTransaction(
					item.transaction,
					include,
					'Transaction stream',
				) as SuiClientTypes.StreamedTransactionResult,
			};
		case 'Event':
			return {
				$kind: 'Event',
				event: parseGrpcEvent(item.event, 'Event stream') as SuiClientTypes.EventEntry & {
					checkpoint: string;
				},
			};
	}
}
