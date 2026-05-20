// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { SuiGrpcClient, GrpcWebFetchTransport } from '../../../../src/grpc/index.js';
import { getJsonRpcFullnodeUrl } from '../../../../src/jsonRpc/index.js';
import { setup, TestToolbox } from '../../utils/setup.js';

// @protobuf-ts/grpc-transport and @grpc/grpc-js are optional native gRPC dependencies.
// Dynamic import so the test file loads even when they are not installed.
let GrpcTransport: typeof import('@protobuf-ts/grpc-transport').GrpcTransport | undefined;
let ChannelCredentials: typeof import('@grpc/grpc-js').ChannelCredentials | undefined;

try {
	({ GrpcTransport } = await import('@protobuf-ts/grpc-transport'));
	({ ChannelCredentials } = await import('@grpc/grpc-js'));
} catch {
	// not installed — tests that need these will be skipped
}

/**
 * E2E tests verifying that SuiGrpcClient works correctly with both the default
 * gRPC-web transport and the native gRPC transport against localnet.
 *
 * These tests ensure that core API methods return consistent results regardless
 * of which transport is used.
 */

describe('gRPC transport variants', () => {
	let toolbox: TestToolbox;
	let nativeGrpcClient: SuiGrpcClient | undefined;
	let grpcWebCustomClient: SuiGrpcClient;

	beforeAll(async () => {
		toolbox = await setup();

		const fullnodeUrl = new URL(import.meta.env.FULLNODE_URL ?? getJsonRpcFullnodeUrl('localnet'));
		const host = `${fullnodeUrl.hostname}:${fullnodeUrl.port}`;

		if (GrpcTransport && ChannelCredentials) {
			const nativeTransport = new GrpcTransport({
				host,
				channelCredentials: ChannelCredentials.createInsecure(),
			});

			nativeGrpcClient = new SuiGrpcClient({
				network: 'localnet',
				transport: nativeTransport,
			});
		}

		// Also create one using the re-exported GrpcWebFetchTransport as a custom transport
		const grpcWebTransport = new GrpcWebFetchTransport({
			baseUrl: `http://${host}`,
		});

		grpcWebCustomClient = new SuiGrpcClient({
			network: 'localnet',
			transport: grpcWebTransport,
		});
	});

	describe('getObject', () => {
		it.skipIf(!GrpcTransport)('native gRPC transport returns object data', async () => {
			const { object } = await nativeGrpcClient!.getObject({
				objectId: '0x0000000000000000000000000000000000000000000000000000000000000002',
			});

			expect(object).toBeDefined();
			expect(object).not.toBeInstanceOf(Error);
			if (!(object instanceof Error)) {
				expect(object.objectId).toBe(
					'0x0000000000000000000000000000000000000000000000000000000000000002',
				);
				expect(object.type).toBe('package');
			}
		});

		it.skipIf(!GrpcTransport)(
			'native gRPC and default gRPC-web return the same object data',
			async () => {
				const objectId = '0x0000000000000000000000000000000000000000000000000000000000000002';

				const [webResult, nativeResult] = await Promise.all([
					toolbox.grpcClient.getObject({ objectId }),
					nativeGrpcClient!.getObject({ objectId }),
				]);

				expect(webResult.object).not.toBeInstanceOf(Error);
				expect(nativeResult.object).not.toBeInstanceOf(Error);

				if (!(webResult.object instanceof Error) && !(nativeResult.object instanceof Error)) {
					expect(nativeResult.object.objectId).toBe(webResult.object.objectId);
					expect(nativeResult.object.version).toBe(webResult.object.version);
					expect(nativeResult.object.digest).toBe(webResult.object.digest);
					expect(nativeResult.object.type).toBe(webResult.object.type);
				}
			},
		);
	});

	describe('getBalance', () => {
		it.skipIf(!GrpcTransport)('native gRPC transport returns balance', async () => {
			const { balance } = await nativeGrpcClient!.getBalance({
				owner: toolbox.address(),
			});

			expect(balance).toBeDefined();
			expect(balance.coinType).toContain('sui::SUI');
			expect(typeof balance.balance).toBe('string');
		});

		it.skipIf(!GrpcTransport)(
			'native gRPC and default gRPC-web return the same balance',
			async () => {
				const owner = toolbox.address();

				const [webResult, nativeResult] = await Promise.all([
					toolbox.grpcClient.getBalance({ owner }),
					nativeGrpcClient!.getBalance({ owner }),
				]);

				expect(nativeResult.balance.balance).toBe(webResult.balance.balance);
				expect(nativeResult.balance.coinType).toBe(webResult.balance.coinType);
			},
		);
	});

	describe('getReferenceGasPrice', () => {
		it.skipIf(!GrpcTransport)('native gRPC transport returns gas price', async () => {
			const result = await nativeGrpcClient!.getReferenceGasPrice();

			expect(result).toBeDefined();
			expect(typeof result.referenceGasPrice).toBe('string');
			expect(BigInt(result.referenceGasPrice)).toBeGreaterThan(0n);
		});

		it.skipIf(!GrpcTransport)(
			'native gRPC and default gRPC-web return the same gas price',
			async () => {
				const [webResult, nativeResult] = await Promise.all([
					toolbox.grpcClient.getReferenceGasPrice(),
					nativeGrpcClient!.getReferenceGasPrice(),
				]);

				expect(nativeResult.referenceGasPrice).toBe(webResult.referenceGasPrice);
			},
		);
	});

	describe('getObjects (batch)', () => {
		it.skipIf(!GrpcTransport)('native gRPC transport returns multiple objects', async () => {
			const { objects } = await nativeGrpcClient!.getObjects({
				objectIds: [
					'0x0000000000000000000000000000000000000000000000000000000000000002',
					'0x0000000000000000000000000000000000000000000000000000000000000001',
				],
			});

			expect(objects).toHaveLength(2);
			for (const obj of objects) {
				expect(obj).not.toBeInstanceOf(Error);
			}
		});

		it.skipIf(!GrpcTransport)(
			'native gRPC and default gRPC-web return the same objects',
			async () => {
				const objectIds = [
					'0x0000000000000000000000000000000000000000000000000000000000000002',
					'0x0000000000000000000000000000000000000000000000000000000000000001',
				];

				const [webResult, nativeResult] = await Promise.all([
					toolbox.grpcClient.getObjects({ objectIds }),
					nativeGrpcClient!.getObjects({ objectIds }),
				]);

				expect(nativeResult.objects).toHaveLength(webResult.objects.length);
				for (let i = 0; i < webResult.objects.length; i++) {
					const web = webResult.objects[i];
					const native = nativeResult.objects[i];
					expect(web).not.toBeInstanceOf(Error);
					expect(native).not.toBeInstanceOf(Error);
					if (!(web instanceof Error) && !(native instanceof Error)) {
						expect(native.objectId).toBe(web.objectId);
						expect(native.version).toBe(web.version);
						expect(native.digest).toBe(web.digest);
					}
				}
			},
		);
	});

	describe('re-exported GrpcWebFetchTransport', () => {
		it('works as a custom transport', async () => {
			const result = await grpcWebCustomClient.getReferenceGasPrice();

			expect(result).toBeDefined();
			expect(BigInt(result.referenceGasPrice)).toBeGreaterThan(0n);
		});

		it('returns the same data as the default client', async () => {
			const owner = toolbox.address();

			const [defaultResult, customResult] = await Promise.all([
				toolbox.grpcClient.getBalance({ owner }),
				grpcWebCustomClient.getBalance({ owner }),
			]);

			expect(customResult.balance.balance).toBe(defaultResult.balance.balance);
		});
	});
});
