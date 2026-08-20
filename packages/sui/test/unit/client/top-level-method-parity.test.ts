// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { GraphQLCoreClient } from '../../../src/graphql/core.js';
import { SuiGraphQLClient } from '../../../src/graphql/client.js';
import { GrpcCoreClient } from '../../../src/grpc/core.js';
import { SuiGrpcClient } from '../../../src/grpc/client.js';

/**
 * Methods that intentionally stay on `client.core`. `resolveTransactionPlugin` is an internal hook
 * the transaction builder calls rather than something application code reaches for.
 */
const CORE_ONLY_METHODS = new Set(['resolveTransactionPlugin']);

/**
 * Collect the methods callable on `client.core`.
 *
 * The abstract members of `CoreClient` emit nothing at runtime, so enumerating the abstract class
 * would see only its composed methods. Walking a concrete implementation's prototype chain picks up
 * both: the transport's own implementations and the composed methods it inherits.
 */
function coreApiMethods(CoreClass: new (...args: never[]) => unknown) {
	const methods = new Set<string>();

	for (
		let proto = CoreClass.prototype;
		proto && proto !== Object.prototype;
		proto = Object.getPrototypeOf(proto)
	) {
		for (const name of Object.getOwnPropertyNames(proto)) {
			if (name === 'constructor' || CORE_ONLY_METHODS.has(name)) {
				continue;
			}

			// Getters are properties rather than API methods, and reading a descriptor avoids
			// invoking them.
			const descriptor = Object.getOwnPropertyDescriptor(proto, name);
			if (typeof descriptor?.value === 'function') {
				methods.add(name);
			}
		}
	}

	return [...methods].sort();
}

describe.each([
	['SuiGrpcClient', SuiGrpcClient, GrpcCoreClient],
	['SuiGraphQLClient', SuiGraphQLClient, GraphQLCoreClient],
])('%s top-level method parity', (_name, ClientClass, CoreClass) => {
	const methods = coreApiMethods(CoreClass);

	it('finds the Core API surface to compare against', () => {
		// Guards the enumeration itself: if the prototype walk stops seeing methods, the parity
		// assertion below would pass vacuously.
		expect(methods.length).toBeGreaterThan(15);
		expect(methods).toContain('getChainIdentifier');
	});

	it('exposes every Core API method as a top-level method', () => {
		const prototype = ClientClass.prototype as unknown as Record<string, unknown>;
		const missing = methods.filter((method) => typeof prototype[method] !== 'function');

		// Core API methods are forwarded by hand, so a method added to the Core API without a
		// matching forward is reachable only through client.core. Add the forward rather than
		// relaxing this assertion.
		expect(missing).toEqual([]);
	});
});
