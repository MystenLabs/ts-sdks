// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { abortableAsyncGenerator } from '../../../src/utils/abort.js';

describe('abortableAsyncGenerator', () => {
	it('does not start or attach listeners when returned before iteration', async () => {
		const parent = new AbortController();
		const listen = vi.spyOn(parent.signal, 'addEventListener');
		const run = vi.fn(async function* () {
			yield 1;
		});
		const stream = abortableAsyncGenerator(run, parent.signal);
		await stream.return(undefined);
		expect(run).not.toHaveBeenCalled();
		expect(listen).not.toHaveBeenCalled();
	});

	it('aborts and removes the parent listener on completion', async () => {
		const parent = new AbortController();
		const listen = vi.spyOn(parent.signal, 'addEventListener');
		const remove = vi.spyOn(parent.signal, 'removeEventListener');
		let child: AbortSignal | undefined;
		const stream = abortableAsyncGenerator(async function* (signal) {
			child = signal;
			yield 1;
		}, parent.signal);
		expect(await stream.next()).toEqual({ done: false, value: 1 });
		expect(await stream.next()).toEqual({ done: true, value: undefined });
		expect(child?.aborted).toBe(true);
		expect(parent.signal.aborted).toBe(false);
		expect(remove).toHaveBeenCalledWith('abort', listen.mock.calls[0][1]);
	});

	it('interrupts a pending next when throw is called and runs cleanup', async () => {
		const cleanup = vi.fn();
		const stream = abortableAsyncGenerator(async function* (signal) {
			try {
				await new Promise<void>((_, reject) => {
					signal.addEventListener('abort', () => reject(signal.reason), { once: true });
				});
				yield 1;
			} finally {
				cleanup();
			}
		});
		const error = new Error('stop');
		const next = expect(stream.next()).rejects.toBe(error);
		const thrown = expect(stream.throw(error)).rejects.toBe(error);
		await Promise.all([next, thrown]);
		expect(cleanup).toHaveBeenCalledOnce();
	});
});
