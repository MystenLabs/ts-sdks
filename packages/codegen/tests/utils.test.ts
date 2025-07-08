// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { normalizeMoveArguments } from './generated/utils';

const MOCK_TX = {
	object: {
		clock: () => 'CLOCK',
	},
};

const CLOCK_TYPE_ARG =
	'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock';

describe('normalizeMoveArguments', () => {
	it('should handle resolved sui objects for `object` args', () => {
		const res = normalizeMoveArguments(
			{ arbitraryValue: 42 }, // args
			['u32', CLOCK_TYPE_ARG], // arg types
			['arbitraryValue', 'clock'], // parameters' names
		);

		// Clock should be resolved under the hood - shouldn't throw
		// the "Parameter clock is required" error.
		expect((res[1] as any)(MOCK_TX)).toEqual('CLOCK');
	});

	it('should handle resolved sui objects for `Array` args', () => {
		const res = normalizeMoveArguments(
			[42], // args
			['u32', CLOCK_TYPE_ARG], // arg types
			['arbitraryValue', 'clock'], // parameters' names
		);
		expect((res[1] as any)(MOCK_TX)).toEqual('CLOCK');
	});

	it('should handle resolved sui objects for `Array` args with extra trailing args', () => {
		const res = normalizeMoveArguments(
			[42, 999], // args
			['u32', CLOCK_TYPE_ARG, 'u32'], // arg types
			['arbitraryValue', 'clock', 'anotherArbitraryValue'], // parameters' names
		);
		expect((res[1] as any)(MOCK_TX)).toEqual('CLOCK');
	});
});
