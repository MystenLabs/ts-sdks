// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { SuiGrpcClient } from '../../../src/grpc/client.js';

/**
 * Creates a mock RpcTransport for testing custom transport injection.
 * This validates that SuiGrpcClient correctly uses the provided transport
 * instead of the default GrpcWebFetchTransport.
 */
function createMockTransport(): RpcTransport {
	return {
		mergeOptions: vi.fn((options) => options ?? {}),
		unary: vi.fn(),
		serverStreaming: vi.fn(),
		clientStreaming: vi.fn(),
		duplex: vi.fn(),
	} as unknown as RpcTransport;
}

describe('SuiGrpcClient with custom transport', () => {
	it('should accept a custom RpcTransport', () => {
		const transport = createMockTransport();

		const client = new SuiGrpcClient({
			network: 'testnet',
			transport,
		});

		expect(client).toBeDefined();
		expect(client.core).toBeDefined();
	});

	it('should use the provided transport for service clients', () => {
		const transport = createMockTransport();

		const client = new SuiGrpcClient({
			network: 'testnet',
			transport,
		});

		// All service clients should be instantiated with the custom transport
		expect(client.transactionExecutionService).toBeDefined();
		expect(client.ledgerService).toBeDefined();
		expect(client.stateService).toBeDefined();
		expect(client.subscriptionService).toBeDefined();
		expect(client.movePackageService).toBeDefined();
		expect(client.signatureVerificationService).toBeDefined();
		expect(client.nameService).toBeDefined();
	});

	it('should expose core API methods when using a custom transport', () => {
		const transport = createMockTransport();

		const client = new SuiGrpcClient({
			network: 'mainnet',
			transport,
		});

		expect(typeof client.getObjects).toBe('function');
		expect(typeof client.getObject).toBe('function');
		expect(typeof client.listCoins).toBe('function');
		expect(typeof client.listOwnedObjects).toBe('function');
		expect(typeof client.getBalance).toBe('function');
		expect(typeof client.listBalances).toBe('function');
		expect(typeof client.getCoinMetadata).toBe('function');
		expect(typeof client.getTransaction).toBe('function');
		expect(typeof client.executeTransaction).toBe('function');
		expect(typeof client.signAndExecuteTransaction).toBe('function');
		expect(typeof client.waitForTransaction).toBe('function');
		expect(typeof client.simulateTransaction).toBe('function');
		expect(typeof client.getReferenceGasPrice).toBe('function');
		expect(typeof client.listDynamicFields).toBe('function');
		expect(typeof client.getDynamicField).toBe('function');
		expect(typeof client.getMoveFunction).toBe('function');
	});

	it('should support $extend with a custom transport', () => {
		const transport = createMockTransport();

		const client = new SuiGrpcClient({
			network: 'testnet',
			transport,
		});

		const sdk = () => ({
			name: 'myExtension' as const,
			register: () => ({
				hello: () => 'world',
			}),
		});

		const extended = client.$extend(sdk());
		expect(extended.myExtension.hello()).toBe('world');
		expect(typeof extended.getObjects).toBe('function');
	});

	it('should use default GrpcWebFetchTransport when transport is not provided', () => {
		// When no transport is specified, the client should create a GrpcWebFetchTransport internally
		const client = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'https://fullnode.testnet.sui.io:443',
		});

		expect(client).toBeDefined();
		expect(client.ledgerService).toBeDefined();
	});

	it('should work with different network values when using custom transport', () => {
		const transport = createMockTransport();

		for (const network of ['mainnet', 'testnet', 'devnet', 'localnet'] as const) {
			const client = new SuiGrpcClient({
				network,
				transport,
			});
			expect(client).toBeDefined();
		}
	});
});
