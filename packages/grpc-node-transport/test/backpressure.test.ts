// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { PULL_SERVER_STREAMING } from '@mysten/sui/grpc/pull-transport';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { GrpcNodeTransport } from '../src/index.js';
import { startServer } from './server.js';

const COUNT = 1000;
const PAYLOAD = 64 * 1024;

const server = await startServer();

afterEach(() => server.reset());
afterAll(() => server.stop());

// The messages are small, so a default-sized window would admit the whole stream.
const WINDOW = { 'grpc-node.flow_control_window': 65_535 };

// Waits until the server has written nothing new for `quietMs`, and returns its count then.
async function writtenOnceStopped(quietMs = 300, timeoutMs = 10_000): Promise<number> {
	const deadline = Date.now() + timeoutMs;
	let written = server.stats.written;
	let since = Date.now();
	while (Date.now() < deadline) {
		await sleep(20);
		if (server.stats.written !== written) {
			written = server.stats.written;
			since = Date.now();
		} else if (Date.now() - since >= quietMs) {
			return written;
		}
	}
	throw new Error(`the server was still writing after ${timeoutMs} ms`);
}

async function pausedRead(prefetch?: number) {
	const transport = new GrpcNodeTransport({
		baseUrl: server.baseUrl,
		prefetch,
		clientOptions: WINDOW,
	});
	const client = new SuiGrpcClient({ network: 'localnet', transport });
	const method = client.ledgerService.methods.find((m) => m.name === 'ListCheckpoints')!;

	try {
		const call = transport[PULL_SERVER_STREAMING](
			method,
			{},
			{ meta: { 'x-count': String(COUNT), 'x-payload': String(PAYLOAD) } },
		);
		const sequence: bigint[] = [];
		const first = await call.responses.next();
		sequence.push(first.value!.checkpoint!.sequenceNumber!);

		// Flow control stops the server while the consumer pauses.
		const written = await writtenOnceStopped();

		for await (const message of call.responses) {
			sequence.push(message.checkpoint!.sequenceNumber!);
		}
		await call.status;

		return { written, sequence };
	} finally {
		transport.close();
	}
}

describe('backpressure', () => {
	it('stops the server while the consumer pauses, then resumes in order', async () => {
		const { written, sequence } = await pausedRead();

		expect(written).toBeLessThan(64);
		expect(sequence).toEqual(Array.from({ length: COUNT }, (_, i) => BigInt(i)));
		expect(server.stats.completed).toBe(1);
	});

	it('bounds read-ahead further with a smaller prefetch', async () => {
		const defaults = await pausedRead();
		server.reset();
		const single = await pausedRead(1);

		expect(single.written).toBeLessThan(defaults.written);
		expect(single.sequence).toEqual(Array.from({ length: COUNT }, (_, i) => BigInt(i)));
	});

	it('bounds read-ahead before the first pull', async () => {
		const transport = new GrpcNodeTransport({
			baseUrl: server.baseUrl,
			prefetch: 1,
			clientOptions: WINDOW,
		});
		const client = new SuiGrpcClient({ network: 'localnet', transport });
		const method = client.ledgerService.methods.find((m) => m.name === 'ListCheckpoints')!;

		try {
			const call = transport[PULL_SERVER_STREAMING](
				method,
				{},
				{ meta: { 'x-count': String(COUNT), 'x-payload': String(PAYLOAD) } },
			);
			await call.headers;

			expect(await writtenOnceStopped()).toBeLessThan(64);

			let count = 0;
			for await (const _ of call.responses) count++;
			expect(count).toBe(COUNT);
		} finally {
			transport.close();
		}
	});
});
