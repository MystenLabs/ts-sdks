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
import { DEFAULT_MAX_RESPONSE_MESSAGE_BYTES, GrpcWebPullCall } from './grpc-web-pull.js';
import { markConnectionLost, markHttpStatus, toNetworkRpcError } from './network-error.js';
import { PULL_SERVER_STREAMING } from './pull-call.js';
import type { PullServerStreamingTransport, ServerStreamingIterableCall } from './pull-call.js';

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

/**
 * The status name for a call ended by an abort with `reason`: the reason's own `code` when it is a
 * status name, `DEADLINE_EXCEEDED` for the `TimeoutError` of `AbortSignal.timeout`, and `CANCELLED`
 * otherwise. Re-exported for transport implementations from `@mysten/sui/grpc/pull-transport`.
 */
// The reason is read by shape, since another copy of runtime-rpc or another realm fails
// `instanceof`.
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
	return message === abortReasonMessage(reason);
}

/** The abort reason's own text, as upstream reports an abort. Never coerces the reason. */
function abortReasonMessage(reason: unknown): string | undefined {
	if (typeof reason === 'string') return reason;
	const message = readProperty(reason, 'message');
	return typeof message === 'string' ? message : undefined;
}

/** The HTTP status of a non-2xx response that carried a gRPC status, recorded by `networkFetch`. */
interface HttpStatusRef {
	status?: number;
}

// Rewritten in place, so every promise a call rejects surfaces the same error. Only the two codes
// upstream uses for an abort are re-coded; a failure that raced the abort is relabelled with it.
function normalizeGrpcError(
	error: unknown,
	signal: AbortSignal | undefined,
	http: HttpStatusRef,
): void {
	try {
		// Upstream fails the call from the response headers alone once they carry a non-OK status.
		if (http.status !== undefined && error instanceof RpcError) markHttpStatus(error, http.status);
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

		// Text the abort reason supplied is local and holds nothing to decode; anything else came off
		// the wire, even though the abort is what the caller sees. Settled here for the other promises
		// the call rejects, which no longer match the codes above.
		if (isAbortReasonText(error.message, signal.reason)) markStatusMessageRead(error);
		else decodeStatusMessageOnce(error);

		return;
	}

	decodeStatusMessageOnce(error);
}

function normalizeRejections(
	promises: Promise<unknown>[],
	signal: AbortSignal | undefined,
	http: HttpStatusRef,
) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, signal, http));
	}
}

// Upstream erases fetch and body-read failures into INTERNAL. Wrap the fetch so those failures
// surface as UNAVAILABLE (see `toNetworkRpcError`).
function networkFetch(
	fetch: typeof globalThis.fetch,
	http: HttpStatusRef,
): typeof globalThis.fetch {
	return async (input, init) => {
		let response: Response;
		try {
			response = await fetch(input, init);
		} catch (error) {
			throw toNetworkRpcError(error, init?.signal, 'request');
		}
		if (!response.ok) {
			// Upstream resolves the call's headers, then fails it from their status without reading
			// the body. Keep the HTTP status for that error: a proxy's 502 and 408 both map to UNKNOWN.
			const [code] = readGrpcWebResponseHeader(response);
			if (code !== undefined && code !== GrpcStatusCode.OK) {
				http.status = response.status;
				// Release the connection the unread body holds.
				cancelBody(response.body);
				return response;
			}
		}
		const chunks = bodyChunks(response.body);
		if (!chunks) return response;
		const signal = init?.signal;
		const frames = isBinaryGrpcWeb(response.headers)
			? new FrameTracker(readGrpcWebResponseHeader(response)[0] !== undefined)
			: undefined;
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
			body: { [Symbol.asyncIterator]: () => networkBody(chunks, signal, frames) },
		} as unknown as Response;
	};
}

async function* networkBody(
	chunks: BodyChunks,
	signal: AbortSignal | null | undefined,
	frames: FrameTracker | undefined,
): AsyncGenerator<Uint8Array> {
	while (true) {
		let next: IteratorResult<Uint8Array>;
		try {
			next = await chunks.next();
		} catch (error) {
			throw toNetworkRpcError(error, signal, 'response');
		}
		if (next.done) {
			// Upstream codes a body cut short as DATA_LOSS; it is a connection lost mid-response.
			const cut = frames?.cut();
			if (cut) {
				// An abort can also end a body early; it is coded from the abort reason.
				throw signal?.aborted
					? new RpcError(abortReasonMessage(signal.reason) ?? cut, 'CANCELLED')
					: markConnectionLost(new RpcError(cut, 'UNAVAILABLE'));
			}
			return;
		}
		frames?.push(next.value);
		yield next.value;
	}
}

function isBinaryGrpcWeb(headers: Headers): boolean {
	const type = headers.get('content-type') ?? '';
	return type.startsWith('application/grpc-web') && !type.startsWith('application/grpc-web-text');
}

/** Follows binary gRPC-web frame boundaries to tell a complete body from one cut short. */
class FrameTracker {
	readonly #header = new Uint8Array(5);
	#headerLength = 0;
	#remaining = 0;
	#sawData = false;
	#sawTrailer = false;
	#sawBytes = false;
	readonly #headerStatus: boolean;

