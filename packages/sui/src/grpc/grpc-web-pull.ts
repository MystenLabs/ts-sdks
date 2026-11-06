// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*
 * An on-demand reader for binary gRPC-web server streams. Request construction and header/trailer
 * parsing use the public helpers of `@protobuf-ts/grpcweb-transport`. Frame extraction and call
 * settlement are adapted from `@protobuf-ts/grpcweb-transport` 2.11.1 (`grpc-web-format.ts`,
 * `grpc-web-transport.ts`), Copyright (c) Timo Stamm, licensed under the Apache License, Version
 * 2.0: https://github.com/timostamm/protobuf-ts
 *
 * Unlike upstream, the body is read only while the consumer waits for a message, and frame sizes
 * are checked before their payload is buffered.
 */

import {
	createGrpcWebRequestBody,
	createGrpcWebRequestHeader,
	GrpcStatusCode,
	GrpcWebFrame,
	readGrpcWebResponseHeader,
	readGrpcWebResponseTrailer,
} from '@protobuf-ts/grpcweb-transport';
import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { MethodInfo, RpcMetadata, RpcStatus } from '@protobuf-ts/runtime-rpc';

import { toNetworkRpcError } from './network-error.js';
import { markNonRetryable } from './pull-call.js';
import type { ServerStreamingIterableCall } from './pull-call.js';

export const DEFAULT_MAX_RESPONSE_MESSAGE_BYTES = 64 * 1024 * 1024;

const code = (status: GrpcStatusCode) => GrpcStatusCode[status];

export type GrpcWebResponseFrame =
	{ type: 'data'; data: Uint8Array } | { type: 'trailer'; status: RpcStatus; meta: RpcMetadata };

/** Splits a binary gRPC-web response body into frames: `push` chunks, then `next` until `undefined`. */
export class GrpcWebFrameDecoder {
	readonly #maxFrameBytes: number;
	#chunks: Uint8Array[] = [];
	#length = 0;

	constructor(maxFrameBytes: number) {
		this.#maxFrameBytes = maxFrameBytes;
	}

	/** Bytes received but not yet returned as a frame. */
	get buffered(): number {
		return this.#length;
	}

	push(chunk: Uint8Array): void {
		if (chunk.length === 0) return;
		this.#chunks.push(chunk);
		this.#length += chunk.length;
	}

