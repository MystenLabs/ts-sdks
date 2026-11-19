// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { MethodInfo, RpcTransport } from '@protobuf-ts/runtime-rpc';

import { SuiGrpcClient } from '../../../src/grpc/index.js';
import {
	GetPackageRequest,
	MovePackageService,
} from '../../../src/grpc/proto/sui/rpc/v2/move_package_service.js';
import { pullServerStreaming } from '../../../src/grpc/pull-call.js';
import { withClientDefaults } from '../../../src/grpc/transport.js';
import { recordingFetch } from './recording-fetch.js';

const packageId = '0x2';
const getPackage = MovePackageService.methods.find(
	(method) => method.name === 'GetPackage',
) as MethodInfo<GetPackageRequest, object>;

function clientRecordingBodies(bodies: Uint8Array[]) {
	return new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		fetch: recordingFetch((init) => {
			bodies.push(new Uint8Array(init.body as ArrayBuffer));
		}),
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

	it('sends an on-demand stream request built without the oneof like one built with create()', async () => {
		const bodies: Uint8Array[] = [];
		const client = clientRecordingBodies(bodies);
		const pull = pullServerStreaming(client.movePackageService['_transport'])!;

		// Valid before `selector` was added to `GetPackageRequest`.
		for (const request of [
			{ packageId } as GetPackageRequest,
			GetPackageRequest.create({ packageId }),
		]) {
			await expect(pull(getPackage, request).responses.next()).rejects.toMatchObject({
				code: 'NOT_FOUND',
			});
		}

		expect(bodies).toHaveLength(2);
		expect(bodies[0]).toEqual(bodies[1]);
	});

	describe('with a caller-supplied transport', () => {
		function recordingTransport(inputs: object[]): RpcTransport {
			const record = (_method: unknown, input: object) => {
				inputs.push(input);
				throw new Error('sent');
			};

			return {
				mergeOptions: (options) => options ?? {},
				unary: record,
				serverStreaming: record,
				clientStreaming: record,
				duplex: record,
			} as RpcTransport;
		}

		it('passes the request through create() for a unary call', () => {
			const inputs: object[] = [];
			const client = new SuiGrpcClient({
				network: 'testnet',
				transport: recordingTransport(inputs),
			});

			expect(() =>
				client.movePackageService.getPackage({ packageId } as GetPackageRequest),
			).toThrow('sent');
			expect(inputs).toEqual([GetPackageRequest.create({ packageId })]);
			expect((inputs[0] as GetPackageRequest).selector.oneofKind).toBeUndefined();
		});

		it('passes the request through create() for a server-streaming call', () => {
			const inputs: object[] = [];
			const transport = withClientDefaults(recordingTransport(inputs));

			expect(() =>
				transport.serverStreaming(getPackage, { packageId } as GetPackageRequest, {}),
			).toThrow('sent');
			expect(inputs).toEqual([GetPackageRequest.create({ packageId })]);
		});
	});
});
