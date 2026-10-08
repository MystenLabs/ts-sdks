// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

test('the published client entry point has no external runtime dependencies', async () => {
	// Check actual module loading without tree shaking. In particular, importing the
	// API client must not initialize the zkLogin/Poseidon code used by wallet helpers.
	const hooks = registerHooks({
		resolve(specifier, context, nextResolve) {
			assert.ok(
				specifier === '@mysten/enoki/client' ||
					specifier.startsWith('.') ||
					specifier.startsWith('file:'),
				`Unexpected runtime dependency: ${specifier}`,
			);
			return nextResolve(specifier, context);
		},
	});

	try {
		const client = await import('@mysten/enoki/client');
		assert.deepEqual(Object.keys(client).sort(), ['EnokiClient', 'EnokiClientError']);
		assert.equal(typeof client.EnokiClient, 'function');
		assert.equal(typeof client.EnokiClientError, 'function');
	} finally {
		hooks.deregister();
	}
});

test('the client entry point preserves the root constructor identities', async () => {
	const client = await import('@mysten/enoki/client');
	const root = await import('@mysten/enoki');
	assert.equal(client.EnokiClient, root.EnokiClient);
	assert.equal(client.EnokiClientError, root.EnokiClientError);
});
