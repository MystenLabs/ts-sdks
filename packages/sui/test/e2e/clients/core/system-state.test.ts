// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';

describe('Core API - System State', () => {
	let toolbox: TestToolbox;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
	});

	describe('getCurrentSystemState', () => {
		it('all clients return same data: getCurrentSystemState', { retry: 3 }, async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.getCurrentSystemState(),
				(data) => {
					return {
						...data,
						systemState: {
							...data.systemState,
							epochStartTimestampMs: '<normalized>',
						},
					};
				},
			);
		});

		testWithAllClients('should get complete system state', async (client) => {
			const result = await client.core.getCurrentSystemState();

			expect(result.systemState).toBeDefined();
			expect(result.systemState.epoch).toBeDefined();
			expect(result.systemState.systemStateVersion).toBeDefined();
			expect(result.systemState.protocolVersion).toBeDefined();
			expect(result.systemState.referenceGasPrice).toBeDefined();
			expect(result.systemState.epochStartTimestampMs).toBeDefined();

			expect(typeof result.systemState.epoch).toBe('string');
			expect(typeof result.systemState.systemStateVersion).toBe('string');
			expect(typeof result.systemState.protocolVersion).toBe('string');
			expect(typeof result.systemState.referenceGasPrice).toBe('string');
			expect(typeof result.systemState.epochStartTimestampMs).toBe('string');
			expect(typeof result.systemState.safeMode).toBe('boolean');

			const epoch = BigInt(result.systemState.epoch);
			expect(epoch).toBeGreaterThanOrEqual(0n);

			const gasPrice = BigInt(result.systemState.referenceGasPrice);
			expect(gasPrice).toBeGreaterThan(0n);
		});

		testWithAllClients('should have valid system parameters', async (client) => {
			const result = await client.core.getCurrentSystemState();
			const params = result.systemState.parameters;

			expect(params).toBeDefined();
			expect(params.epochDurationMs).toBeDefined();
			expect(params.stakeSubsidyStartEpoch).toBeDefined();
			expect(params.maxValidatorCount).toBeDefined();
			expect(params.minValidatorJoiningStake).toBeDefined();
			expect(params.validatorLowStakeThreshold).toBeDefined();
			expect(params.validatorLowStakeGracePeriod).toBeDefined();

			expect(typeof params.epochDurationMs).toBe('string');
			expect(typeof params.stakeSubsidyStartEpoch).toBe('string');
			expect(typeof params.maxValidatorCount).toBe('string');
			expect(typeof params.minValidatorJoiningStake).toBe('string');
			expect(typeof params.validatorLowStakeThreshold).toBe('string');
			expect(typeof params.validatorLowStakeGracePeriod).toBe('string');

			const epochDuration = BigInt(params.epochDurationMs);
			expect(epochDuration).toBeGreaterThan(0n);

			const maxValidators = BigInt(params.maxValidatorCount);
			expect(maxValidators).toBeGreaterThan(0n);
		});

		testWithAllClients('should have valid storage fund', async (client) => {
			const result = await client.core.getCurrentSystemState();
			const storageFund = result.systemState.storageFund;

			expect(storageFund).toBeDefined();
			expect(storageFund.totalObjectStorageRebates).toBeDefined();
			expect(storageFund.nonRefundableBalance).toBeDefined();

			expect(typeof storageFund.totalObjectStorageRebates).toBe('string');
			expect(typeof storageFund.nonRefundableBalance).toBe('string');

			const rebates = BigInt(storageFund.totalObjectStorageRebates);
			expect(rebates).toBeGreaterThanOrEqual(0n);
		});

		testWithAllClients('should have valid stake subsidy', async (client) => {
			const result = await client.core.getCurrentSystemState();
			const stakeSubsidy = result.systemState.stakeSubsidy;

			expect(stakeSubsidy).toBeDefined();
			expect(stakeSubsidy.balance).toBeDefined();
			expect(stakeSubsidy.distributionCounter).toBeDefined();
			expect(stakeSubsidy.currentDistributionAmount).toBeDefined();
			expect(stakeSubsidy.stakeSubsidyPeriodLength).toBeDefined();
			expect(stakeSubsidy.stakeSubsidyDecreaseRate).toBeDefined();

			expect(typeof stakeSubsidy.balance).toBe('string');
			expect(typeof stakeSubsidy.distributionCounter).toBe('string');
			expect(typeof stakeSubsidy.currentDistributionAmount).toBe('string');
			expect(typeof stakeSubsidy.stakeSubsidyPeriodLength).toBe('string');
			expect(typeof stakeSubsidy.stakeSubsidyDecreaseRate).toBe('number');

			const balance = BigInt(stakeSubsidy.balance);
			expect(balance).toBeGreaterThanOrEqual(0n);
		});

		testWithAllClients('should have safe mode fields', async (client) => {
			const result = await client.core.getCurrentSystemState();

			expect(result.systemState.safeMode).toBeDefined();
			expect(result.systemState.safeModeStorageRewards).toBeDefined();
			expect(result.systemState.safeModeComputationRewards).toBeDefined();
			expect(result.systemState.safeModeStorageRebates).toBeDefined();
			expect(result.systemState.safeModeNonRefundableStorageFee).toBeDefined();

			expect(typeof result.systemState.safeMode).toBe('boolean');
			expect(typeof result.systemState.safeModeStorageRewards).toBe('string');
			expect(typeof result.systemState.safeModeComputationRewards).toBe('string');
			expect(typeof result.systemState.safeModeStorageRebates).toBe('string');
			expect(typeof result.systemState.safeModeNonRefundableStorageFee).toBe('string');
		});

		testWithAllClients('should return consistent data across multiple calls', async (client) => {
			const result1 = await client.core.getCurrentSystemState();
			const result2 = await client.core.getCurrentSystemState();

			expect(result1.systemState.epoch).toBe(result2.systemState.epoch);
			expect(result1.systemState.referenceGasPrice).toBe(result2.systemState.referenceGasPrice);
			expect(result1.systemState.parameters.epochDurationMs).toBe(
				result2.systemState.parameters.epochDurationMs,
			);
		});
	});
});
