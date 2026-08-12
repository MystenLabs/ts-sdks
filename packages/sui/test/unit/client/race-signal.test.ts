// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { raceSignal } from '../../../src/client/mvr.js';

describe('raceSignal', () => {
	it('rejects when the signal aborts while the promise is pending', async () => {
		const controller = new AbortController();
		const pending = new Promise<string>(() => {});

		const raced = raceSignal(pending, controller.signal);
		controller.abort(new Error('cancelled'));

		await expect(raced).rejects.toThrow('cancelled');
	});

	it('rejects when the signal was already aborted before the call', async () => {
		const controller = new AbortController();
		controller.abort(new Error('cancelled'));

		// An `abort` event is not replayed for listeners added afterwards, so a signal that had
		// already fired used to resolve with the underlying value instead of rejecting.
		await expect(raceSignal(Promise.resolve('value'), controller.signal)).rejects.toThrow(
			'cancelled',
		);
	});

	it('resolves normally without a signal', async () => {
		await expect(raceSignal(Promise.resolve('value'))).resolves.toBe('value');
	});
});
