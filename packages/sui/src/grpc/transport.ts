// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport as UpstreamGrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type {
	MethodInfo,
	RpcOptions,
	ServerStreamingCall,
	UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Marks an error whose message has already been decoded. One failed call rejects its headers,
 * response, status and trailers with the *same* error object, so without a marker a message that
 * legitimately reads `a%20b` would be rewritten once per promise.
 *
 * This records a property of the message, not of the call: whether text has already been decoded
 * does not depend on who is asking. Nothing call-specific is stored on the error — {@link
 * applyAbortStatus} re-derives its answer every time.
 */
const MESSAGE_DECODED = Symbol('@mysten/sui/grpc/decoded-status-message');

/**
 * `grpc-message` is percent-encoded on the wire, and `GrpcWebFetchTransport` reads the header
 * verbatim (https://github.com/timostamm/protobuf-ts/pull/739, and the same complaint in
 * https://github.com/timostamm/protobuf-ts/issues/631), so status text otherwise reaches callers as
 * `Object%20not%20found%3A%200x1` — or, for a non-ASCII message, as raw UTF-8 escapes.
 *
 * Decoding exactly once is right, because the server escapes a literal `%` as `%25`: tonic 0.14 —
 * what a Sui node serves gRPC with — percent-encodes control bytes plus ``  " # % < > ` ? { }  ``,
 * so `gas budget 100%25 consumed` is readable text and `read_mask path: a%2520b` really does end in
 * `a%20b`. Not every encoder is that careful (tonic 0.12 left `%` unescaped), so a message that
 * fails to decode is kept verbatim rather than failing a call over its status text.
 */
export function decodeGrpcStatusMessage(message: string): string {
	if (!message.includes('%')) return message;

	try {
		return decodeURIComponent(message);
	} catch {
		return message;
	}
}

function decodeStatusMessageOnce(error: RpcError): void {
	if (MESSAGE_DECODED in error) return;
	Object.defineProperty(error, MESSAGE_DECODED, { value: true, configurable: true });

	error.message = decodeGrpcStatusMessage(error.message);
}

/** What one call was aborted by, as opposed to what happened to be aborted when it failed. */
interface CallAbort {
	/** The signal the call runs against: the caller's, the deadline below, or both composed. */
	signal: AbortSignal | undefined;
	/** The deadline this transport imposed for `options.timeout`, if it imposed one. */
	deadline: AbortSignal | undefined;
}

/**
 * Whether this error *is* the abort, rather than a failure that arrived while the call happened to
 * be aborted.
 *
 * `signal.aborted` alone does not establish that. A call's headers resolve before a later
 * server-side failure propagates, so a caller that aborts in a headers continuation — or simply
 * races a truncated connection — would otherwise have a real `INTERNAL` rewritten as a
 * cancellation. The transport rethrows the abort reason's own message verbatim, so carrying that
 * message is what ties the failure to the abort.
 */
function isAbortFailure(error: RpcError, signal: AbortSignal): boolean {
	const reason = signal.reason as { message?: unknown } | null | undefined;

	return typeof reason?.message === 'string' && error.message === reason.message;
}

/**
 * Whether the abort was a deadline expiring rather than someone cancelling.
 *
 * The deadline this transport composed is known by identity, not inferred: `AbortSignal.any`
 * forwards the reason of whichever source fired, so comparing against it says which one did. A
 * caller's own `AbortSignal.timeout` is a deadline too, and is recognised by its platform
 * `DOMException` — which `Object.assign(new Error(), { name: 'TimeoutError' })` is not.
 */
function isDeadlineAbort({ signal, deadline }: CallAbort): boolean {
	if (deadline?.aborted && signal?.reason === deadline.reason) return true;

	return signal?.reason instanceof DOMException && signal.reason.name === 'TimeoutError';
}

/**
 * Codes a call that ended because its own signal aborted.
 *
 * The transport codes an aborted call `CANCELLED` only when the abort reason is an `AbortError`.
 * `AbortSignal.timeout` aborts with a `TimeoutError`, and `AbortController.abort(reason)` takes an
 * arbitrary reason, so both fall through to `INTERNAL` — indistinguishable from a server-side
 * failure, and retried as one. A deadline is a deadline exceeded; every other abort is a
 * cancellation.
 *
 * Idempotent without recording anything: the same call and signal always reach the same answer.
 */
