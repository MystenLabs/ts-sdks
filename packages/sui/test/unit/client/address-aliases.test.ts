// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/utils';
import { describe, expect, it, vi } from 'vitest';

import { ObjectError } from '../../../src/client/errors.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

const address = normalizeSuiAddress('0xa');

const clients = {
	grpc: () => new SuiGrpcClient({ network: 'localnet', baseUrl: 'http://localhost' }),
	graphql: () => new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' }),
};

describe('verifyZkLoginSignature', () => {
	it.each(Object.entries(clients))('checks address aliases on %s', async (_, create) => {
		const client = create();
		const verifySignature = vi
			.spyOn(client.core, 'verifySignature')
			.mockResolvedValue({ valid: false, reason: 'not authorized' } as never);

		const result = await client.core.verifyZkLoginSignature({
			bytes: toBase64(new Uint8Array([1, 2, 3])),
			signature: 'sig',
			intentScope: 'PersonalMessage',
			address,
		});

		expect(result).toEqual({ success: false, errors: ['not authorized'] });
		expect(verifySignature).toHaveBeenCalledWith(
			expect.not.objectContaining({ checkAddressAliases: false }),
		);
	});
});

describe('getAddressAliases', () => {
	function withObject(object: unknown) {
		const client = clients.grpc();
		vi.spyOn(client.core, 'getObjects').mockResolvedValue({ objects: [object] } as never);
		return client;
	}

	it('reports an account without an alias state as its own only alias', async () => {
		const client = withObject(new ObjectError('NOT_FOUND', 'missing', { reason: 'notFound' }));
		const { addressAliases } = await client.core.getAddressAliases({ address });
		expect(addressAliases).toMatchObject({ address, enabled: false, aliases: [address] });
	});

	it.each([
		['any other object error', new ObjectError('INTERNAL', 'failed', { reason: 'unknown' })],
		['any other error', new Error('failed')],
	])('throws %s rather than assuming no aliases', async (_, error) => {
		const client = withObject(error);
		await expect(client.core.getAddressAliases({ address })).rejects.toBe(error);
	});
});
