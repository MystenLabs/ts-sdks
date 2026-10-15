// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*
 * Request construction and header/trailer parsing use the public helpers of
 * `@protobuf-ts/grpcweb-transport`. Content type parsing, base64 handling, frame extraction and
 * call settlement are adapted from `@protobuf-ts/grpcweb-transport` 2.11.1
 * (`grpc-web-format.ts`, `grpc-web-transport.ts`), Copyright (c) Timo Stamm, licensed under the
 * Apache License, Version 2.0: https://github.com/timostamm/protobuf-ts
 *
 * Unlike upstream, the body is read one chunk at a time while the consumer waits for a message,
 * frames are decoded one at a time, received chunks are not concatenated, declared frame sizes
 * are checked before their payload is buffered (an oversized frame is a non-retryable
 * `RESOURCE_EXHAUSTED`), compressed frames are rejected, request serialization failures are
 * reported as `INTERNAL` before any request is sent, and fetch or body failures are reported as
 * `UNAVAILABLE`.
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

import { markNonRetryable } from './pull.js';
import type { ServerStreamingIterableCall } from './pull.js';

export const DEFAULT_MAX_RESPONSE_MESSAGE_BYTES = 64 * 1024 * 1024;

type BodyReader = {
	read(): Promise<{ done?: boolean; value?: Uint8Array }>;
	cancel(): unknown;
};

const code = (status: GrpcStatusCode) => GrpcStatusCode[status];

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

// `node-fetch` bodies are Node streams, which are async iterable.
function bodyReader(body: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>): BodyReader {
	if ('getReader' in body) {
		const reader = body.getReader();
		return { read: () => reader.read(), cancel: () => reader.cancel() };
	}
	const iterator = body[Symbol.asyncIterator]();
	return { read: () => iterator.next(), cancel: () => iterator.return?.() };
}

/** Received bytes as a list of chunks, so a frame is copied only when it spans chunks. */
class ByteQueue {
	#chunks: Uint8Array[] = [];
	#offset = 0;
	length = 0;

	push(chunk: Uint8Array) {
		if (chunk.length === 0) return;
		this.#chunks.push(chunk);
		this.length += chunk.length;
	}

	byteAt(index: number): number {
		let i = index + this.#offset;
		for (const chunk of this.#chunks) {
			if (i < chunk.length) return chunk[i];
			i -= chunk.length;
		}
		throw new RangeError('index out of range');
	}

