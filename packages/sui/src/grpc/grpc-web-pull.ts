// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*
 * An on-demand reader for gRPC-web server streams. This is owned code, not a vendored copy.
 * Request construction and header/trailer parsing use the public helpers of
 * `@protobuf-ts/grpcweb-transport`. Content type parsing, base64 handling, frame extraction and
 * call settlement are adapted from `@protobuf-ts/grpcweb-transport` 2.11.1
 * (`grpc-web-format.ts`, `grpc-web-transport.ts`), Copyright (c) Timo Stamm, licensed under the
 * Apache License, Version 2.0: https://github.com/timostamm/protobuf-ts
 *
 * Unlike upstream, the body is read only while the consumer waits for a message, and frame sizes
 * are checked before their payload is buffered.
 */

import { base64decode } from '@protobuf-ts/runtime';
import {
	createGrpcWebRequestBody,
	createGrpcWebRequestHeader,
	GrpcStatusCode,
	GrpcWebFrame,
	readGrpcWebResponseHeader,
	readGrpcWebResponseTrailer,
} from '@protobuf-ts/grpcweb-transport';
import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { Deferred, RpcError } from '@protobuf-ts/runtime-rpc';
import type { MethodInfo, RpcMetadata, RpcStatus } from '@protobuf-ts/runtime-rpc';

import { isAbortError, toNetworkRpcError } from './network-error.js';
import { markNonRetryable } from './pull-call.js';
import type { ServerStreamingIterableCall } from './pull-call.js';

export const DEFAULT_MAX_RESPONSE_MESSAGE_BYTES = 64 * 1024 * 1024;

/** Largest trailer frame accepted; `maxResponseMessageBytes` does not cover trailers. */
export const MAX_TRAILER_BYTES = 1024 * 1024;

const code = (status: GrpcStatusCode) => GrpcStatusCode[status];

// --- Request preparation ------------------------------------------------------------------------

export interface GrpcWebRequest {
	body: BodyInit;
	headers: Headers;
}

/**
 * Serializes the request and builds its headers. Runs outside the network error boundary, so an
 * invalid request is `INTERNAL` rather than a retryable network failure.
 */
export function prepareGrpcWebRequest<I extends object>(
	method: MethodInfo<I, object>,
	input: I,
	options: GrpcWebOptions,
): GrpcWebRequest | RpcError {
	const format = options.format ?? 'binary';
	try {
		return {
			body: createGrpcWebRequestBody(
				method.I.toBinary(input, options.binaryOptions),
				format,
			) as BodyInit,
			headers: createGrpcWebRequestHeader(
				new globalThis.Headers(),
				format,
				options.timeout,
				options.meta,
			),
		};
	} catch (error) {
		if (error instanceof RpcError) return error;
		return new RpcError(
			`failed to serialize request: ${error instanceof Error ? error.message : String(error)}`,
			code(GrpcStatusCode.INTERNAL),
		);
	}
}

// --- Frame decoding -----------------------------------------------------------------------------

export type GrpcWebResponseFrame =
	{ type: 'data'; data: Uint8Array } | { type: 'trailer'; status: RpcStatus; meta: RpcMetadata };

/**
 * Received bytes as a list of chunks, so a frame is copied only when it spans chunks. Consumed
 * chunks are dropped by advancing `#head`, not by `shift()`, which is linear in the queue length.
 */
class ByteQueue {
	#chunks: (Uint8Array | undefined)[] = [];
	#head = 0;
	#offset = 0;
	length = 0;

	push(chunk: Uint8Array) {
		if (chunk.length === 0) return;
		this.#chunks.push(chunk);
		this.length += chunk.length;
	}

	byteAt(index: number): number {
		let i = index + this.#offset;
		for (let k = this.#head; k < this.#chunks.length; k++) {
			const chunk = this.#chunks[k]!;
			if (i < chunk.length) return chunk[i];
			i -= chunk.length;
		}
		throw new RangeError('index out of range');
	}

