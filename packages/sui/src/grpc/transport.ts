// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
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
import { grpcWebServerStreamingIterable } from './grpc-web-pull.js';
import type { GrpcWebPullOptions } from './grpc-web-pull.js';
import { supportsServerStreamingIterable } from './pull.js';
import type { PullServerStreamingTransport, ServerStreamingIterableCall } from './pull.js';

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

/**
 * Marks `error.message` as already percent-decoded, so `normalizeGrpcError` leaves it unchanged.
 * Returns `false` when it was already marked.
 */
export function markGrpcStatusMessageDecoded(error: RpcError): boolean {
	if (MESSAGE_DECODED in error) return false;
	Object.defineProperty(error, MESSAGE_DECODED, { value: true, configurable: true });

	return true;
}

function decodeStatusMessageOnce(error: RpcError): void {
	if (markGrpcStatusMessageDecoded(error)) error.message = decodeGrpcStatusMessage(error.message);
}

/** Whether the error's status text was already percent-decoded. */
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

/**
 * The status code name for a call aborted with `reason`: the reason's own `code` when it is a
 * status name, `DEADLINE_EXCEEDED` for a `TimeoutError` (as from `AbortSignal.timeout`), and
 * `CANCELLED` otherwise. The reason is read by shape, so it works across realms and package copies.
 */
export function grpcStatusFromAbortReason(reason: unknown): string {
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

/**
 * Rewrites an `RpcError` in place as `SuiGrpcClient` reports it: the percent-encoded status text is
 * decoded once, and an `INTERNAL` or `CANCELLED` error of a call whose `signal` was aborted is
 * re-coded with `grpcStatusFromAbortReason`. Other values are ignored, and it never throws.
 */
export function normalizeGrpcError(error: unknown, signal: AbortSignal | undefined): void {
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
		error.code = grpcStatusFromAbortReason(signal.reason);

		// A failure that raced the abort is relabelled with it. Text the abort reason supplied is
		// local and holds nothing to decode; anything else came off the wire, even though the abort is
		// what the caller sees. Settled here for the other promises the call rejects, which no longer
		// match the codes above.
		if (isAbortReasonText(error.message, signal.reason)) markGrpcStatusMessageDecoded(error);
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

// Upstream erases fetch/read failures into INTERNAL, the same status as a server failure or
// protobuf decode error. Preserve the transport boundary so resumable streams can retry only
// network failures. Aborts retain the existing signal-aware normalization below.
function streamFetch(fetch: typeof globalThis.fetch): typeof globalThis.fetch {
	return async (input, init) => {
		const networkError = (error: unknown) => {
			if (init?.signal?.aborted || error instanceof RpcError) return error;
			return new RpcError(
				error instanceof Error ? error.message : 'Network stream failed',
				'UNAVAILABLE',
			);
		};
		let response: Response;
		try {
			response = await fetch(input, init);
		} catch (error) {
			throw networkError(error);
		}
		if (!response.body) return response;
		const reader = response.body.getReader();
		const body = new ReadableStream<Uint8Array>({
			async pull(controller) {
				try {
					const next = await reader.read();
					if (next.done) controller.close();
					else controller.enqueue(next.value);
				} catch (error) {
					controller.error(networkError(error));
				}
			},
			cancel(reason) {
				return reader.cancel(reason);
			},
		});
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
}

export interface GrpcWebFetchTransportOptions extends GrpcWebOptions {
	/**
	 * Largest response message `serverStreamingIterable` accepts, in bytes. Checked against the
	 * declared frame length before the frame is buffered. Defaults to 64 MiB.
	 */
	maxResponseMessageBytes?: number;
}

/**
 * `GrpcWebFetchTransport` from `@protobuf-ts/grpcweb-transport`, subclassed to decode status
 * messages, to code an aborted call from its reason rather than as `INTERNAL`, to send the
 * `x-sui-client-protocol-version` header, and to read server streams on demand with
 * `serverStreamingIterable`.
 *
 * `SuiGrpcClient` builds one by default. A transport imported from `@protobuf-ts/grpcweb-transport`
 * keeps that package's behaviour.
 */
export class GrpcWebFetchTransport
	extends UpstreamGrpcWebFetchTransport
	implements PullServerStreamingTransport
{
	constructor(options: GrpcWebFetchTransportOptions) {
		// Lets the server avoid sending types this SDK cannot decode. Caller-supplied `meta` wins.
		super({
			...options,
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
		const call = super.unary(method, input, options);

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
			fetch: streamFetch((options as GrpcWebOptions).fetch ?? globalThis.fetch),
		} as GrpcWebOptions);

		// A finite stream is often read through `responses` without awaiting `status`.
		call.responses.onError((error) => normalizeGrpcError(error, options.abort));
		normalizeRejections([call.headers, call.status, call.trailers], options.abort);

		return call;
	}

	/**
	 * A server-streaming call whose response body is read, and messages decoded, only while the
	 * consumer waits on `responses.next()`. Interceptors are not applied.
	 */
	serverStreamingIterable<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingIterableCall<I, O> {
		const opt = options as GrpcWebPullOptions;

		return grpcWebServerStreamingIterable(
			method,
			input,
			this.makeUrl(method, opt),
			opt,
			normalizeGrpcError,
		);
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
		...(supportsServerStreamingIterable(transport) && {
			serverStreamingIterable: transport.serverStreamingIterable.bind(transport),
		}),
	};
}
