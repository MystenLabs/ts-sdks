// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';
import { ChannelCredentials } from '@grpc/grpc-js';

import { SuiGrpcClient, GrpcWebFetchTransport } from '../../../../src/grpc/index.js';

/**
 * E2E tests verifying that SuiGrpcClient works correctly with both the default
 * gRPC-web transport and the native gRPC transport against testnet.
 *
 * These tests ensure that core API methods return consistent results regardless
 * of which transport is used.
 */

const TESTNET_GRPC_URL = 'https://fullnode.testnet.sui.io:443';
const TESTNET_GRPC_HOST = 'fullnode.testnet.sui.io:443';

// The Sui framework package — always exists on all networks
const SUI_FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';

describe('gRPC transport variants', () => {
	let grpcWebClient: SuiGrpcClient;
	let nativeGrpcClient: SuiGrpcClient;

	beforeAll(() => {
		grpcWebClient = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: TESTNET_GRPC_URL,
		});

		const nativeTransport = new GrpcTransport({
			host: TESTNET_GRPC_HOST,
			channelCredentials: ChannelCredentials.createSsl(),
		});

		nativeGrpcClient = new SuiGrpcClient({
			network: 'testnet',
			transport: nativeTransport,
		});
	});

	describe('getObject', () => {
		it('native gRPC transport returns object data', async () => {
			const { object } = await nativeGrpcClient.getObject({
				objectId: SUI_FRAMEWORK,
			});

			expect(object).toBeDefined();
			expect(object).not.toBeInstanceOf(Error);
			if (!(object instanceof Error)) {
				expect(object.objectId).toBe(SUI_FRAMEWORK);
				expect(object.type).toBe('package');
			}
		});

		it('both transports return the same object data', async () => {
			const [webResult, nativeResult] = await Promise.all([
				grpcWebClient.getObject({ objectId: SUI_FRAMEWORK }),
				nativeGrpcClient.getObject({ objectId: SUI_FRAMEWORK }),
			]);

			expect(webResult.object).not.toBeInstanceOf(Error);
			expect(nativeResult.object).not.toBeInstanceOf(Error);

			if (!(webResult.object instanceof Error) && !(nativeResult.object instanceof Error)) {
				expect(nativeResult.object.objectId).toBe(webResult.object.objectId);
				expect(nativeResult.object.version).toBe(webResult.object.version);
				expect(nativeResult.object.digest).toBe(webResult.object.digest);
				expect(nativeResult.object.type).toBe(webResult.object.type);
			}
		});
	});

	describe('getBalance', () => {
		it('native gRPC transport returns balance', async () => {
			const { balance } = await nativeGrpcClient.getBalance({
				owner: SUI_FRAMEWORK,
			});

			expect(balance).toBeDefined();
			expect(balance.coinType).toContain('sui::SUI');
			expect(typeof balance.balance).toBe('string');
		});

		it('both transports return the same balance', async () => {
			const [webResult, nativeResult] = await Promise.all([
				grpcWebClient.getBalance({ owner: SUI_FRAMEWORK }),
				nativeGrpcClient.getBalance({ owner: SUI_FRAMEWORK }),
			]);

			expect(nativeResult.balance.balance).toBe(webResult.balance.balance);
			expect(nativeResult.balance.coinType).toBe(webResult.balance.coinType);
		});
	});

	describe('getReferenceGasPrice', () => {
		it('native gRPC transport returns gas price', async () => {
			const result = await nativeGrpcClient.getReferenceGasPrice();

			expect(result).toBeDefined();
			expect(typeof result.referenceGasPrice).toBe('string');
			expect(BigInt(result.referenceGasPrice)).toBeGreaterThan(0n);
		});

		it('both transports return the same gas price', async () => {
			const [webResult, nativeResult] = await Promise.all([
				grpcWebClient.getReferenceGasPrice(),
				nativeGrpcClient.getReferenceGasPrice(),
			]);

			expect(nativeResult.referenceGasPrice).toBe(webResult.referenceGasPrice);
		});
	});

	describe('getCoinMetadata', () => {
		it('native gRPC transport returns SUI coin metadata', async () => {
			const { coinMetadata } = await nativeGrpcClient.getCoinMetadata({
				coinType: '0x2::sui::SUI',
			});

			expect(coinMetadata).not.toBeNull();
			expect(coinMetadata?.name).toBe('Sui');
			expect(coinMetadata?.symbol).toBe('SUI');
			expect(coinMetadata?.decimals).toBe(9);
		});

		it('both transports return the same coin metadata', async () => {
			const [webResult, nativeResult] = await Promise.all([
				grpcWebClient.getCoinMetadata({ coinType: '0x2::sui::SUI' }),
				nativeGrpcClient.getCoinMetadata({ coinType: '0x2::sui::SUI' }),
			]);

			expect(nativeResult.coinMetadata).toEqual(webResult.coinMetadata);
		});
	});

	describe('getObjects (batch)', () => {
		it('native gRPC transport returns multiple objects', async () => {
			const { objects } = await nativeGrpcClient.getObjects({
				objectIds: [
					SUI_FRAMEWORK,
					'0x0000000000000000000000000000000000000000000000000000000000000001',
				],
			});

			expect(objects).toHaveLength(2);
			for (const obj of objects) {
				expect(obj).not.toBeInstanceOf(Error);
			}
		});

		it('both transports return the same objects', async () => {
			const objectIds = [
				SUI_FRAMEWORK,
				'0x0000000000000000000000000000000000000000000000000000000000000001',
			];

			const [webResult, nativeResult] = await Promise.all([
				grpcWebClient.getObjects({ objectIds }),
				nativeGrpcClient.getObjects({ objectIds }),
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
		});
	});

	describe('custom GrpcWebFetchTransport re-export', () => {
		it('re-exported GrpcWebFetchTransport works as custom transport', async () => {
			const transport = new GrpcWebFetchTransport({
				baseUrl: TESTNET_GRPC_URL,
			});

			const client = new SuiGrpcClient({
				network: 'testnet',
				transport,
			});

			const result = await client.getReferenceGasPrice();
			expect(result).toBeDefined();
			expect(BigInt(result.referenceGasPrice)).toBeGreaterThan(0n);
		});
	});
});