	take(n: number): Uint8Array {
		const first = this.#chunks[this.#head];
		if (first && first.length - this.#offset >= n) {
			const out = first.subarray(this.#offset, this.#offset + n);
			this.#advance(n);
			return out;
		}
		const out = new Uint8Array(n);
		let written = 0;
		while (written < n) {
			const chunk = this.#chunks[this.#head]!;
			const count = Math.min(n - written, chunk.length - this.#offset);
			out.set(chunk.subarray(this.#offset, this.#offset + count), written);
			written += count;
			this.#advance(count);
		}
		return out;
	}

	#advance(n: number) {
		this.length -= n;
		this.#offset += n;
		while (this.#head < this.#chunks.length) {
			const chunk = this.#chunks[this.#head]!;
			if (this.#offset < chunk.length) break;
			this.#offset -= chunk.length;
			// Released at once, so a consumed chunk is never retained.
			this.#chunks[this.#head++] = undefined;
		}
		if (this.#head === this.#chunks.length) {
			this.#chunks = [];
			this.#head = 0;
		} else if (this.#head >= 1024 && this.#head * 2 >= this.#chunks.length) {
			this.#chunks = this.#chunks.slice(this.#head);
			this.#head = 0;
		}
	}
}

// Base64 is ASCII. Any other byte decodes to a character that `base64decode` rejects.
const ascii = new TextDecoder();
const BASE64_WHITESPACE = /[\t\n\r ]/g;

/**
 * Splits a gRPC-web response body into frames: `push` chunks, take frames with `next` until it
 * returns `undefined`, and call `end` at EOF.
 */
export class GrpcWebFrameDecoder {
	readonly #text: boolean;
	readonly #maxMessageBytes: number;
	readonly #maxTrailerBytes: number;
	#bytes = new ByteQueue();
	#base64 = '';
	#sawData = false;
	#sawTrailer = false;

	constructor(
		contentType: string | null,
		maxMessageBytes: number,
		maxTrailerBytes = MAX_TRAILER_BYTES,
	) {
		this.#text = isTextFormat(contentType);
		this.#maxMessageBytes = maxMessageBytes;
		this.#maxTrailerBytes = maxTrailerBytes;
	}

	push(chunk: Uint8Array): void {
		if (!this.#text) return this.#bytes.push(chunk);
		// Whole base64 quanta are decoded; the rest waits for the next chunk. Whitespace is dropped
		// first, because `base64decode` skips it and the quanta must line up with what it reads.
		this.#base64 += ascii.decode(chunk).replace(BASE64_WHITESPACE, '');
		const whole = this.#base64.length - (this.#base64.length % 4);
		if (whole === 0) return;
		const bytes = base64decode(this.#base64.substring(0, whole));
		this.#base64 = this.#base64.substring(whole);
		// Inner padding leaves the result a view of a larger buffer. Copy it, so a queued chunk
		// holds only the bytes counted against the frame limit.
		this.#bytes.push(bytes.length === bytes.buffer.byteLength ? bytes : bytes.slice());
	}

	/**
	 * The next complete frame, or `undefined` until more bytes arrive. An oversized frame is
	 * rejected as soon as its 5-byte prefix is buffered.
	 */
	next(): GrpcWebResponseFrame | undefined {
		const bytes = this.#bytes;
		if (bytes.length < 5) return undefined;
		const flag = bytes.byteAt(0);
		if (flag !== GrpcWebFrame.DATA && flag !== GrpcWebFrame.TRAILER) {
			throw new RpcError(
				flag & 1
					? 'compressed grpc-web frames are not supported'
					: `unknown grpc-web frame ${flag}`,
				code(GrpcStatusCode.INTERNAL),
			);
		}
		const length =
			((bytes.byteAt(1) << 24) |
				(bytes.byteAt(2) << 16) |
				(bytes.byteAt(3) << 8) |
				bytes.byteAt(4)) >>>
			0;
		const isData = flag === GrpcWebFrame.DATA;
		const limit = isData ? this.#maxMessageBytes : this.#maxTrailerBytes;
		if (length > limit) {
			// The same frame would be sent again on retry, so it is not retryable.
			throw markNonRetryable(
				new RpcError(
					`grpc-web ${isData ? 'frame' : 'trailer'} of ${length} bytes exceeds the ${limit} byte limit`,
					code(GrpcStatusCode.RESOURCE_EXHAUSTED),
				),
			);
		}
		if (bytes.length - 5 < length) return undefined;
		bytes.take(5);
		const data = bytes.take(length);
		if (isData) {
			this.#sawData = true;
			return { type: 'data', data };
		}
		this.#sawTrailer = true;
		const [statusCode, detail, meta] = readGrpcWebResponseTrailer(data);
		return {
			type: 'trailer',
			status: { code: code(statusCode), detail: detail ?? code(statusCode) },
			meta,
		};
	}

	/** Throws unless the body ended on a frame boundary, with a trailer after any messages. */
	end(): void {
		if (this.#bytes.length > 0 || this.#base64.length > 0) {
			throw new RpcError('premature EOF', code(GrpcStatusCode.DATA_LOSS));
		}
		if (this.#sawData && !this.#sawTrailer)
			throw new RpcError('missing trailers', code(GrpcStatusCode.DATA_LOSS));
	}
}

function isTextFormat(contentType: string | null): boolean {
	switch (contentType) {
		case 'application/grpc-web-text':
		case 'application/grpc-web-text+proto':
			return true;
		case 'application/grpc-web':
		case 'application/grpc-web+proto':
			return false;
		case null:
			throw new RpcError('missing response content type', code(GrpcStatusCode.INTERNAL));
		default:
			throw new RpcError(
				'unexpected response content type: ' + contentType,
				code(GrpcStatusCode.INTERNAL),
			);
	}
}

// --- Call lifecycle -----------------------------------------------------------------------------

type BodyReader = {
	read(): Promise<{ done?: boolean; value?: Uint8Array }>;
	cancel(): unknown;
};

// `node-fetch` bodies are Node streams, which are async iterable.
function bodyReader(body: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>): BodyReader {
	if ('getReader' in body) {
		const reader = body.getReader();
		return { read: () => reader.read(), cancel: () => reader.cancel() };
	}
	const iterator = body[Symbol.asyncIterator]();
	return { read: () => iterator.next(), cancel: () => iterator.return?.() };
}

function cancelQuietly(reader: BodyReader | undefined) {
	try {
		void Promise.resolve(reader?.cancel()).catch(() => {});
	} catch {
		// Already released.
	}
}

function reasonMessage(reason: unknown): string {
	if (typeof reason === 'string') return reason;
	try {
		const message = (reason as { message?: unknown } | null)?.message;
		if (typeof message === 'string') return message;
	} catch {
		// An abort reason is arbitrary caller data.
	}
	return 'The operation was aborted';
}

export interface GrpcWebPullCallOptions {
	/** Options already merged with the transport's defaults. */
	options: GrpcWebOptions;
	url: string;
	maxResponseMessageBytes: number;
	/** Applied to every error the call surfaces, except a consumer's own cancellation. */
	normalizeError: (error: RpcError, signal: AbortSignal | undefined) => void;
}

const DONE = { done: true, value: undefined } as const;

type State = 'open' | 'done' | 'failed' | 'cancelled';

/**
 * A gRPC-web server-streaming call whose body is read only while the consumer waits on
 * `responses.next()`.
 *
 * An abort, `return()` or failure can land during any await, so every await is followed by
 * `#throwIfFailed()` and `#isOpen()`, and the first failure is sticky.
 */
export class GrpcWebPullCall<
	I extends object,
	O extends object,
> implements ServerStreamingIterableCall<I, O> {
	readonly method: MethodInfo<I, O>;
	readonly request: Readonly<I>;
	readonly requestHeaders: Readonly<RpcMetadata>;
	readonly responses: AsyncIterableIterator<O>;

	readonly #headers = new Deferred<RpcMetadata>();
	readonly #status = new Deferred<RpcStatus>();
	readonly #trailers = new Deferred<RpcMetadata>();

	readonly #options: GrpcWebOptions;
	readonly #maxBytes: number;
	readonly #normalizeError: GrpcWebPullCallOptions['normalizeError'];
	readonly #userSignal: AbortSignal | undefined;
	// Aborted by the caller's signal, by `return()` and on failure, so the request is released even
	// when nothing is pulling.
	readonly #controller = new AbortController();
	readonly #onUserAbort = () => this.#controller.abort(this.#userSignal!.reason);
	// One callback per in-flight `#interruptible` operation, run when the call settles early.
	readonly #interrupts = new Set<() => void>();
	readonly #opened: Promise<void>;
	#responded = false;

	#state: State = 'open';
	#failure: RpcError | undefined;
	#reader: BodyReader | undefined;
	#decoder: GrpcWebFrameDecoder | undefined;
	// Set by a trailers-only response, whose status arrives in the HTTP headers.
	#headerStatus: RpcStatus | undefined;
	#eof = false;
	// `next()` calls are serialized; `return()` is not, so it can cancel a pending read. Settles
	// with `undefined`, never the last message, which may be a view into a large network chunk.
	#tail: Promise<void> = Promise.resolve();

	constructor(method: MethodInfo<I, O>, input: I, call: GrpcWebPullCallOptions) {
		this.method = method;
		this.request = input;
		this.requestHeaders = call.options.meta ?? {};
		this.#options = call.options;
		this.#maxBytes = call.maxResponseMessageBytes;
		this.#normalizeError = call.normalizeError;
		this.#userSignal = call.options.abort;

		const request = prepareGrpcWebRequest(method, input, call.options);

		// Some fetch implementations ignore the abort, so `#fail` interrupts pending reads. Registered
		// before an already-aborted caller signal is applied, so that abort fails the call too.
		this.#controller.signal.addEventListener(
			'abort',
			() => this.#fail(this.#controller.signal.reason),
			{ once: true },
		);
		if (this.#userSignal?.aborted) this.#controller.abort(this.#userSignal.reason);
		else this.#userSignal?.addEventListener('abort', this.#onUserAbort, { once: true });

		this.#opened = this.#open(request, call.url);
		this.#opened.then(
			() => (this.#responded = true),
			(error: unknown) => this.#fail(error),
		);

		this.responses = {
			[Symbol.asyncIterator]() {
				return this;
			},
			next: () => {
				const result = this.#tail.then(() => this.#pull());
				this.#tail = result.then(
					() => {},
					() => {},
				);
				return result;
			},
			return: async () => {
				this.#cancel();
				return DONE;
			},
		};
	}

	get headers(): Promise<RpcMetadata> {
		return this.#headers.promise;
	}

	get status(): Promise<RpcStatus> {
		return this.#status.promise;
	}

	get trailers(): Promise<RpcMetadata> {
		return this.#trailers.promise;
	}

	// Methods, not `this.#state` comparisons, so TypeScript does not keep a narrowing across awaits.
	#isOpen(): boolean {
		return this.#state === 'open';
	}

	#throwIfFailed(): void {
		if (this.#state === 'failed') throw this.#failure;
	}

	async #open(request: ReturnType<typeof prepareGrpcWebRequest>, url: string): Promise<void> {
		if (request instanceof RpcError) throw request;
		if (!this.#isOpen()) return;

		const fetch = this.#options.fetch ?? globalThis.fetch;
		let response: Response;
		try {
			response = await fetch(url, {
				...this.#options.fetchInit,
				method: 'POST',
				headers: request.headers,
				body: request.body,
				signal: this.#controller.signal,
			});
		} catch (error) {
			throw toNetworkRpcError(error, this.#controller.signal);
		}

		const rawBody = response.body as ReadableStream<Uint8Array> | AsyncIterable<Uint8Array> | null;
		const body = rawBody ? bodyReader(rawBody) : undefined;
		// A response that arrives after the call ended (even an error response) still holds a
		// connection until its body is cancelled.
		if (!this.#isOpen()) return cancelQuietly(body);

		try {
			const [statusCode, detail, meta] = readGrpcWebResponseHeader(response);
			this.#headers.resolvePending(meta);
			if (statusCode !== undefined && statusCode !== GrpcStatusCode.OK) {
				throw new RpcError(detail ?? code(statusCode), code(statusCode), meta);
			}
			if (statusCode !== undefined) {
				this.#headerStatus = { code: code(statusCode), detail: detail ?? 'OK' };
			}
			if (!body) {
				if (!this.#headerStatus) {
					throw new RpcError('missing response body', code(GrpcStatusCode.INTERNAL));
				}
				this.#eof = true;
				return;
			}
			this.#decoder = new GrpcWebFrameDecoder(response.headers.get('content-type'), this.#maxBytes);
		} catch (error) {
			cancelQuietly(body);
			throw error;
		}
		// Everything since the open check ran synchronously, so the call is still open.
		this.#reader = body;
	}

	async #pull(): Promise<IteratorResult<O, undefined>> {
		try {
			if (!this.#responded) {
				await this.#interruptible(this.#opened);
			} else {
				// The same two microtasks as the wait above, so an abort is seen just as early, without
				// a new promise per message.
				await this.#opened;
				await this.#opened;
			}
			for (;;) {
				this.#throwIfFailed();
				if (!this.#isOpen()) return DONE;

				const frame = this.#decoder?.next();
				if (frame?.type === 'data') {
					return {
						done: false,
						value: this.method.O.fromBinary(frame.data, this.#options.binaryOptions),
					};
				}
				if (frame?.type === 'trailer') return this.#finish(frame.status, frame.meta);
				if (this.#eof) {
					this.#decoder?.end();
					if (!this.#headerStatus) {
						throw new RpcError('missing status', code(GrpcStatusCode.INTERNAL));
					}
					return this.#finish(this.#headerStatus, {});
				}

				const result = await this.#interruptible(this.#read(this.#reader!));
				this.#throwIfFailed();
				if (!this.#isOpen() || !result) return DONE;
				if (result.done) this.#eof = true;
				if (result.value !== undefined) this.#decoder!.push(result.value);
			}
		} catch (error) {
			if (this.#state === 'cancelled') return DONE;
			this.#fail(error);
			throw this.#failure;
		}
	}

	async #read(reader: BodyReader) {
		try {
			return await reader.read();
		} catch (error) {
			throw toNetworkRpcError(error, this.#controller.signal);
		}
	}

	/**
	 * Settles with `operation`, or with `undefined` once the call settles early, for a fetch or body
	 * that ignores the abort. Not `Promise.race`, which would keep each settled read's result alive.
	 */
	#interruptible<T>(operation: Promise<T>): Promise<T | undefined> {
		return new Promise<T | undefined>((resolve, reject) => {
			if (!this.#isOpen()) return resolve(undefined);
			const interrupt = () => resolve(undefined);
			this.#interrupts.add(interrupt);
			operation.then(
				(value) => {
					this.#interrupts.delete(interrupt);
					resolve(value);
				},
				(error: unknown) => {
					this.#interrupts.delete(interrupt);
					reject(error);
				},
			);
		});
	}

	#finish(status: RpcStatus, meta: RpcMetadata): IteratorResult<O, undefined> {
		if (status.code !== 'OK') throw new RpcError(status.detail, status.code, meta);
		this.#state = 'done';
		this.#status.resolve(status);
		this.#trailers.resolve(meta);
		this.#release();
		return DONE;
	}

	/** Fails the call with `reason`, unless it already ended. */
	#fail(reason: unknown): void {
		if (!this.#isOpen()) return;
		this.#failure = this.#toError(reason);
		this.#settle('failed', this.#failure);
	}

	#cancel(): void {
		if (!this.#isOpen()) return;
		const error = new RpcError('stream cancelled by consumer', code(GrpcStatusCode.CANCELLED));
		error.methodName = this.method.name;
		error.serviceName = this.method.service.typeName;
		this.#settle('cancelled', error);
	}

	#settle(state: 'failed' | 'cancelled', error: RpcError): void {
		this.#state = state;
		const pending = [...this.#interrupts];
		this.#interrupts.clear();
		for (const interrupt of pending) interrupt();
		this.#headers.rejectPending(error);
		this.#status.rejectPending(error);
		this.#trailers.rejectPending(error);
		this.#release();
		this.#controller.abort(error);
	}

	/** Drops the body and any bytes buffered from it, so an ended call retains neither. */
	#release(): void {
		this.#userSignal?.removeEventListener('abort', this.#onUserAbort);
		const reader = this.#reader;
		this.#reader = undefined;
		this.#decoder = undefined;
		cancelQuietly(reader);
	}

	#toError(reason: unknown): RpcError {
		let error: RpcError;
		if (reason instanceof RpcError) error = reason;
		// `toNetworkRpcError` passes an `AbortError` through even when this call's signal has not
		// aborted: a custom fetch may combine that signal with its own.
		else if (this.#controller.signal.aborted || isAbortError(reason)) {
			error = new RpcError(reasonMessage(reason), code(GrpcStatusCode.CANCELLED));
		} else {
			error = new RpcError(
				reason instanceof Error ? reason.message : String(reason),
				code(GrpcStatusCode.INTERNAL),
			);
		}
		error.methodName = this.method.name;
		error.serviceName = this.method.service.typeName;
		this.#normalizeError(error, this.#userSignal);
		return error;
	}
}
