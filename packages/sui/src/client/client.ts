// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Simplify, UnionToIntersection } from '@mysten/utils';
import { ClientCache } from './cache.js';
import type { CoreClient } from './core.js';
import type { ClientWithExtensions, SuiClientTypes, SuiClientRegistration } from './types.js';

export abstract class BaseClient {
	network: SuiClientTypes.Network;
	cache: ClientCache;
	base: BaseClient;

	constructor({
		network,
		base,
		cache = base?.cache ?? new ClientCache(),
	}: SuiClientTypes.SuiClientOptions) {
		this.network = network;
		this.base = base ?? this;
		this.cache = cache;
	}

	abstract core: CoreClient;

	$extend<const Registrations extends SuiClientRegistration<this>[]>(
		...registrations: Registrations
	) {
		const extensions: Record<string, unknown> = Object.fromEntries(
			registrations.map((registration) => {
				return [registration.name, registration.register(this)];
			}),
		);

		const methodCache = new Map<string | symbol, Function>();

		return new Proxy(this, {
			get(target, prop, receiver) {
				if (typeof prop === 'string' && prop in extensions) {
					return extensions[prop];
				}
				const value = Reflect.get(target, prop, receiver);
				if (typeof value === 'function') {
					if (prop === '$extend') {
						return value.bind(receiver);
					}
					if (!methodCache.has(prop)) {
						methodCache.set(prop, value.bind(target));
					}
					return methodCache.get(prop);
				}
				return value;
			},
		}) as ClientWithExtensions<
			Simplify<
				UnionToIntersection<
					{
						[K in keyof Registrations]: Registrations[K] extends SuiClientRegistration<
							this,
							infer Name extends string,
							infer Extension
						>
							? {
									[K2 in Name]: Extension;
								}
							: never;
					}[number]
				>
			>,
			this
		>;
	}
}