function applyAbortStatus(error: RpcError, abort: CallAbort): void {
	if (!abort.signal?.aborted || !isAbortFailure(error, abort.signal)) return;

	// An abort reason that was itself an `RpcError` reaches the caller with the code they gave it,
	// and a status the server answered with describes the failure better than the abort does.
	if (
		error.code !== GrpcStatusCode[GrpcStatusCode.INTERNAL] &&
		error.code !== GrpcStatusCode[GrpcStatusCode.CANCELLED]
	) {
		return;
	}

	error.code = isDeadlineAbort(abort)
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
}

/**
 * Makes a transport error readable and correctly coded, in place.
 *
 * Mutating rather than re-wrapping keeps `instanceof RpcError`, trailing metadata, the service and
 * method names and the original stack, and means every promise a call rejects — plus its response
 * stream — surfaces the same normalized error.
 */
function normalizeGrpcError(error: unknown, abort: CallAbort): void {
	if (!(error instanceof RpcError)) return;

	// Coded before decoding, because provenance is established by comparing against the abort
	// reason's message, and decoding rewrites the message being compared.
	applyAbortStatus(error, abort);
	decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], abort: CallAbort) {
	for (const promise of promises) {
		// Registered before the call is handed back, so this runs ahead of any consumer's continuation
		// and the consumer's own `await` sees the rewritten error. Swallowing here is what the handler
		// is for: the original promise still rejects for whoever awaits it.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, abort));
	}
}

/**
 * Turns `options.timeout` into a deadline this client enforces, by composing one into the signal
 * the call aborts on.
 *
 * The base transport only puts `timeout` in the `grpc-timeout` header, which a node honours but
 * which does nothing when the connection itself stalls: the call then hangs for as long as the
 * fetch does. Sending the header as well is still right — the server should stop working on a
 * request nobody is waiting for.
 *
 * Nothing is written to the options passed in. `mergeRpcOptions` returns the transport's own
 * `defaultOptions` *by reference* when a generated method is called without call options, so
 * assigning `abort` here would pin one call's deadline to every later call the client makes.
 */
function withDeadline(options: RpcOptions): { options: RpcOptions; abort: CallAbort } {
	if (options.timeout == null) {
		return { options, abort: { signal: options.abort, deadline: undefined } };
	}

	const durationMs =
		typeof options.timeout === 'number' ? options.timeout : options.timeout.getTime() - Date.now();

	// An expired deadline is the base transport's to reject, which it does before sending anything.
	if (durationMs <= 0) {
		return { options, abort: { signal: options.abort, deadline: undefined } };
	}

	const deadline = AbortSignal.timeout(durationMs);
	const signal = options.abort ? AbortSignal.any([options.abort, deadline]) : deadline;

	return { options: { ...options, abort: signal }, abort: { signal, deadline } };
}

/**
 * The grpc-web transport `@mysten/sui` ships: `@protobuf-ts/grpcweb-transport`'s, subclassed to
 * repair three defects it has as of 2.11.1 — status text arrives decoded, a call cut short by its
 * own signal is coded `DEADLINE_EXCEEDED` or `CANCELLED` rather than `INTERNAL`, and `timeout` is a
 * deadline this client enforces rather than one it only advertises to the server.
 *
 * Both belong to the transport — it is the layer that reads the wire — so this is where
 * `SuiGrpcClient` applies them, and every consumer of a call is served by one pass: `client.core`,
 * the generated service clients, a response stream and any interceptor the caller installed.
 *
 * This is what `@mysten/sui/grpc` exports under this name and what `SuiGrpcClient` builds by
 * default from the options it is given. Construct it directly to share one transport between
 * clients, or to subclass it further, and pass it as `transport`. A transport imported from
 * `@protobuf-ts/grpcweb-transport` itself still behaves the way that package behaves; the client
 * does not reach into a transport it was handed.
 */
export class GrpcWebFetchTransport extends UpstreamGrpcWebFetchTransport {
	override unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): UnaryCall<I, O> {
		const { options: callOptions, abort } = withDeadline(options);
		const call = super.unary(method, input, callOptions);

		normalizeRejections([call.headers, call.response, call.status, call.trailers], abort);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		// A stream is bounded only if the caller asked for it to be: nothing here invents a deadline,
		// so a subscription left without a `timeout` runs until it or the node ends it.
		const { options: callOptions, abort } = withDeadline(options);
		const call = super.serverStreaming(method, input, callOptions);

		// grpc-web pushes a failure into the response stream, and a finite stream is often consumed
		// through `responses` alone, without awaiting `status`. Listeners run synchronously when the
		// stream errors, so this rewrites the error before a `for await` resumes on it.
		call.responses.onError((error) => normalizeGrpcError(error, abort));
		normalizeRejections([call.headers, call.status, call.trailers], abort);

		return call;
	}
}