	take(n: number): Uint8Array {
		const first = this.#chunks[0];
		if (first && first.length - this.#offset >= n) {
			const out = first.subarray(this.#offset, this.#offset + n);
			this.#advance(n);
			return out;
		}
		const out = new Uint8Array(n);
		let written = 0;
		while (written < n) {
			const chunk = this.#chunks[0];
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
		while (this.#chunks.length && this.#offset >= this.#chunks[0].length) {
			this.#offset -= this.#chunks[0].length;
			this.#chunks.shift();
		}
	}
}

function nextFrame(
	queue: ByteQueue,
	maxBytes: number,
): { type: GrpcWebFrame; data: Uint8Array } | undefined {
	if (queue.length < 5) return undefined;
	const flag = queue.byteAt(0);
	if (flag !== GrpcWebFrame.DATA && flag !== GrpcWebFrame.TRAILER) {
		throw new RpcError(
			flag & 1 ? 'compressed grpc-web frames are not supported' : `unknown grpc-web frame ${flag}`,
			code(GrpcStatusCode.INTERNAL),
		);
	}
	const length =
		((queue.byteAt(1) << 24) |
			(queue.byteAt(2) << 16) |
			(queue.byteAt(3) << 8) |
			queue.byteAt(4)) >>>
		0;
	if (length > maxBytes) {
		// The same message would be sent again on retry, so it is not retryable.
		throw markNonRetryable(
			new RpcError(
				`grpc-web frame of ${length} bytes exceeds the ${maxBytes} byte limit`,
				code(GrpcStatusCode.RESOURCE_EXHAUSTED),
			),
		);
	}
	if (queue.length - 5 < length) return undefined;
	queue.take(5);
	return { type: flag, data: queue.take(length) };
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

export interface GrpcWebPullOptions extends GrpcWebOptions {
	maxResponseMessageBytes?: number;
}

/**
 * Sends a gRPC-web server-streaming request and returns a call whose body is read, and messages
 * decoded, only while the consumer waits on `responses.next()`. `normalizeError` is applied to
 * every error the call surfaces.
 */
export function grpcWebServerStreamingIterable<I extends object, O extends object>(
	method: MethodInfo<I, O>,
	input: I,
	url: string,
	options: GrpcWebPullOptions,
	normalizeError: (error: RpcError, signal: AbortSignal | undefined) => void,
): ServerStreamingIterableCall<I, O> {
	const format = options.format ?? 'text';
	const fetch = options.fetch ?? globalThis.fetch;
	const maxBytes = options.maxResponseMessageBytes ?? DEFAULT_MAX_RESPONSE_MESSAGE_BYTES;
	const userSignal = options.abort;

	// Serialized before the request, outside the network error boundary, so an invalid request is
	// reported as `INTERNAL` rather than as a retryable network failure.
	let requestBody: BodyInit | undefined;
	let requestHeaders: Headers | undefined;
	let requestError: RpcError | undefined;
	try {
		requestBody = createGrpcWebRequestBody(
			method.I.toBinary(input, options.binaryOptions),
			format,
		) as BodyInit;
		requestHeaders = createGrpcWebRequestHeader(
			new globalThis.Headers(),
			format,
			options.timeout,
			options.meta,
		);
	} catch (error) {
		requestError =
			error instanceof RpcError
				? error
				: new RpcError(
						`failed to serialize request: ${error instanceof Error ? error.message : String(error)}`,
						code(GrpcStatusCode.INTERNAL),
					);
	}

	const headers = new Deferred<RpcMetadata>();
	const status = new Deferred<RpcStatus>();
	const trailers = new Deferred<RpcMetadata>();

	// Aborted by the caller's signal, by `return()` and on failure, so the request is released even
	// when nothing is pulling.
	const controller = new AbortController();
	const onUserAbort = () => controller.abort(userSignal!.reason);

	type State = 'open' | 'done' | 'failed' | 'cancelled';
	let state: State = 'open';
	// A call, so TypeScript does not narrow `state` across awaits.
	const phase = (): State => state;
	let failure: RpcError | undefined;
	let reader: BodyReader | undefined;
	let headerStatus: RpcStatus | undefined;
	let text = false;
	let base64Pending = '';
	let eof = false;
	let sawMessage = false;
	const queue = new ByteQueue();
	// One callback per in-flight `interruptible` operation, run when the call fails or is cancelled.
	const interrupts = new Set<() => void>();

	/**
	 * Settles with `operation`, or with `undefined` once the call fails or is cancelled, so a read
	 * does not wait on a fetch or body that ignores the abort signal. Its interrupt callback is
	 * removed as soon as `operation` settles, so nothing keeps a settled read's result alive.
	 */
	const interruptible = <T>(operation: Promise<T>): Promise<T | undefined> =>
		new Promise<T | undefined>((resolve, reject) => {
			if (state !== 'open') return resolve(undefined);
			const interrupt = () => resolve(undefined);
			interrupts.add(interrupt);
			operation.then(
				(value) => {
					interrupts.delete(interrupt);
					resolve(value);
				},
				(error: unknown) => {
					interrupts.delete(interrupt);
					reject(error);
				},
			);
		});

	const toError = (reason: unknown): RpcError => {
		const error =
			reason instanceof RpcError
				? reason
				: controller.signal.aborted
					? new RpcError(reasonMessage(reason), code(GrpcStatusCode.CANCELLED))
					: new RpcError(
							reason instanceof Error ? reason.message : String(reason),
							code(GrpcStatusCode.INTERNAL),
						);
		error.methodName = method.name;
		error.serviceName = method.service.typeName;
		normalizeError(error, userSignal);
		return error;
	};

	const release = () => {
		userSignal?.removeEventListener('abort', onUserAbort);
		const current = reader;
		reader = undefined;
		try {
			void Promise.resolve(current?.cancel()).catch(() => {});
		} catch {
			// Already released.
		}
	};

	const settle = (next: 'failed' | 'cancelled', error: RpcError) => {
		state = next;
		const pending = [...interrupts];
		interrupts.clear();
		for (const interrupt of pending) interrupt();
		headers.rejectPending(error);
		status.rejectPending(error);
		trailers.rejectPending(error);
		release();
		controller.abort(error);
	};

	const fail = (reason: unknown): RpcError => {
		if (state !== 'open') return failure ?? toError(reason);
		failure = toError(reason);
		settle('failed', failure);
		return failure;
	};

	// Some fetch implementations do not error the body on abort, so pending reads are interrupted by
	// `fail()`. Registered before an already-aborted caller signal is applied, so that abort fails the
	// call too.
	controller.signal.addEventListener('abort', () => fail(controller.signal.reason), { once: true });
	if (userSignal?.aborted) controller.abort(userSignal.reason);
	else userSignal?.addEventListener('abort', onUserAbort, { once: true });

	// A failed fetch or body read is retryable, unlike a server status, a protocol violation or a
	// decode error.
	const network = async <T>(run: () => Promise<T>): Promise<T> => {
		try {
			return await run();
		} catch (error) {
			if (error instanceof RpcError || controller.signal.aborted) throw error;
			throw new RpcError(
				error instanceof Error ? error.message : 'Network stream failed',
				code(GrpcStatusCode.UNAVAILABLE),
			);
		}
	};

	const opened = (async () => {
		if (requestError) throw requestError;
		if (phase() !== 'open') return;
		const response = await network(() =>
			fetch(url, {
				...options.fetchInit,
				method: 'POST',
				headers: requestHeaders,
				body: requestBody,
				signal: controller.signal,
			}),
		);
		const body = response.body as ReadableStream<Uint8Array> | AsyncIterable<Uint8Array> | null;
		const discard = () => {
			if (body) void Promise.resolve(bodyReader(body).cancel()).catch(() => {});
		};
		if (phase() !== 'open') return discard();
		try {
			const [statusCode, detail, meta] = readGrpcWebResponseHeader(response);
			headers.resolvePending(meta);
			if (statusCode != null && statusCode !== GrpcStatusCode.OK) {
				throw new RpcError(detail ?? code(statusCode), code(statusCode), meta);
			}
			if (statusCode != null) headerStatus = { code: code(statusCode), detail: detail ?? 'OK' };
			if (!body) {
				if (headerStatus) eof = true;
				else throw new RpcError('missing response body', code(GrpcStatusCode.INTERNAL));
				return;
			}
			text = isTextFormat(response.headers.get('content-type'));
		} catch (error) {
			discard();
			throw error;
		}
		reader = bodyReader(body);
		if (phase() !== 'open') release();
	})();
	opened.catch((error) => fail(error));

	const append = (chunk: Uint8Array) => {
		if (!text) return queue.push(chunk);
		// Whole base64 quanta are decoded; the rest waits for the next chunk.
		for (let i = 0; i < chunk.length; i++) base64Pending += String.fromCharCode(chunk[i]);
		const safe = base64Pending.length - (base64Pending.length % 4);
		if (safe === 0) return;
		queue.push(base64decode(base64Pending.substring(0, safe)));
		base64Pending = base64Pending.substring(safe);
	};

	const finish = (meta: RpcMetadata | undefined, final: RpcStatus) => {
		if (state !== 'open') return;
		if (final.code !== 'OK') throw new RpcError(final.detail, final.code, meta);
		state = 'done';
		status.resolve(final);
		trailers.resolve(meta ?? {});
		release();
	};

	const done = { done: true, value: undefined } as const;

	// Checked after every await: throws the call's failure, or says it has otherwise ended. A failure
	// is never replaced by a later frame.
	const ended = (): boolean => {
		if (phase() === 'failed') throw failure;
		return phase() !== 'open';
	};

	const pull = async (): Promise<IteratorResult<O, undefined>> => {
		if (ended()) return done;
		try {
			await interruptible(opened);
			for (;;) {
				if (ended()) return done;
				const frame = nextFrame(queue, maxBytes);
				if (frame?.type === GrpcWebFrame.DATA) {
					sawMessage = true;
					return { done: false, value: method.O.fromBinary(frame.data, options.binaryOptions) };
				}
				if (frame?.type === GrpcWebFrame.TRAILER) {
					const [statusCode, detail, meta] = readGrpcWebResponseTrailer(frame.data);
					finish(meta, { code: code(statusCode), detail: detail ?? code(statusCode) });
					return done;
				}
				if (eof) {
					if (queue.length > 0 || base64Pending.length > 0) {
						throw new RpcError('premature EOF', code(GrpcStatusCode.DATA_LOSS));
					}
					if (sawMessage) throw new RpcError('missing trailers', code(GrpcStatusCode.DATA_LOSS));
					if (!headerStatus) throw new RpcError('missing status', code(GrpcStatusCode.INTERNAL));
					finish(undefined, headerStatus);
					return done;
				}
				const result = await interruptible(network(() => reader!.read()));
				if (ended() || !result) return done;
				if (result.done) eof = true;
				if (result.value !== undefined) append(result.value);
			}
		} catch (error) {
			if (phase() === 'cancelled') return done;
			throw phase() === 'failed' ? failure : fail(error);
		}
	};

	// `next()` calls are serialized; `return()` is not, so it can cancel a pending read.
	let tail: Promise<unknown> = Promise.resolve();
	const responses: AsyncIterableIterator<O> = {
		[Symbol.asyncIterator]() {
			return this;
		},
		next() {
			const result = tail.then(pull);
			tail = result.catch(() => {});
			return result;
		},
		async return() {
			if (state === 'open') {
				const error = new RpcError('stream cancelled by consumer', code(GrpcStatusCode.CANCELLED));
				error.methodName = method.name;
				error.serviceName = method.service.typeName;
				settle('cancelled', error);
			}
			return done;
		},
	};

	return {
		method,
		requestHeaders: options.meta ?? {},
		request: input,
		responses,
		headers: headers.promise,
		status: status.promise,
		trailers: trailers.promise,
	};
}
