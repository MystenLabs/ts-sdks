// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createSecureServer } from 'node:http2';
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { MethodInfo } from '@protobuf-ts/runtime-rpc';
import { Agent, fetch as undiciFetch } from 'undici';
import { afterAll, describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport } from '../../../src/grpc/index.js';
import {
	SubscribeCheckpointsResponse,
	SubscriptionService,
} from '../../../src/grpc/proto/sui/rpc/v2/subscription_service.js';
import type { SubscribeCheckpointsRequest } from '../../../src/grpc/proto/sui/rpc/v2/subscription_service.js';

// Real sockets: a local server writes gRPC-web frames as fast as the connection accepts them, so
// the bytes it has flushed show whether a paused consumer stops the transfer.

const MESSAGES = 1500;
const PADDING = 'x'.repeat(64 * 1024);
const method = SubscriptionService.methods[0] as MethodInfo<
	SubscribeCheckpointsRequest,
	SubscribeCheckpointsResponse
>;

function frame(type: number, payload: Uint8Array) {
	const out = new Uint8Array(5 + payload.length);
	out[0] = type;
	new DataView(out.buffer).setUint32(1, payload.length);
	out.set(payload, 5);
	return out;
}

const message = (i: number) =>
	frame(
		0,
		SubscribeCheckpointsResponse.toBinary(
			SubscribeCheckpointsResponse.create({
				cursor: BigInt(i),
				checkpoint: { sequenceNumber: BigInt(i), digest: PADDING },
			}),
		),
	);
const trailer = frame(0x80, new TextEncoder().encode('grpc-status:0\r\n'));
const TOTAL_BYTES = message(0).length * MESSAGES;

interface Stats {
	flushed: number;
	finished: boolean;
	closed: boolean;
}

function handler(stats: Stats) {
	return async (
		req: IncomingMessage | Http2ServerRequest,
		response: ServerResponse | Http2ServerResponse,
	) => {
		// The HTTP/1.1 and compatibility HTTP/2 responses share the methods used here.
		const res = response as ServerResponse;
		// HTTP/2 reports a reset stream as `aborted` before `close`, which waits for pending writes.
		req.on('aborted', () => (stats.closed = true));
		res.on('close', () => (stats.closed = true));
		res.writeHead(200, { 'content-type': 'application/grpc-web+proto' });
		for (let i = 0; i < MESSAGES && !stats.closed; i++) {
			const bytes = message(i);
			// Counted once the connection accepted the bytes, not when queued in the response.
			const accepted = new Promise<void>((resolve) =>
				res.write(bytes, () => {
					stats.flushed += bytes.length;
					resolve();
				}),
			);
			await accepted;
		}
		if (stats.closed) return;
		res.end(trailer);
		stats.finished = true;
	};
}

interface Target {
	url: string;
	fetch: typeof globalThis.fetch;
	stats: Stats;
	close(): Promise<void>;
}

async function http1(): Promise<Target> {
	const stats: Stats = { flushed: 0, finished: false, closed: false };
	const server = createServer(handler(stats));
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return {
		url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
		fetch: globalThis.fetch,
		stats,
		close: () =>
			new Promise((resolve) => {
				server.closeAllConnections();
				server.close(() => resolve());
			}),
	};
}

let certDir: string | undefined;
function certificate() {
	certDir ??= mkdtempSync(join(tmpdir(), 'sui-grpc-pull-'));
	const key = join(certDir, 'key.pem');
	const cert = join(certDir, 'cert.pem');
	execFileSync(
		'openssl',
		[
			'req',
			'-x509',
			'-newkey',
			'ec',
			'-pkeyopt',
			'ec_paramgen_curve:prime256v1',
			'-nodes',
			'-keyout',
			key,
			'-out',
			cert,
			'-days',
			'1',
			'-subj',
			'/CN=localhost',
		],
		{ stdio: 'ignore' },
	);
	return { key: readFileSync(key), cert: readFileSync(cert) };
}

function hasOpenssl() {
	try {
		execFileSync('openssl', ['version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

async function http2(): Promise<Target> {
	const stats: Stats = { flushed: 0, finished: false, closed: false };
	const server = createSecureServer(certificate(), handler(stats));
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const dispatcher = new Agent({ allowH2: true, connect: { rejectUnauthorized: false } });
	return {
		url: `https://127.0.0.1:${(server.address() as AddressInfo).port}`,
		fetch: ((input: string, init: RequestInit) =>
			undiciFetch(input, { ...(init as object), dispatcher })) as unknown as typeof fetch,
		stats,
		close: async () => {
			await dispatcher.destroy();
			await new Promise<void>((resolve) => server.close(() => resolve()));
		},
	};
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(condition: () => boolean, ms = 5000) {
	const deadline = Date.now() + ms;
	while (!condition()) {
		if (Date.now() > deadline) throw new Error('timed out');
		await wait(10);
	}
}

function open(target: Target) {
	const transport = new GrpcWebFetchTransport({
		baseUrl: target.url,
		format: 'binary',
		fetch: target.fetch,
	});
	return transport.serverStreamingIterable(method, {}, transport.mergeOptions({}));
}

afterAll(() => {
	if (certDir) rmSync(certDir, { recursive: true, force: true });
});

describe.each([
	['HTTP/1.1, Node fetch', http1, true],
	['HTTP/2, undici fetch', http2, hasOpenssl()],
] as const)('%s', (_name, start, enabled) => {
	it.skipIf(!enabled)(
		'stalls the server while the consumer pauses and resumes exactly once',
		async () => {
			const target = await start();
			try {
				const call = open(target);
				const iterator = call.responses;
				const seen: bigint[] = [];
				for (let i = 0; i < 10; i++) seen.push((await iterator.next()).value!.cursor!);

				await wait(200);
				const early = target.stats.flushed;
				await wait(800);
				const plateau = target.stats.flushed;
				if (process.env.SUI_PULL_SOCKET_REPORT) {
					console.info(`${_name}: ${early} -> ${plateau} bytes flushed during a 1 s pause`);
				}

				// The server stopped once the connection's buffers and flow-control window filled.
				expect(plateau).toBe(early);
				expect(plateau).toBeLessThan(TOTAL_BYTES / 2);
				expect(target.stats.finished).toBe(false);

				for await (const response of iterator) seen.push(response.cursor!);
				expect(seen).toEqual(Array.from({ length: MESSAGES }, (_, i) => BigInt(i)));
				await expect(call.status).resolves.toMatchObject({ code: 'OK' });
				expect(target.stats.finished).toBe(true);
			} finally {
				await target.close();
			}
		},
		20_000,
	);

	it.skipIf(!enabled)(
		'closes the request when the consumer breaks',
		async () => {
			const target = await start();
			try {
				const call = open(target);
				let count = 0;
				for await (const _ of call.responses) if (++count === 3) break;
				await until(() => target.stats.closed, 1000);
				expect(target.stats.finished).toBe(false);
				await expect(call.status).rejects.toMatchObject({ code: 'CANCELLED' });
			} finally {
				await target.close();
			}
		},
		20_000,
	);
});
