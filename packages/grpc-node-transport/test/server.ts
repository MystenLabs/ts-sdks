// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// An in-process grpc-js server for sui.rpc.v2.LedgerService that uses the SDK's protobuf-ts codecs.
// Request metadata steers it:
// - GetServiceInfo: `x-fail` fails with NOT_FOUND; `x-raw-message` sends that text as the raw
//   `grpc-message` trailer.
// - ListCheckpoints: streams `x-count` checkpoints (default: up to `endCheckpoint`, else 50) of
//   `x-payload` digest bytes, honouring write backpressure; `x-fail-at` fails at that sequence
//   number; `x-fail-internal` fails at once with INTERNAL and that text; `x-hang` never finishes.
//   A stream with `endCheckpoint` ends with a CHECKPOINT_BOUND frame.
//
// `startCompressedServer` is a bare HTTP/2 server, since grpc-js servers do not compress responses.
// It answers every call with one gzip-compressed message of `bytes` zero bytes and an OK status.

import { Metadata, Server, ServerCredentials, status } from '@grpc/grpc-js';
import type {
	sendUnaryData,
	ServerUnaryCall,
	ServerWritableStream,
	ServiceDefinition,
} from '@grpc/grpc-js';
import { GrpcTypes } from '@mysten/sui/grpc';
import { createServer } from 'node:http2';
import type { ServerHttp2Stream } from 'node:http2';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';

const {
	GetServiceInfoRequest,
	GetServiceInfoResponse,
	ListCheckpointsRequest,
	ListCheckpointsResponse,
	QueryEndReason,
} = GrpcTypes;

type Message<T> = { toBinary(value: T): Uint8Array; fromBinary(bytes: Uint8Array): T };

function codec<I extends object, O extends object>(
	path: string,
	responseStream: boolean,
	input: Message<I>,
	output: Message<O>,
) {
	return {
		path,
		requestStream: false,
		responseStream,
		requestSerialize: (value: I) => Buffer.from(input.toBinary(value)),
		requestDeserialize: (bytes: Buffer) => input.fromBinary(bytes),
		responseSerialize: (value: O) => Buffer.from(output.toBinary(value)),
		responseDeserialize: (bytes: Buffer) => output.fromBinary(bytes),
	};
}

const definition = {
	getServiceInfo: codec(
		'/sui.rpc.v2.LedgerService/GetServiceInfo',
		false,
		GetServiceInfoRequest,
		GetServiceInfoResponse,
	),
	listCheckpoints: codec(
		'/sui.rpc.v2.LedgerService/ListCheckpoints',
		true,
		ListCheckpointsRequest,
		ListCheckpointsResponse,
	),
} satisfies ServiceDefinition;

export interface ServerStats {
	written: number;
	cancelled: number;
	completed: number;
	metadata: Metadata | undefined;
}

function cursor(sequence: number): Uint8Array {
	return new TextEncoder().encode(`test/${sequence}`);
}

