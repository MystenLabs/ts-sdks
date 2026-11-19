// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** A `fetch` that passes each request to `record` and answers with a trailers-only `NOT_FOUND`. */
export function recordingFetch(record: (init: RequestInit) => void) {
	return (async (_input: unknown, init: RequestInit) => {
		record(init);
		return new Response(null, {
			status: 200,
			headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': '5' },
		});
	}) as unknown as typeof globalThis.fetch;
}
