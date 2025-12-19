// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';

describe('Core API - Clever Errors', () => {
	let toolbox: TestToolbox;
	let testAddress: string;
	let packageId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();
		packageId = await toolbox.getPackage('test_data');
	});

	describe('MoveAbort error structure', () => {
		testWithAllClients(
			'should return MoveAbort with location info via simulation',
			async (client, kind) => {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures
				tx.setSender(testAddress);
				tx.setGasOwner(testAddress);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				const coins = await toolbox.jsonRpcClient.getCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				tx.setGasPayment([
					{
						objectId: coins.data[0].coinObjectId,
						version: coins.data[0].version,
						digest: coins.data[0].digest,
					},
				]);

				const bytes = await tx.build({});

				const result = await client.core.simulateTransaction({
					transaction: bytes,
					include: { effects: true },
				});

				// Should be a FailedTransaction
				expect(result.$kind).toBe('FailedTransaction');
				expect(result.FailedTransaction!.status.success).toBe(false);

				const error = result.FailedTransaction!.status.error;
				expect(error).toBeDefined();
				expect(error?.$kind).toBe('MoveAbort');

				if (error?.$kind === 'MoveAbort') {
					const moveAbort = error.MoveAbort;

					// Should have abort code (clever errors produce computed abort codes)
					expect(moveAbort.abortCode).toBeDefined();

					// Should have location info
					expect(moveAbort.location).toBeDefined();
					expect(moveAbort.location?.module).toBe('test_objects');
					expect(moveAbort.location?.functionName).toBe('abort_with_clever_error');

					// cleverError with constantName is only available in gRPC and GraphQL
					if (kind !== 'jsonrpc') {
						expect(moveAbort.cleverError?.constantName).toBe('ETestCleverError');
					}
				}
			},
		);

		testWithAllClients(
			'executed transaction should return MoveAbort with location info',
			async (client, kind) => {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures
				tx.setSender(testAddress);
				tx.setGasOwner(testAddress);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				const bytes = await tx.build({ client: toolbox.jsonRpcClient });
				const signature = await toolbox.keypair.signTransaction(bytes);

				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
					include: { effects: true },
				});

				await client.core.waitForTransaction({
					digest: result.Transaction?.digest ?? result.FailedTransaction?.digest!,
				});

				// Should be a FailedTransaction
				expect(result.$kind).toBe('FailedTransaction');
				expect(result.FailedTransaction!.status.success).toBe(false);

				const error = result.FailedTransaction!.status.error;
				expect(error).toBeDefined();
				expect(error?.$kind).toBe('MoveAbort');

				if (error?.$kind === 'MoveAbort') {
					const moveAbort = error.MoveAbort;

					// Should have abort code (clever errors produce computed abort codes)
					expect(moveAbort.abortCode).toBeDefined();

					// Should have location info
					expect(moveAbort.location).toBeDefined();
					expect(moveAbort.location?.module).toBe('test_objects');
					expect(moveAbort.location?.functionName).toBe('abort_with_clever_error');

					// cleverError with constantName is only available in gRPC and GraphQL
					if (kind !== 'jsonrpc') {
						expect(moveAbort.cleverError?.constantName).toBe('ETestCleverError');
					}
				}
			},
		);
	});

	describe('Error message formatting', () => {
		testWithAllClients(
			'should include location info in error message for aborting transaction',
			async (client, kind) => {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures (transaction will abort)
				tx.setSender(testAddress);
				tx.setGasOwner(testAddress);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				const coins = await toolbox.jsonRpcClient.getCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				tx.setGasPayment([
					{
						objectId: coins.data[0].coinObjectId,
						version: coins.data[0].version,
						digest: coins.data[0].digest,
					},
				]);

				// Build (no resolution needed) and sign the transaction
				const bytes = await tx.build({});
				const signature = await toolbox.keypair.signTransaction(bytes);

				// Execute the transaction - should return FailedTransaction
				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
					include: { effects: true },
				});

				await client.core.waitForTransaction({
					digest: result.Transaction?.digest ?? result.FailedTransaction?.digest!,
				});

				expect(result.$kind).toBe('FailedTransaction');

				const error = result.FailedTransaction!.status.error;
				expect(error?.$kind).toBe('MoveAbort');

				if (error?.$kind === 'MoveAbort') {
					// The error message should contain useful location info
					expect(error.message).toContain('test_objects');
					expect(error.message).toContain('abort_with_clever_error');

					// cleverError message formatting is only available in gRPC and GraphQL
					if (kind !== 'jsonrpc') {
						expect(error.message).toContain('ETestCleverError');
					}
				}
			},
		);
	});

	describe('raw abort', () => {
		testWithAllClients(
			'raw abort should not have cleverError.constantName',
			async (client, _kind) => {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_always`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures
				tx.setSender(testAddress);
				tx.setGasOwner(testAddress);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				const coins = await toolbox.jsonRpcClient.getCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				tx.setGasPayment([
					{
						objectId: coins.data[0].coinObjectId,
						version: coins.data[0].version,
						digest: coins.data[0].digest,
					},
				]);

				const bytes = await tx.build({});

				const result = await client.core.simulateTransaction({
					transaction: bytes,
					include: { effects: true },
				});

				expect(result.$kind).toBe('FailedTransaction');
				const error = result.FailedTransaction!.status.error;
				expect(error?.$kind).toBe('MoveAbort');

				if (error?.$kind === 'MoveAbort') {
					// Raw abort with literal value (42) should not have a clever error constant name
					expect(error.MoveAbort.cleverError?.constantName).toBeUndefined();
					// Should have abort code 42
					expect(error.MoveAbort.abortCode).toBe('42');
					// Should have location info
					expect(error.MoveAbort.location?.module).toBe('test_objects');
					expect(error.MoveAbort.location?.functionName).toBe('abort_always');
				}
			},
		);
	});

	describe('All clients return same error message', () => {
		it('should return matching error message for raw abort', async () => {
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::abort_always`,
				arguments: [],
			});

			// Manually configure gas to bypass resolution failures
			tx.setSender(testAddress);
			tx.setGasOwner(testAddress);
			tx.setGasBudget(50_000_000);
			tx.setGasPrice(1000);

			const coins = await toolbox.jsonRpcClient.getCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});
			tx.setGasPayment([
				{
					objectId: coins.data[0].coinObjectId,
					version: coins.data[0].version,
					digest: coins.data[0].digest,
				},
			]);

			const bytes = await tx.build({});
			const signature = await toolbox.keypair.signTransaction(bytes);

			// Use expectAllClientsReturnSameData to verify message matches across clients
			await toolbox.expectAllClientsReturnSameData(async (client) => {
				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
					include: { effects: true },
				});

				await client.core.waitForTransaction({
					digest: result.Transaction?.digest ?? result.FailedTransaction?.digest!,
				});

				return result.FailedTransaction?.status.error?.message;
			});
		});
	});
});
