// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export interface Resolvers<T = any> {
	promise: Promise<T>;
	reject: (error: Error) => void;
	resolve: (value: T) => void;
}

export function withResolvers<T = any>(): Resolvers<T> {
	let resolve: (value: T) => void;
	let reject: (error: Error) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject: reject!, resolve: resolve! };
}

export function getClientMetadata() {
	return {
		version: 'v1',
		originUrl: window.location.href,
		userAgent: navigator.userAgent,
		screenResolution: `${window.screen.width}x${window.screen.height}`,
		language: navigator.language,
		platform: navigator.platform,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timestamp: Date.now(),
	};
}