	/**
	 * The next complete frame, or `undefined` until more bytes arrive. An oversized frame is
	 * rejected as soon as its 5-byte prefix arrives.
	 */
	next(): GrpcWebResponseFrame | undefined {
		if (this.#length < 5) return undefined;
		const prefix = this.#peek(5);
		const flag = prefix[0];
		if (flag !== GrpcWebFrame.DATA && flag !== GrpcWebFrame.TRAILER) {
			throw new RpcError(`unsupported grpc-web frame ${flag}`, code(GrpcStatusCode.INTERNAL));
		}
		const length = new DataView(prefix.buffer, prefix.byteOffset, 5).getUint32(1);
		if (length > this.#maxFrameBytes) {
			// The server would send the same frame again on retry.
			throw markNonRetryable(
				new RpcError(
					`grpc-web frame of ${length} bytes exceeds the ${this.#maxFrameBytes} byte limit`,
					code(GrpcStatusCode.RESOURCE_EXHAUSTED),
				),
			);
		}
		if (this.#length < 5 + length) return undefined;
		const payload = this.#take(5 + length).subarray(5);
		if (flag === GrpcWebFrame.DATA) return { type: 'data', data: payload };
		const [statusCode, detail, meta] = readGrpcWebResponseTrailer(payload);
		return {
			type: 'trailer',
			status: { code: code(statusCode), detail: detail ?? code(statusCode) },
			meta,
		};
	}

	/** The buffered bytes from the start, joining chunks only when the first holds fewer than `n`. */
	#peek(n: number): Uint8Array {
		if (this.#chunks[0].length < n) {
			const joined = new Uint8Array(this.#length);
			let offset = 0;
			for (const chunk of this.#chunks) {
				joined.set(chunk, offset);
				offset += chunk.length;
			}
			this.#chunks = [joined];
		}
		return this.#chunks[0];
	}

	#take(n: number): Uint8Array {
		const first = this.#peek(n);
		this.#length -= n;
		if (first.length === n) this.#chunks.shift();
		else this.#chunks[0] = first.subarray(n);
		return first.subarray(0, n);
	}
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
> implements ServerStreamingIterableCall<O> {
	readonly responses: AsyncIterableIterator<O>;

	readonly #method: MethodInfo<I, O>;
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

	#state: State = 'open';
	#failure: RpcError | undefined;
	#reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	#decoder: GrpcWebFrameDecoder | undefined;
	// Set by a trailers-only response, whose status arrives in the HTTP headers.
	#headerStatus: RpcStatus | undefined;
	#eof = false;
	// `next()` calls are serialized; `return()` is not, so it can cancel a pending read.
	#tail: Promise<void> = Promise.resolve();

	constructor(method: MethodInfo<I, O>, input: I, call: GrpcWebPullCallOptions) {
		this.#method = method;
		this.#options = call.options;
		this.#maxBytes = call.maxResponseMessageBytes;
		this.#normalizeError = call.normalizeError;
		this.#userSignal = call.options.abort;

		// Some fetch implementations ignore the abort, so `#fail` interrupts pending reads. Registered
		// before an already-aborted caller signal is applied, so that abort fails the call too.
		this.#controller.signal.addEventListener(
			'abort',
			() => this.#fail(this.#controller.signal.reason),
			{ once: true },
		);
		if (this.#userSignal?.aborted) this.#controller.abort(this.#userSignal.reason);
		else this.#userSignal?.addEventListener('abort', this.#onUserAbort, { once: true });

		this.#opened = this.#open(input, call.url);
		this.#opened.catch((error: unknown) => this.#fail(error));

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

	// Methods, not `this.#state` comparisons, so TypeScript does not keep a narrowing across awaits.
	#isOpen(): boolean {
		return this.#state === 'open';
	}

	#throwIfFailed(): void {
		if (this.#state === 'failed') throw this.#failure;
	}

	async #open(input: I, url: string): Promise<void> {
		let body: BodyInit;
		let headers: Headers;
		// Outside the network error boundary, so an invalid request is `INTERNAL`, not retryable.
		try {
			body = createGrpcWebRequestBody(
				this.#method.I.toBinary(input, this.#options.binaryOptions),
				'binary',
			) as BodyInit;
			headers = createGrpcWebRequestHeader(
				new globalThis.Headers(),
				'binary',
				this.#options.timeout,
				this.#options.meta,
			);
		} catch (error) {
			if (error instanceof RpcError) throw error;
			throw new RpcError(
				`failed to serialize request: ${error instanceof Error ? error.message : String(error)}`,
				code(GrpcStatusCode.INTERNAL),
			);
		}
		if (!this.#isOpen()) return;

		const fetch = this.#options.fetch ?? globalThis.fetch;
		let response: Response;
		try {
			response = await fetch(url, {
				...this.#options.fetchInit,
				method: 'POST',
				headers,
				body,
				signal: this.#controller.signal,
			});
		} catch (error) {
			throw toNetworkRpcError(error, this.#controller.signal);
		}

		// A response that arrives after the call ended still holds a connection until its body is
		// cancelled.
		if (!this.#isOpen()) return cancelQuietly(response.body);

		try {
			const [statusCode, detail, meta] = readGrpcWebResponseHeader(response);
			if (statusCode !== undefined && statusCode !== GrpcStatusCode.OK) {
				throw new RpcError(detail ?? code(statusCode), code(statusCode), meta);
			}
			if (statusCode !== undefined) this.#headerStatus = { code: 'OK', detail: detail ?? 'OK' };
			if (!response.body) {
				this.#eof = true;
				return;
			}
			const type = response.headers.get('content-type');
			if (type !== 'application/grpc-web' && type !== 'application/grpc-web+proto') {
				throw new RpcError(
					`unexpected response content type: ${type}`,
					code(GrpcStatusCode.INTERNAL),
				);
			}
			this.#reader = response.body.getReader();
		} catch (error) {
			cancelQuietly(response.body);
			throw error;
		}
		this.#decoder = new GrpcWebFrameDecoder(this.#maxBytes);
	}

	async #pull(): Promise<IteratorResult<O, undefined>> {
		try {
			if (!this.#decoder && !this.#eof) await this.#interruptible(this.#opened);
			for (;;) {
				this.#throwIfFailed();
				if (!this.#isOpen()) return DONE;

				const frame = this.#decoder?.next();
				if (frame?.type === 'data') {
					return {
						done: false,
						value: this.#method.O.fromBinary(frame.data, this.#options.binaryOptions),
					};
				}
				if (frame) return this.#finish(frame.status, frame.meta);
				if (this.#eof) {
					// A proxy can end a dropped stream cleanly, mid-frame or before the status.
					if (this.#decoder?.buffered || !this.#headerStatus) {
						throw new RpcError(
							'response ended before its status',
							code(GrpcStatusCode.UNAVAILABLE),
						);
					}
					return this.#finish(this.#headerStatus, {});
				}

				const result = await this.#interruptible(this.#read());
				this.#throwIfFailed();
				if (!this.#isOpen() || !result) return DONE;
				if (result.done) this.#eof = true;
				else this.#decoder!.push(result.value);
			}
		} catch (error) {
			if (this.#state === 'cancelled') return DONE;
			this.#fail(error);
			throw this.#failure;
		}
	}

	async #read() {
		try {
			return await this.#reader!.read();
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
		error.methodName = this.#method.name;
		error.serviceName = this.#method.service.typeName;
		this.#settle('cancelled', error);
	}

	#settle(state: 'failed' | 'cancelled', error: RpcError): void {
		this.#state = state;
		const pending = [...this.#interrupts];
		this.#interrupts.clear();
		for (const interrupt of pending) interrupt();
		this.#release();
		this.#controller.abort(error);
	}

	/** Drops the body and any bytes buffered from it, so an ended call retains neither. */
	#release(): void {
		this.#userSignal?.removeEventListener('abort', this.#onUserAbort);
		cancelQuietly(this.#reader);
		this.#reader = undefined;
		this.#decoder = undefined;
	}

	#toError(reason: unknown): RpcError {
		let error: RpcError;
		if (reason instanceof RpcError) error = reason;
		else if (this.#controller.signal.aborted) {
			// Coded from the caller's abort reason by `normalizeError`.
			error = new RpcError(abortMessage(reason), code(GrpcStatusCode.CANCELLED));
		} else {
			error = new RpcError(
				reason instanceof Error ? reason.message : String(reason),
				code(GrpcStatusCode.INTERNAL),
			);
		}
		error.methodName = this.#method.name;
		error.serviceName = this.#method.service.typeName;
		this.#normalizeError(error, this.#userSignal);
		return error;
	}
}

function abortMessage(reason: unknown): string {
	if (typeof reason === 'string') return reason;
	return reason instanceof Error ? reason.message : 'The operation was aborted';
}

function cancelQuietly(stream: { cancel(): Promise<void> } | null | undefined) {
	stream?.cancel().catch(() => {});
}
