// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcStatusCode, readGrpcWebResponseHeader } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport as UpstreamGrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type {
	MethodInfo,
	RpcOptions,
	RpcTransport,
	ServerStreamingCall,
	UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';

import {
	CLIENT_PROTOCOL_VERSION_HEADER,
	MAX_PROTOCOL_VERSION,
} from '../client/protocol-version.js';
import { markHttpStatus, toNetworkRpcError } from './network-error.js';

// A failed call rejects four promises with the same error, so it is only decoded once. Registered
// globally so another installed copy of this package sees the same marker.
const MESSAGE_DECODED = Symbol.for('@mysten/sui/grpc/decoded-status-message');

// `grpc-message` is percent-encoded on the wire and the upstream transport does not decode it:
// https://github.com/timostamm/protobuf-ts/pull/739
function decodeGrpcStatusMessage(message: string): string {
	if (!message.includes('%')) return message;

	try {
		return decodeURIComponent(message);
	} catch {
		return message;
	}
}

function markStatusMessageRead(error: RpcError): boolean {
	if (MESSAGE_DECODED in error) return false;
	Object.defineProperty(error, MESSAGE_DECODED, { value: true, configurable: true });

	return true;
}

function decodeStatusMessageOnce(error: RpcError): void {
	if (markStatusMessageRead(error)) error.message = decodeGrpcStatusMessage(error.message);
}

/** Whether this package's transport decoded the error's status text. */
export function hasDecodedStatusMessage(error: object): boolean {
	return MESSAGE_DECODED in error;
}

// An abort reason is arbitrary, and reading a property on it runs code the caller wrote. A read
// that throws counts as absent, so one bad accessor does not decide the status.
function readProperty(value: unknown, key: 'code' | 'name' | 'message'): unknown {
	if (typeof value !== 'object' || value === null) return undefined;

	try {
		return (value as Record<string, unknown>)[key];
	} catch {
		return undefined;
	}
}

// The reason is read by shape, since another copy of runtime-rpc or another realm fails
// `instanceof`. `AbortSignal.timeout` aborts with a `TimeoutError`.
function abortStatus(reason: unknown): string {
	const code = readProperty(reason, 'code');

	// A status name maps to a number; `in` would also match the enum's reverse mapping.
	if (
		typeof code === 'string' &&
		typeof GrpcStatusCode[code as keyof typeof GrpcStatusCode] === 'number'
	) {
		return code;
	}

	return readProperty(reason, 'name') === 'TimeoutError'
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
}

// The transport reuses the abort reason's message, so matching it says the text is local. A fetch
// that substitutes its own error (node-fetch) gives text of its own, which holds nothing to decode.
// The reason is never coerced: a symbol or a throwing hook would throw here.
function isAbortReasonText(message: string, reason: unknown): boolean {
	if (typeof reason === 'string') return message === reason;

	const reasonMessage = readProperty(reason, 'message');

	return typeof reasonMessage === 'string' && message === reasonMessage;
}

// Rewritten in place, so every promise a call rejects surfaces the same error. Only the two codes
// upstream uses for an abort are re-coded; a failure that raced the abort is relabelled with it.
function normalizeGrpcError(error: unknown, signal: AbortSignal | undefined): void {
	try {
		normalize(error, signal);
	} catch {
		// Never an unhandled rejection from a discarded handler: the call reports what it was going
		// to report.
	}
}

function normalize(error: unknown, signal: AbortSignal | undefined): void {
	if (!(error instanceof RpcError)) return;

	if (
		signal?.aborted &&
		(error.code === GrpcStatusCode[GrpcStatusCode.INTERNAL] ||
			error.code === GrpcStatusCode[GrpcStatusCode.CANCELLED])
	) {
		error.code = abortStatus(signal.reason);

		// Text the abort reason supplied is local and holds nothing to decode; anything else came off
		// the wire, even though the abort is what the caller sees. Settled here for the other promises
		// the call rejects, which no longer match the codes above.
		if (isAbortReasonText(error.message, signal.reason)) markStatusMessageRead(error);
		else decodeStatusMessageOnce(error);

		return;
	}

	decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], signal: AbortSignal | undefined) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, signal));
	}
}

