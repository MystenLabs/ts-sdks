// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expectTypeOf, it } from 'vitest';

import type { SuiClientTypes } from '../../../src/client/types.js';

it('keeps shared default results item-only and accounts for optional completion', () => {
	expectTypeOf<SuiClientTypes.StreamCheckpointResult>().toEqualTypeOf<SuiClientTypes.StreamCheckpointFrame>();
	expectTypeOf<SuiClientTypes.StreamEventResult>().toEqualTypeOf<SuiClientTypes.StreamEventFrame>();
	expectTypeOf<SuiClientTypes.StreamTransactionResult>().toEqualTypeOf<SuiClientTypes.StreamTransactionFrame>();
	expectTypeOf<
		SuiClientTypes.StreamEventResult<{ completion: false }>
	>().toEqualTypeOf<SuiClientTypes.StreamEventFrame>();
	expectTypeOf<SuiClientTypes.StreamEventResult<{ completion: true }>>().toEqualTypeOf<
		SuiClientTypes.StreamEventFrame | SuiClientTypes.StreamCompletionFrame
	>();
	expectTypeOf<SuiClientTypes.StreamEventResult<{ completion: boolean }>>().toEqualTypeOf<
		SuiClientTypes.StreamEventFrame | SuiClientTypes.StreamCompletionFrame
	>();
	expectTypeOf<
		SuiClientTypes.StreamTransactionResult<{ effects: true; completion: boolean }>
	>().toEqualTypeOf<
		| SuiClientTypes.StreamTransactionFrame<{ effects: true; completion: boolean }>
		| SuiClientTypes.StreamCompletionFrame
	>();
});

it('requires exactly one input bound without requiring a discriminator', () => {
	expectTypeOf<{ checkpoint: string }>().toExtend<SuiClientTypes.StreamStart>();
	expectTypeOf<{ resumeToken: string }>().toExtend<SuiClientTypes.StreamStart>();
	expectTypeOf<{}>().not.toExtend<SuiClientTypes.StreamStart>();
	expectTypeOf<{
		checkpoint: string;
		resumeToken: string;
	}>().not.toExtend<SuiClientTypes.StreamStart>();
	expectTypeOf<SuiClientTypes.StreamStart>().toEqualTypeOf<SuiClientTypes.StreamEnd>();
});

it('does not add methods to the required Core contract', () => {
	expectTypeOf<'streamCheckpoints'>().not.toExtend<keyof SuiClientTypes.TransportMethods>();
	expectTypeOf<'streamTransactions'>().not.toExtend<keyof SuiClientTypes.TransportMethods>();
	expectTypeOf<'streamEvents'>().not.toExtend<keyof SuiClientTypes.TransportMethods>();
});