	/** `headerStatus`: the response headers carry a gRPC status, so an empty body is complete. */
	constructor(headerStatus: boolean) {
		this.#headerStatus = headerStatus;
	}

	push(chunk: Uint8Array) {
		if (chunk.length > 0) this.#sawBytes = true;
		let offset = 0;
		while (offset < chunk.length) {
			if (this.#remaining > 0) {
				const skipped = Math.min(this.#remaining, chunk.length - offset);
				this.#remaining -= skipped;
				offset += skipped;
				continue;
			}
			this.#header[this.#headerLength++] = chunk[offset++];
			if (this.#headerLength < 5) continue;
			const [flags, a, b, c, d] = this.#header;
			if (flags & 0x80) this.#sawTrailer = true;
			else this.#sawData = true;
			this.#remaining = ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
			this.#headerLength = 0;
		}
	}

	/** Why the body is incomplete, if it is. */
	cut(): string | undefined {
		if (this.#headerLength > 0 || this.#remaining > 0) return 'premature EOF';
		if (this.#sawData && !this.#sawTrailer) return 'missing trailers';
		// No frame and no status in the headers: the connection closed before the response began.
		if (!this.#sawBytes && !this.#headerStatus) return 'missing status';
		return undefined;
	}
}

/** Releases the connection an unread body holds; never throws. */
function cancelBody(body: unknown) {
	if (!body || typeof body !== 'object') return;
	try {
		const stream = body as {
			cancel?: () => Promise<void>;
			destroy?: () => void;
			[Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
		};
		if (typeof stream.cancel === 'function') {
			stream.cancel().catch(() => {});
		} else if (typeof stream.destroy === 'function') {
			// A Node.js stream, as `node-fetch` returns.
			stream.destroy();
		} else {
			stream[Symbol.asyncIterator]?.()
				.return?.()
				?.catch(() => {});
		}
	} catch {
		// The coded error matters more than releasing the body.
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

export interface GrpcWebFetchTransportOptions extends GrpcWebOptions {
	/**
	 * Largest response message, in bytes, accepted by the SDK's incremental stream reader. A larger
	 * message fails with a non-retryable `RESOURCE_EXHAUSTED`. Does not apply to unary calls or
	 * `serverStreaming`.
	 * @default 64 MiB
	 */
	maxResponseMessageBytes?: number;
}

/**
 * `GrpcWebFetchTransport` from `@protobuf-ts/grpcweb-transport`, subclassed to decode status
 * messages, to code an aborted call from its reason rather than as `INTERNAL`, to send the
 * `x-sui-client-protocol-version` header, and to default to the binary wire format. It can also
 * read server streams on demand, which the SDK uses internally.
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
		this.#maxResponseMessageBytes = maxResponseMessageBytes ?? DEFAULT_MAX_RESPONSE_MESSAGE_BYTES;
	}

	/** Internal: an on-demand server-streaming call. Interceptors are not applied. */
	[PULL_SERVER_STREAMING]<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions = {},
	): ServerStreamingIterableCall<I, O> {
		const merged = this.mergeOptions(options) as GrpcWebOptions;
		return new GrpcWebPullCall(method, input, {
			options: merged,
			url: this.makeUrl(method, merged),
			maxResponseMessageBytes: this.#maxResponseMessageBytes,
			// The pull reader attaches the HTTP status itself.
			normalizeError: (error, signal) => normalizeGrpcError(error, signal, {}),
		});
	}

	override unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): UnaryCall<I, O> {
		const http: HttpStatusRef = {};
		const call = super.unary(method, input, {
			...options,
			fetch: networkFetch((options as GrpcWebOptions).fetch ?? globalThis.fetch, http),
		} as GrpcWebOptions);

		normalizeRejections(
			[call.headers, call.response, call.status, call.trailers],
			options.abort,
			http,
		);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		const http: HttpStatusRef = {};
		const call = super.serverStreaming(method, input, {
			...options,
			fetch: networkFetch((options as GrpcWebOptions).fetch ?? globalThis.fetch, http),
		} as GrpcWebOptions);

		// A finite stream is often read through `responses` without awaiting `status`.
		call.responses.onError((error) => normalizeGrpcError(error, options.abort, http));
		normalizeRejections([call.headers, call.status, call.trailers], options.abort, http);

		return call;
	}
}

/** Adds SDK metadata without mutating the caller's transport or its default options. */
export function withClientProtocolVersion(transport: RpcTransport): RpcTransport {
	const wrapper: RpcTransport & Partial<PullServerStreamingTransport> = {
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
		// Called with this wrapper's merged options, so the header also reaches a pull transport this
		// package did not build. Merging again inside the transport changes nothing, since pull calls
		// never have interceptors.
		...(PULL_SERVER_STREAMING in transport && {
			[PULL_SERVER_STREAMING]: (method, input, options) =>
				(transport as PullServerStreamingTransport)[PULL_SERVER_STREAMING](
					method,
					input,
					wrapper.mergeOptions(options),
				),
		}),
	};

	return wrapper;
}