// Upstream erases fetch and body-read failures into INTERNAL. Wrap the fetch so those failures
// surface as UNAVAILABLE (see `toNetworkRpcError`).
function networkFetch(fetch: typeof globalThis.fetch): typeof globalThis.fetch {
	return async (input, init) => {
		let response: Response;
		try {
			response = await fetch(input, init);
		} catch (error) {
			throw toNetworkRpcError(error, init?.signal, 'request');
		}
		if (!response.ok) {
			// Code it as upstream would, but keep the HTTP status: a proxy's 502 and 408 both map to
			// UNKNOWN.
			const [code, detail, meta] = readGrpcWebResponseHeader(response);
			if (code !== undefined && code !== GrpcStatusCode.OK) {
				const name = GrpcStatusCode[code];
				throw markHttpStatus(new RpcError(detail ?? name, name, meta), response.status);
			}
		}
		const chunks = bodyChunks(response.body);
		if (!chunks) return response;
		const signal = init?.signal;
		// Upstream reads only this metadata and iterates the body, so this shape avoids needing a
		// global `Response` or `ReadableStream`, which some runtimes lack. The getters stay lazy
		// because Cloudflare Workers throw on `type`, which upstream catches.
		return {
			get ok() {
				return response.ok;
			},
			get status() {
				return response.status;
			},
			get statusText() {
				return response.statusText;
			},
			get headers() {
				return response.headers;
			},
			get type() {
				return response.type;
			},
			body: { [Symbol.asyncIterator]: () => networkBody(chunks, signal) },
		} as unknown as Response;
	};
}

async function* networkBody(
	chunks: BodyChunks,
	signal: AbortSignal | null | undefined,
): AsyncGenerator<Uint8Array> {
	while (true) {
		let next: IteratorResult<Uint8Array>;
		try {
			next = await chunks.next();
		} catch (error) {
			throw toNetworkRpcError(error, signal, 'response');
		}
		if (next.done) return;
		yield next.value;
	}
}

interface BodyChunks {
	next(): Promise<IteratorResult<Uint8Array>>;
}

// A WHATWG stream is read through `getReader()`. A custom fetch such as `node-fetch` returns a
// Node.js stream, which upstream reads through async iteration; that path is kept here.
function bodyChunks(body: unknown): BodyChunks | null {
	if (!body || typeof body !== 'object') return null;

	if (typeof (body as ReadableStream<Uint8Array>).getReader === 'function') {
		const reader = (body as ReadableStream<Uint8Array>).getReader();
		return { next: () => reader.read() };
	}

	if (typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function') {
		return (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator]();
	}

	return null;
}

/**
 * `GrpcWebFetchTransport` from `@protobuf-ts/grpcweb-transport`, subclassed to decode status
 * messages, to code an aborted call from its reason rather than as `INTERNAL`, to send the
 * `x-sui-client-protocol-version` header, and to default to the binary wire format.
 *
 * `SuiGrpcClient` builds one by default. A transport imported from `@protobuf-ts/grpcweb-transport`
 * keeps that package's behaviour.
 */
export class GrpcWebFetchTransport extends UpstreamGrpcWebFetchTransport {
	constructor(options: GrpcWebOptions) {
		// Lets the server avoid sending types this SDK cannot decode. Caller-supplied `meta` wins.
		super({
			...options,
			// `??` rather than a spread default, so an explicit `format: undefined` still gets binary.
			format: options.format ?? 'binary',
			meta: {
				[CLIENT_PROTOCOL_VERSION_HEADER]: String(MAX_PROTOCOL_VERSION),
				...options.meta,
			},
		});
	}

	override unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): UnaryCall<I, O> {
		const call = super.unary(method, input, {
			...options,
			fetch: networkFetch((options as GrpcWebOptions).fetch ?? globalThis.fetch),
		} as GrpcWebOptions);

		normalizeRejections([call.headers, call.response, call.status, call.trailers], options.abort);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		const call = super.serverStreaming(method, input, {
			...options,
			fetch: networkFetch((options as GrpcWebOptions).fetch ?? globalThis.fetch),
		} as GrpcWebOptions);

		// A finite stream is often read through `responses` without awaiting `status`.
		call.responses.onError((error) => normalizeGrpcError(error, options.abort));
		normalizeRejections([call.headers, call.status, call.trailers], options.abort);

		return call;
	}
}

/** Adds SDK metadata without mutating the caller's transport or its default options. */
export function withClientProtocolVersion(transport: RpcTransport): RpcTransport {
	return {
		mergeOptions(options) {
			const merged = transport.mergeOptions(options);
			return {
				...merged,
				meta: {
					[CLIENT_PROTOCOL_VERSION_HEADER]: String(MAX_PROTOCOL_VERSION),
					...merged.meta,
				},
			};
		},
		unary: transport.unary.bind(transport),
		serverStreaming: transport.serverStreaming.bind(transport),
		clientStreaming: transport.clientStreaming.bind(transport),
		duplex: transport.duplex.bind(transport),
	};
}
