// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiGrpcClient } from '../../../src/grpc/index.js';
import { GetPackageRequest } from '../../../src/grpc/proto/sui/rpc/v2/move_package_service.js';

const packageId = '0x2';

function clientRecordingBodies(bodies: Uint8Array[]) {
	return new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		fetch: (async (_input: unknown, init: RequestInit) => {
			bodies.push(new Uint8Array(init.body as ArrayBuffer));

			return new Response(null, {
				status: 200,
				headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': '5' },
			});
		}) as unknown as typeof globalThis.fetch,
	});
}

describe('requests with an unset oneof', () => {
	it('sends a request built without the oneof like one built with create()', async () => {
		const bodies: Uint8Array[] = [];
		const client = clientRecordingBodies(bodies);

		// Valid before `selector` was added to `GetPackageRequest`.
		const call = client.movePackageService.getPackage({ packageId } as GetPackageRequest);
		await expect(call.response).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await client.movePackageService
			.getPackage(GetPackageRequest.create({ packageId }))
			.response.catch(() => {});

		expect(bodies).toHaveLength(2);
		expect(bodies[0]).toEqual(bodies[1]);
	});
});
