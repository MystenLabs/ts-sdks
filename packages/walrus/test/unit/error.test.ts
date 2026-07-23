// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { describe, expect, it } from 'vitest';

import { isStalePriceAbort } from '../../src/error.js';

function moveAbort(location?: SuiClientTypes.MoveLocation): SuiClientTypes.ExecutionError {
	return {
		$kind: 'MoveAbort',
		MoveAbort: { abortCode: '2', location },
		message: 'MoveAbort',
	} as SuiClientTypes.ExecutionError;
}

describe('isStalePriceAbort', () => {
	it('matches MoveAborts in 0x2::balance', () => {
		expect(isStalePriceAbort(moveAbort({ package: '0x2', module: 'balance' }))).toBe(true);
		expect(
			isStalePriceAbort(
				moveAbort({
					package: '0x0000000000000000000000000000000000000000000000000000000000000002',
					module: 'balance',
				}),
			),
		).toBe(true);
		// Package may be omitted by some transports.
		expect(isStalePriceAbort(moveAbort({ module: 'balance' }))).toBe(true);
	});

	it('does not match unrelated errors', () => {
		expect(isStalePriceAbort(null)).toBe(false);
		expect(isStalePriceAbort(undefined)).toBe(false);
		expect(isStalePriceAbort(moveAbort(undefined))).toBe(false);
		expect(isStalePriceAbort(moveAbort({ package: '0x2', module: 'coin' }))).toBe(false);
		// A `balance` module in a third-party package is not the sui framework's.
		expect(isStalePriceAbort(moveAbort({ package: '0xabc123', module: 'balance' }))).toBe(false);
		expect(
			isStalePriceAbort({
				$kind: 'Unknown',
				Unknown: null,
				message: 'unknown',
			} as SuiClientTypes.ExecutionError),
		).toBe(false);
	});
});