export async function startServer() {
	const stats: ServerStats = { written: 0, cancelled: 0, completed: 0, metadata: undefined };
	const server = new Server();

	server.addService(definition, {
		getServiceInfo(
			call: ServerUnaryCall<GrpcTypes.GetServiceInfoRequest, GrpcTypes.GetServiceInfoResponse>,
			callback: sendUnaryData<GrpcTypes.GetServiceInfoResponse>,
		) {
			stats.metadata = call.metadata;
			const raw = call.metadata.get('x-raw-message')[0];
			if (raw !== undefined) {
				// Later keys win over the `grpc-message` grpc-js writes, so this reaches the wire as is.
				const trailer = new Metadata();
				trailer.set('grpc-message', String(raw));
				callback({ code: status.INVALID_ARGUMENT, details: 'replaced', metadata: trailer });
				return;
			}
			if (call.metadata.get('x-fail').length) {
				callback({ code: status.NOT_FOUND, details: 'no such thing: 50% off, a/b?' });
				return;
			}
			const header = new Metadata();
			header.set('x-header', 'hello');
			call.sendMetadata(header);
			const trailer = new Metadata();
			trailer.set('x-trailer', 'bye');
			trailer.set('x-blob-bin', Buffer.from([1, 2, 3]));
			callback(
				null,
				GetServiceInfoResponse.create({ chainId: 'test-chain', chain: 'localtest' }),
				trailer,
			);
		},
		async listCheckpoints(
			call: ServerWritableStream<
				GrpcTypes.ListCheckpointsRequest,
				GrpcTypes.ListCheckpointsResponse
			>,
		) {
			stats.metadata = call.metadata;
			let cancelled = false;
			call.on('cancelled', () => {
				cancelled = true;
				stats.cancelled++;
			});
			const header = new Metadata();
			header.set('x-header', 'hello');
			call.sendMetadata(header);

			const value = (key: string) => {
				const entry = call.metadata.get(key)[0];
				return entry === undefined ? undefined : Number(entry);
			};
			const start = Number(call.request.startCheckpoint ?? 0n);
			const end =
				call.request.endCheckpoint !== undefined ? Number(call.request.endCheckpoint) : undefined;
			const count = value('x-count') ?? (end !== undefined ? end - start : 50);
			const failAt = value('x-fail-at');
			const internal = call.metadata.get('x-fail-internal')[0];
			if (internal !== undefined) {
				call.emit('error', { code: status.INTERNAL, details: String(internal) });
				return;
			}
			const digest = 'x'.repeat(value('x-payload') ?? 8);

			for (let i = start; i < start + count && !cancelled; i++) {
				if (i === failAt) {
					call.emit('error', { code: status.RESOURCE_EXHAUSTED, details: 'stop at 50%' });
					return;
				}
				const ok = call.write(
					ListCheckpointsResponse.create({
						checkpoint: {
							sequenceNumber: BigInt(i),
							digest,
							summary: { epoch: 1n, timestamp: { seconds: BigInt(i), nanos: 0 } },
						},
						watermark: { cursor: cursor(i), checkpoint: BigInt(i) },
					}),
				);
				stats.written++;
				if (!ok) {
					await new Promise<void>((resolve) => {
						const resume = () => {
							call.off('drain', resume);
							call.off('cancelled', resume);
							resolve();
						};
						call.on('drain', resume);
						call.on('cancelled', resume);
					});
				}
			}
			if (cancelled || call.metadata.get('x-hang').length) return;
			if (end !== undefined) {
				call.write(
					ListCheckpointsResponse.create({
						watermark: { cursor: cursor(end), checkpoint: BigInt(end - 1) },
						end: { reason: QueryEndReason.CHECKPOINT_BOUND },
					}),
				);
			}
			stats.completed++;
			call.end();
		},
	});

	const port = await new Promise<number>((resolve, reject) =>
		server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, bound) =>
			error ? reject(error) : resolve(bound),
		),
	);

	return {
		port,
		baseUrl: `http://127.0.0.1:${port}`,
		stats,
		reset() {
			Object.assign(stats, { written: 0, cancelled: 0, completed: 0, metadata: undefined });
		},
		stop: () => server.forceShutdown(),
	};
}

export async function startCompressedServer(bytes: number) {
	const stats = { requests: 0 };
	const message = gzipSync(new Uint8Array(bytes));
	const frame = Buffer.alloc(5 + message.length);
	frame.writeUInt8(1, 0);
	frame.writeUInt32BE(message.length, 1);
	message.copy(frame, 5);

	const server = createServer();
	server.on('stream', (stream: ServerHttp2Stream) => {
		stats.requests++;
		stream.resume();
		stream.on('end', () => {
			stream.respond(
				{ ':status': 200, 'content-type': 'application/grpc', 'grpc-encoding': 'gzip' },
				{ waitForTrailers: true },
			);
			stream.on('wantTrailers', () => stream.sendTrailers({ 'grpc-status': '0' }));
			stream.end(frame);
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;

	return {
		baseUrl: `http://127.0.0.1:${port}`,
		stats,
		stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
}

// `startResettingServer` answers each call with one message, then resets the HTTP/2 stream with
// `code` before any gRPC status, like a front end ending a long-lived stream.
export async function startResettingServer(code: number) {
	const message = ListCheckpointsResponse.toBinary(
		ListCheckpointsResponse.create({ checkpoint: { sequenceNumber: 1n } }),
	);
	const frame = Buffer.alloc(5 + message.length);
	frame.writeUInt8(0, 0);
	frame.writeUInt32BE(message.length, 1);
	Buffer.from(message).copy(frame, 5);

	const server = createServer();
	server.on('stream', (stream: ServerHttp2Stream) => {
		stream.resume();
		stream.on('error', () => {});
		stream.on('end', () => {
			stream.respond({ ':status': 200, 'content-type': 'application/grpc' });
			stream.write(frame, () => stream.close(code));
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;

	return {
		baseUrl: `http://127.0.0.1:${port}`,
		stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
}
