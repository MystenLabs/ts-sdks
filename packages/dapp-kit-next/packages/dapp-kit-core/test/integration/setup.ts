// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach } from 'vitest';

export function suppressFetchErrorsDuringTeardown() {
	let isTearingDown = false;
	let inFetchErrorContext = false;

	const originalStderrWrite = process.stderr.write;

	const FETCH_ERROR_PATTERNS = [
		/Error fetching metadata/i,
		/DOMException.*NetworkError.*fetch/i,
		/Fetch\.(onError|onAsyncTaskManagerAbort)/,
		/Failed to execute.*fetch.*on.*Window/i,
		/The operation was aborted/i,
	];

	const STACK_TRACE_PATTERNS = [
		/^\s*at\s+/,
		/^\[90m/, // ANSI colored stack traces
	];

	const filteredStderrWrite = function (
		this: NodeJS.WriteStream,
		chunk: any,
		encoding?: BufferEncoding,
		cb?: (err?: Error | null) => void,
	): boolean {
		const message = String(chunk);

		if (!isTearingDown) {
			return originalStderrWrite.call(this, chunk, encoding as any, cb as any);
		}

		const isFetchError = FETCH_ERROR_PATTERNS.some((pattern) => pattern.test(message));

		if (isFetchError) {
			inFetchErrorContext = true;
			if (cb) cb();
			return true;
		}

		if (inFetchErrorContext) {
			const isStackTrace = STACK_TRACE_PATTERNS.some((pattern) => pattern.test(message));
			if (isStackTrace) {
				if (cb) cb();
				return true;
			} else {
				inFetchErrorContext = false;
			}
		}

		return originalStderrWrite.call(this, chunk, encoding as any, cb as any);
	};

	beforeEach(() => {
		isTearingDown = false;
		inFetchErrorContext = false;
		process.stderr.write = filteredStderrWrite as any;
	});

	afterEach(() => {
		isTearingDown = true;

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				isTearingDown = false;
				inFetchErrorContext = false;
				process.stderr.write = originalStderrWrite;
				resolve();
			}, 150);
		});
	});
}
