// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expectTypeOf, it } from 'vitest';

import type { CoreClient } from '../../../../src/client/core.js';
import type { SuiClientTypes as T } from '../../../../src/client/types.js';

describe('stream types', () => {
	it('yields only items by default', () => {
		expectTypeOf<T.StreamCheckpointResult>().toEqualTypeOf<T.StreamCheckpointFrame>();
		expectTypeOf<T.StreamEventResult>().toEqualTypeOf<T.StreamEventFrame>();
		expectTypeOf<T.StreamTransactionResult>().toEqualTypeOf<T.StreamTransactionFrame>();
		expectTypeOf<
			T.StreamEventResult<{ completion: false; progress: false }>
		>().toEqualTypeOf<T.StreamEventFrame>();
	});

	it('adds control frames that may be enabled, including non-literal booleans', () => {
		expectTypeOf<T.StreamEventResult<{ completion: true }>>().toEqualTypeOf<
			T.StreamEventFrame | T.StreamCompletionFrame
		>();
		expectTypeOf<T.StreamEventResult<{ progress: boolean }>>().toEqualTypeOf<
			T.StreamEventFrame | T.StreamProgressFrame
		>();
		expectTypeOf<
			T.StreamTransactionResult<{ effects: true }, { completion: true; progress: true }>
		>().toEqualTypeOf<
			T.StreamTransactionFrame<{ effects: true }> | T.StreamCompletionFrame | T.StreamProgressFrame
		>();
	});

	it('adds control frames that any member of a union of frame options enables', () => {
		expectTypeOf<T.StreamEventResult<{ completion: true } | { progress: true }>>().toEqualTypeOf<
			T.StreamEventFrame | T.StreamCompletionFrame | T.StreamProgressFrame
		>();
		expectTypeOf<T.StreamCheckpointResult<{}, {} | { completion: true }>>().toEqualTypeOf<
			T.StreamCheckpointFrame | T.StreamCompletionFrame
		>();
		expectTypeOf<
			T.StreamEventResult<{} | { completion: false } | { progress: false }>
		>().toEqualTypeOf<T.StreamEventFrame>();
	});

	it('keeps include for data fields only', () => {
		expectTypeOf<T.StreamTransactionsOptions<{ effects: true }>['include']>().toEqualTypeOf<
			{ effects: true } | undefined
		>();
		expectTypeOf<'pageSize'>().not.toExtend<keyof T.StreamOptions>();
		expectTypeOf<'maxBufferedItems'>().not.toExtend<keyof T.StreamOptions>();
	});

	it('adds checkpoint transactions only when they are included', () => {
		expectTypeOf<T.StreamCheckpointFrame['checkpoint']>().toEqualTypeOf<T.Checkpoint>();
		expectTypeOf<
			T.StreamCheckpointFrame<{ transactions: { effects: true } }>['checkpoint']['transactions']
		>().toEqualTypeOf<T.TransactionResult<{ effects: true }>[]>();
		expectTypeOf<
			T.StreamCheckpointResult<{ transactions: {} }, { progress: true }>
		>().toEqualTypeOf<T.StreamCheckpointFrame<{ transactions: {} }> | T.StreamProgressFrame>();
	});

	it('requires exactly one input bound without a discriminator', () => {
		expectTypeOf<{ checkpoint: string }>().toExtend<T.StreamStart>();
		expectTypeOf<{ resumeToken: string }>().toExtend<T.StreamStart>();
		expectTypeOf<{}>().not.toExtend<T.StreamStart>();
		expectTypeOf<{ checkpoint: string; resumeToken: string }>().not.toExtend<T.StreamStart>();
		expectTypeOf<T.StreamStart>().toEqualTypeOf<T.StreamEnd>();
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
