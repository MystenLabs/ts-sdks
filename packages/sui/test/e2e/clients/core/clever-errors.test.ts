// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import { SimulationError } from '../../../../src/client/index.js';

/** Replace dynamic package addresses with a stable placeholder for snapshot matching. */
function normalizeAddress(message: string): string {
	return message.replace(/0x[0-9a-f]{64}/gi, '0x<PACKAGE>');
}

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
			async (client) => {
				const { address } = await toolbox.getSigner({ coins: [1_000_000_000n] });
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures
				tx.setSender(address);
				tx.setGasOwner(address);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				const coins = await toolbox.grpcClient.core.listCoins({
					owner: address,
					coinType: SUI_TYPE_ARG,
				});
				tx.setGasPayment([
					{
						objectId: coins.objects[0].objectId,
						version: coins.objects[0].version,
						digest: coins.objects[0].digest,
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

					expect(moveAbort.cleverError?.constantName).toBe('ETestCleverError');
				}
			},
		);

		testWithAllClients(
			'executed transaction should return MoveAbort with location info',
			async (client) => {
				const { keypair, address } = await toolbox.getSigner({ coins: [1_000_000_000n] });
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures
				tx.setSender(address);
				tx.setGasOwner(address);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				// The client-side resolver skips simulation once a gas budget is set, so the abort
				// is only observed on execution
				const bytes = await tx.build({ client: toolbox.clientResolverGrpcClient });
				const signature = await keypair.signTransaction(bytes);

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

					expect(moveAbort.cleverError?.constantName).toBe('ETestCleverError');
				}
			},
		);
	});

	describe('Error message formatting', () => {
		testWithAllClients(
			'should include location info in error message for aborting transaction',
			async (client) => {
				const { keypair, address } = await toolbox.getSigner({ coins: [1_000_000_000n] });
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});

				// Manually configure gas to bypass resolution failures (transaction will abort)
				tx.setSender(address);
				tx.setGasOwner(address);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				const coins = await toolbox.grpcClient.core.listCoins({
					owner: address,
					coinType: SUI_TYPE_ARG,
				});
				tx.setGasPayment([
					{
						objectId: coins.objects[0].objectId,
						version: coins.objects[0].version,
						digest: coins.objects[0].digest,
					},
				]);

				// Build (no resolution needed) and sign the transaction
				const bytes = await tx.build({});
				const signature = await keypair.signTransaction(bytes);

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

					expect(error.message).toContain('ETestCleverError');
				}
			},
		);
	});

	describe('raw abort', () => {
		testWithAllClients('raw abort should not have cleverError.constantName', async (client) => {
			const { address } = await toolbox.getSigner({ coins: [1_000_000_000n] });
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::abort_always`,
				arguments: [],
			});

			// Manually configure gas to bypass resolution failures
			tx.setSender(address);
			tx.setGasOwner(address);
			tx.setGasBudget(50_000_000);
			tx.setGasPrice(1000);

			const coins = await toolbox.grpcClient.core.listCoins({
				owner: address,
				coinType: SUI_TYPE_ARG,
			});
			tx.setGasPayment([
				{
					objectId: coins.objects[0].objectId,
					version: coins.objects[0].version,
					digest: coins.objects[0].digest,
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
		});
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

			const coins = await toolbox.grpcClient.core.listCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});
			tx.setGasPayment([
				{
					objectId: coins.objects[0].objectId,
					version: coins.objects[0].version,
					digest: coins.objects[0].digest,
				},
			]);

			const bytes = await tx.build({});
			const signature = await toolbox.keypair.signTransaction(bytes);

			// Use expectAllClientsReturnSameData to verify message matches across clients.
			// Normalize addresses since BCS uses runtime package address while GraphQL uses published address.
			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const result = await client.core.executeTransaction({
						transaction: bytes,
						signatures: [signature.signature],
						include: { effects: true },
					});

					await client.core.waitForTransaction({
						digest: result.Transaction?.digest ?? result.FailedTransaction?.digest!,
					});

					return result.FailedTransaction?.status.error?.message;
				},
				(message) => normalizeAddress(message ?? ''),
			);
		});
	});

	describe('SimulationError during transaction build', () => {
		testWithAllClients(
			'build() should throw SimulationError with clever error info when simulation fails',
			async (client) => {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});
				tx.setSender(testAddress);
				// Set empty gas payment to disable gas coin selection, and set gas budget so
				// doGasSelection is fully disabled and the simulation returns structured effects
				// even when the transaction aborts.
				tx.setGasBudget(50_000_000);
				tx.setGasPayment([]);

				const buildError = await tx.build({ client }).catch((e) => e);

				expect(buildError).toBeInstanceOf(SimulationError);

				const normalized = normalizeAddress(buildError.message);
				expect(normalized).toMatchInlineSnapshot(
					`"Transaction resolution failed: MoveAbort in 1st command, 'ETestCleverError': Test clever error message, in '0x<PACKAGE>::test_objects::abort_with_clever_error' (line 163)"`,
				);

				// Should have structured executionError attached
				const executionError = buildError.executionError;
				expect(executionError?.$kind).toBe('MoveAbort');

				if (executionError?.$kind === 'MoveAbort') {
					expect(executionError.MoveAbort.abortCode).toBeDefined();
					expect(executionError.MoveAbort.location?.module).toBe('test_objects');
					expect(executionError.MoveAbort.location?.functionName).toBe('abort_with_clever_error');

					expect(executionError.MoveAbort.cleverError?.constantName).toBe('ETestCleverError');
				}
			},
		);

		testWithAllClients(
			'build() should throw SimulationError with raw abort info',
			async (client) => {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_always`,
					arguments: [],
				});
				tx.setSender(testAddress);
				// Set budget to disable gas selection
				tx.setGasBudget(50_000_000);
				tx.setGasPayment([]);

				const buildError = await tx.build({ client }).catch((e) => e);

				expect(buildError).toBeInstanceOf(SimulationError);

				const normalized = normalizeAddress(buildError.message);

				expect(normalized).toMatchInlineSnapshot(
					`"Transaction resolution failed: MoveAbort in 1st command, abort code: 42, in '0x<PACKAGE>::test_objects::abort_always' (instruction 1)"`,
				);

				const executionError = buildError.executionError;
				expect(executionError?.$kind).toBe('MoveAbort');

				if (executionError?.$kind === 'MoveAbort') {
					expect(executionError.MoveAbort.abortCode).toBe('42');
					expect(executionError.MoveAbort.location?.module).toBe('test_objects');
					expect(executionError.MoveAbort.location?.functionName).toBe('abort_always');
					expect(executionError.MoveAbort.cleverError?.constantName).toBeUndefined();
				}
			},
		);
	});

	describe('SimulationError during signAndExecuteTransaction', () => {
		testWithAllClients(
			'signAndExecuteTransaction should throw SimulationError with structured error data',
			async (client) => {
				const { keypair } = await toolbox.getSigner({ coins: [1_000_000_000n] });
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_with_clever_error`,
					arguments: [],
				});
				// Set budget to disable gas selection
				tx.setGasBudget(50_000_000);
				tx.setGasPayment([]);

				const executeError = await client.core
					.signAndExecuteTransaction({
						transaction: tx,
						signer: keypair,
					})
					.catch((e) => e);

				expect(executeError).toBeInstanceOf(SimulationError);

				const normalized = normalizeAddress(executeError.message);
				expect(normalized).toMatchInlineSnapshot(
					`"Transaction resolution failed: MoveAbort in 1st command, 'ETestCleverError': Test clever error message, in '0x<PACKAGE>::test_objects::abort_with_clever_error' (line 163)"`,
				);

				const executionError = executeError.executionError;
				expect(executionError?.$kind).toBe('MoveAbort');

				if (executionError?.$kind === 'MoveAbort') {
					expect(executionError.MoveAbort.location?.module).toBe('test_objects');
					expect(executionError.MoveAbort.location?.functionName).toBe('abort_with_clever_error');
				}
			},
		);
	});
});
