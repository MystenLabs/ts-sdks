// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expectTypeOf, it } from 'vitest';

import type { CoreClient } from '../../../../src/client/core.js';
import type { SuiClientTypes as T } from '../../../../src/client/types.js';
import type { SuiGrpcClient } from '../../../../src/grpc/client.js';

describe('stream types', () => {
	it('yields only items by default', () => {
		expectTypeOf<T.StreamCheckpointFrame>().toEqualTypeOf<T.StreamCheckpoint>();
		expectTypeOf<T.StreamEventFrame>().toEqualTypeOf<T.StreamEvent>();
		expectTypeOf<T.StreamTransactionFrame>().toEqualTypeOf<T.StreamTransaction>();
		expectTypeOf<
			T.StreamEventFrame<{ completion: false; progress: false }>
		>().toEqualTypeOf<T.StreamEvent>();
	});

	it('adds control frames that may be enabled, including non-literal booleans', () => {
		expectTypeOf<T.StreamEventFrame<{ completion: true }>>().toEqualTypeOf<
			T.StreamEvent | T.StreamCompletionFrame
		>();
		expectTypeOf<T.StreamEventFrame<{ progress: boolean }>>().toEqualTypeOf<
			T.StreamEvent | T.StreamProgressFrame
		>();
		expectTypeOf<
			T.StreamTransactionFrame<{ effects: true }, { completion: true; progress: true }>
		>().toEqualTypeOf<
			T.StreamTransaction<{ effects: true }> | T.StreamCompletionFrame | T.StreamProgressFrame
		>();
	});

	it('adds control frames that any member of a union of frame options enables', () => {
		expectTypeOf<T.StreamEventFrame<{ completion: true } | { progress: true }>>().toEqualTypeOf<
			T.StreamEvent | T.StreamCompletionFrame | T.StreamProgressFrame
		>();
		expectTypeOf<T.StreamCheckpointFrame<{}, {} | { completion: true }>>().toEqualTypeOf<
			T.StreamCheckpoint | T.StreamCompletionFrame
		>();
		expectTypeOf<
			T.StreamEventFrame<{} | { completion: false } | { progress: false }>
		>().toEqualTypeOf<T.StreamEvent>();
	});

	it('keeps include for data fields only', () => {
		expectTypeOf<T.StreamTransactionsOptions<{ effects: true }>['include']>().toEqualTypeOf<
			{ effects: true } | undefined
		>();
		expectTypeOf<'pageSize'>().not.toExtend<keyof T.StreamOptions>();
		expectTypeOf<'maxBufferedItems'>().not.toExtend<keyof T.StreamOptions>();
	});

	it('adds checkpoint transactions only when they are included', () => {
		expectTypeOf<T.StreamCheckpoint['checkpoint']>().toEqualTypeOf<T.Checkpoint>();
		expectTypeOf<
			T.StreamCheckpoint<{ transactions: { effects: true } }>['checkpoint']['transactions']
		>().toEqualTypeOf<T.TransactionResult<{ effects: true }>[]>();
		expectTypeOf<T.StreamCheckpointFrame<{ transactions: {} }, { progress: true }>>().toEqualTypeOf<
			T.StreamCheckpoint<{ transactions: {} }> | T.StreamProgressFrame
		>();
	});

	it('streams events and transactions as the list methods type them', () => {
		expectTypeOf<T.StreamEvent['event']>().toEqualTypeOf<T.EventEntry>();
		expectTypeOf<T.StreamTransaction<{ effects: true }>['transaction']>().toEqualTypeOf<
			T.TransactionResult<{ effects: true }>
		>();
	});

	it('requires exactly one input bound without a discriminator', () => {
		expectTypeOf<{ checkpoint: string }>().toExtend<T.StreamStart>();
		expectTypeOf<{ resumeToken: string }>().toExtend<T.StreamStart>();
		expectTypeOf<{}>().not.toExtend<T.StreamStart>();
		expectTypeOf<{ checkpoint: string; resumeToken: string }>().not.toExtend<T.StreamStart>();
		expectTypeOf<{ resumeToken: string }>().not.toExtend<T.StreamEnd>();
	});

	it('types stream method results by include and frame options', () => {
		// Never called: only the types are checked.
		function check(client: CoreClient, grpc: SuiGrpcClient) {
			expectTypeOf(client.streamEvents()).toEqualTypeOf<AsyncGenerator<T.StreamEvent>>();
			expectTypeOf(
				client.streamTransactions({ include: { effects: true }, frames: { progress: true } }),
			).toEqualTypeOf<
				AsyncGenerator<T.StreamTransaction<{ effects: true }> | T.StreamProgressFrame>
			>();
			expectTypeOf(client.streamCheckpoints({ frames: { completion: true } })).toEqualTypeOf<
				AsyncGenerator<T.StreamCheckpoint | T.StreamCompletionFrame>
			>();
			expectTypeOf(
				client.streamCheckpoints({ include: { transactions: { effects: true } } }),
			).toEqualTypeOf<AsyncGenerator<T.StreamCheckpoint<{ transactions: { effects: true } }>>>();

			expectTypeOf(grpc.streamEvents()).toEqualTypeOf<AsyncGenerator<T.StreamEventFrame>>();
			const enabled = Math.random() > 0.5;
			const stream = grpc.streamEvents({ frames: { completion: enabled, progress: enabled } });
			type Frame = typeof stream extends AsyncGenerator<infer F> ? F : never;
			expectTypeOf<Frame['$kind']>().toEqualTypeOf<'Event' | 'Progress' | 'Complete'>();
			// @ts-expect-error Native and shared filters are exclusive.
			void grpc.streamEvents({ filter: { sender: '0x1' }, grpcFilter: { terms: [] } });
		}
		void check;
	});

	it('adds stream methods to CoreClient without requiring transports to implement them', () => {
		expectTypeOf<CoreClient>().toHaveProperty('streamCheckpoints');
		expectTypeOf<CoreClient>().toHaveProperty('streamTransactions');
		expectTypeOf<CoreClient>().toHaveProperty('streamEvents');
		// Not part of the abstract transport contract: CoreClient implements them over a hook.
		expectTypeOf<'streamCheckpoints'>().not.toExtend<keyof T.TransportMethods>();
		expectTypeOf<'streamTransactions'>().not.toExtend<keyof T.TransportMethods>();
		expectTypeOf<'streamEvents'>().not.toExtend<keyof T.TransportMethods>();
	});
});
