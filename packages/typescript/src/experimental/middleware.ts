// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClient } from '../client/index.js';
import type { Experimental_SuiClientTypes } from './types.js';

type MiddlewareFunction = <Args extends unknown[], Return extends unknown>(
	scope: string,
	method: string,
	args: Args,
	next: (...args: Args) => Promise<Return>,
) => Promise<Return>;

export class ClientMiddlewareStack {
	#middleware: MiddlewareFunction[] = [];

	use(middleware: MiddlewareFunction) {
		if (this.#middleware.includes(middleware)) {
			throw new Error(`Middleware ${middleware.name} is already registered`);
		}
		this.#middleware.push(middleware);
	}

	wrap<Args extends unknown[], Return extends unknown>(
		scope: string,
		name: string,
		fn: (...args: Args) => Promise<Return>,
	) {
		const stack = this;
		return function <T>(this: T, ...args: Args) {
			return stack.run(scope, name, fn, this, args);
		};
	}

	run<Args extends unknown[], Return extends unknown>(
		scope: string,
		name: string,
		fn: (...args: Args) => Promise<Return>,
		ctx: unknown,
		args: Args,
	) {
		const createNext = (i: number) => {
			let calledNext = false;

			return async (...args: Args): Promise<Return> => {
				if (calledNext) {
					throw new Error(`next() was call multiple times`);
				}

				calledNext = true;

				if (i >= this.#middleware.length) {
					return fn.apply(ctx, args);
				}

				const middleware = this.#middleware[i];
				return middleware(scope, name, args, async (...args) => createNext(i + 1)(...args));
			};
		};

		return createNext(0)(...args);
	}
}

new SuiClient({
	network: 'mainnet',
	url: 'https://fullnode.mainnet.sui.io',
}).middleware.use(async (scope, name, args, next) => {
	if (scope === 'core' && name === 'getObjects') {
		const [options] = args as unknown as [Experimental_SuiClientTypes.GetObjectsOptions];

		return next(
			...([
				{
					...options,
					objectIds: await resolveMvrTypes(options.objectIds),
				},
			] as never),
		);
	}

	return next(...args);
});
