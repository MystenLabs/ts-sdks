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

	it('keeps a constant number of abort listeners across many frames', async () => {
		let added = 0;
		let removed = 0;
		const frames = 1000;
		const stream = abortableAsyncGenerator((signal) => {
			const add = signal.addEventListener.bind(signal);
			const remove = signal.removeEventListener.bind(signal);
			signal.addEventListener = ((...args: Parameters<typeof add>) => {
				added++;
				return add(...args);
			}) as typeof signal.addEventListener;
			signal.removeEventListener = ((...args: Parameters<typeof remove>) => {
				removed++;
				return remove(...args);
			}) as typeof signal.removeEventListener;
			return (async function* () {
				for (let i = 0; i < frames; i++) yield i;
			})();
		});
		let count = 0;
		for await (const _ of stream) {
			count++;
			expect(added - removed).toBeLessThanOrEqual(1);
		}
		expect(count).toBe(frames);
		expect(added).toBeGreaterThanOrEqual(frames);
		expect(added - removed).toBe(0);
	});

	it('removes the parent listener when run throws synchronously', async () => {
		const parent = new AbortController();
		const listen = vi.spyOn(parent.signal, 'addEventListener');
		const remove = vi.spyOn(parent.signal, 'removeEventListener');
		const stream = abortableAsyncGenerator(() => {
			throw new Error('invalid options');
		}, parent.signal);
		await expect(stream.next()).rejects.toThrow('invalid options');
		expect(remove).toHaveBeenCalledWith('abort', listen.mock.calls[0][1]);
	});

	it('throw() ends a next() pending on a step that never settles and rejects with its error', async () => {
		let child: AbortSignal | undefined;
		const stream = abortableAsyncGenerator(async function* (signal) {
			child = signal;
			await new Promise(() => {});
			yield 1;
		});
		const pending = stream.next();
		await new Promise((resolve) => setTimeout(resolve, 0));
		const error = new Error('consumer failed');
		await expect(stream.throw(error)).rejects.toBe(error);
		await expect(pending).resolves.toEqual({ value: undefined, done: true });
		expect(child?.aborted).toBe(true);
	});

	it('throw() at a yield aborts the signal and rejects with its error', async () => {
		let child: AbortSignal | undefined;
		const stream = abortableAsyncGenerator(async function* (signal) {
			child = signal;
			yield 1;
			yield 2;
		});
		expect(await stream.next()).toEqual({ done: false, value: 1 });
		const error = new Error('consumer failed');
		await expect(stream.throw(error)).rejects.toBe(error);
		expect(child?.aborted).toBe(true);
		expect(await stream.next()).toEqual({ done: true, value: undefined });
	});

	it('surfaces the abort reason over a throwing run when already aborted', async () => {
		const parent = new AbortController();
		const reason = new Error('aborted');
		parent.abort(reason);
		const run = vi.fn(() => {
			throw new Error('invalid options');
		});
		const stream = abortableAsyncGenerator(run, parent.signal);
		await expect(stream.next()).rejects.toBe(reason);
		expect(run).not.toHaveBeenCalled();
	});
});
