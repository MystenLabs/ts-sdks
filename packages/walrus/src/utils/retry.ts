// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		condition?: (error: Error) => boolean;
		count?: number;
		delay?: number;
		jitter?: number;
	},
): Promise<T> {
	let remaining = options.count ?? 3;

	while (remaining > 0) {
		try {
			remaining -= 1;
			return await fn();
		} catch (error) {
			if (remaining <= 0 || (options.condition && !options.condition(error as Error))) {
				throw error;
			}

			if (options.delay) {
				await new Promise((resolve) =>
					setTimeout(
						resolve,
						(options.delay ?? 1000) + (options.jitter ? Math.random() * options.jitter : 0),
					),
				);
			}
		}
	}

	// Should never be reached
	throw new Error('Retry count exceeded');
}
