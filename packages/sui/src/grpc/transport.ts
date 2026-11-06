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
import { DEFAULT_MAX_RESPONSE_MESSAGE_BYTES, GrpcWebPullCall } from './grpc-web-pull.js';
import { toNetworkRpcError } from './network-error.js';
import { PULL_SERVER_STREAMING } from './pull-call.js';
import type { PullServerStreamingTransport, ServerStreamingIterableCall } from './pull-call.js';

// A failed call rejects four promises with the same error, so it is only decoded once.
const decodedErrors = new WeakSet<RpcError>();

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

function decodeStatusMessageOnce(error: RpcError): void {
	if (decodedErrors.has(error)) return;
	decodedErrors.add(error);
	error.message = decodeGrpcStatusMessage(error.message);
}

// The reason is read by shape, since another copy of runtime-rpc or another realm fails
// `instanceof`. `AbortSignal.timeout` aborts with a `TimeoutError`.
function abortStatus(reason: unknown): string {
	const { code, name } = (typeof reason === 'object' && reason !== null ? reason : {}) as {
		code?: unknown;
		name?: unknown;
	};

	// A status name maps to a number; `in` would also match the enum's reverse mapping.
	if (
		typeof code === 'string' &&
		typeof GrpcStatusCode[code as keyof typeof GrpcStatusCode] === 'number'
	) {
		return code;
	}

	return name === 'TimeoutError'
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
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
	}

	decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], signal: AbortSignal | undefined) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, signal));
	}
}

// Upstream erases fetch and body-read failures into INTERNAL; code them as UNAVAILABLE instead.
function networkFetch(fetch: typeof globalThis.fetch): typeof globalThis.fetch {
	return async (input, init) => {
		let response: Response;
		try {
			response = await fetch(input, init);
		} catch (error) {
			throw toNetworkRpcError(error, init?.signal);
		}
		// Other bodies, such as node-fetch's Node.js streams, are left to upstream.
		if (typeof response.body?.getReader !== 'function') return response;
		const reader = response.body.getReader();
		// Upstream reads only these fields and iterates the body. The getters stay lazy because
		// Cloudflare Workers throw on `type`, which upstream catches.
		return {
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
			body: { [Symbol.asyncIterator]: () => readBody(reader, init?.signal) },
		} as unknown as Response;
	};
}

async function* readBody(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	signal: AbortSignal | null | undefined,
): AsyncGenerator<Uint8Array> {
	while (true) {
		let result: ReadableStreamReadResult<Uint8Array>;
		try {
			result = await reader.read();
		} catch (error) {
			throw toNetworkRpcError(error, signal);
		}
		if (result.done) return;
		yield result.value;
	}
}

// A malformed URL would otherwise fail every call as a network error, which streams retry.
function assertBaseUrl(baseUrl: string, customFetch: boolean) {
	if (/^https?:\/\//i.test(baseUrl)) return;
	if (baseUrl.startsWith('/') && (customFetch || 'location' in globalThis)) return;
	throw new Error(
		'GrpcWebFetchTransport baseUrl must be an absolute http(s) URL, or a path starting with "/" in a browser or with a custom fetch',
	);
}

export interface GrpcWebFetchTransportOptions extends GrpcWebOptions {
	/**
	 * Largest response message, in bytes, that ledger streams accept. A larger message fails the
	 * stream with `RESOURCE_EXHAUSTED`.
	 * @default 64 MiB
	 */
	maxResponseMessageBytes?: number;
}

/**
 * `GrpcWebFetchTransport` from `@protobuf-ts/grpcweb-transport`, subclassed to decode status
 * messages, to code an aborted call from its reason rather than as `INTERNAL`, to code network
 * failures as `UNAVAILABLE`, to send the `x-sui-client-protocol-version` header, and to default to
 * the binary wire format. It also reads server streams on demand, which the SDK uses internally.
 *
 * `SuiGrpcClient` builds one by default. A transport imported from `@protobuf-ts/grpcweb-transport`
 * keeps that package's behaviour.
 */
export class GrpcWebFetchTransport
	extends UpstreamGrpcWebFetchTransport
	implements PullServerStreamingTransport
{
	readonly #maxResponseMessageBytes: number;

	constructor({ maxResponseMessageBytes, ...options }: GrpcWebFetchTransportOptions) {
		assertBaseUrl(options.baseUrl, !!(options as Partial<GrpcWebOptions>).fetch);
		// Lets the server avoid sending types this SDK cannot decode. Caller-supplied `meta` wins.
		super({
			...options,
			format: options.format ?? 'binary',
			meta: {
				[CLIENT_PROTOCOL_VERSION_HEADER]: String(MAX_PROTOCOL_VERSION),
				...options.meta,
			},
		});
		this.#maxResponseMessageBytes = maxResponseMessageBytes ?? DEFAULT_MAX_RESPONSE_MESSAGE_BYTES;
	}

	/** Internal: an on-demand server-streaming call. Interceptors are not applied. */
	[PULL_SERVER_STREAMING]<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions = {},
	): ServerStreamingIterableCall<O> {
		const merged = this.mergeOptions(options) as GrpcWebOptions;
		return new GrpcWebPullCall(method, input, {
			options: merged,
			url: this.makeUrl(method, merged),
			maxResponseMessageBytes: this.#maxResponseMessageBytes,
			normalizeError: normalizeGrpcError,
		});
	}

	override unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): UnaryCall<I, O> {
		const call = super.unary(method, input, withNetworkFetch(options));

		normalizeRejections([call.headers, call.response, call.status, call.trailers], options.abort);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		const call = super.serverStreaming(method, input, withNetworkFetch(options));

		// A finite stream is often read through `responses` without awaiting `status`.
		call.responses.onError((error) => normalizeGrpcError(error, options.abort));
		normalizeRejections([call.headers, call.status, call.trailers], options.abort);

		return call;
	}
}

function withNetworkFetch(options: RpcOptions): RpcOptions {
	const fetch = (options as Partial<GrpcWebOptions>).fetch ?? globalThis.fetch;
	return { ...options, fetch: networkFetch(fetch) } as RpcOptions;
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
		// The inner transport's pull method merges its own options, which already carry the header.
		...(PULL_SERVER_STREAMING in transport && {
			[PULL_SERVER_STREAMING]: (transport as PullServerStreamingTransport)[
				PULL_SERVER_STREAMING
			].bind(transport),
		}),
	};
}
