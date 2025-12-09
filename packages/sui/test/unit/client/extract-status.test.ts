// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { bcs } from '../../../src/bcs/index.js';
import { extractStatusFromEffectsBcs } from '../../../src/client/utils.js';

describe('extractStatusFromEffectsBcs', () => {
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
	// Base58 encoded 32-byte zero digest
	const ZERO_DIGEST = '11111111111111111111111111111111';

	// Helper to create a minimal valid V2 effects with success status
	function createSuccessEffectsV2(): Uint8Array {
		return bcs.TransactionEffects.serialize({
			V2: {
				status: { Success: true },
				executedEpoch: 1n,
				gasUsed: {
					computationCost: 1000n,
					storageCost: 500n,
					storageRebate: 100n,
					nonRefundableStorageFee: 0n,
				},
				transactionDigest: ZERO_DIGEST,
				gasObjectIndex: null,
				eventsDigest: null,
				dependencies: [],
				lamportVersion: 1n,
				changedObjects: [],
				unchangedSharedObjects: [],
				auxDataDigest: null,
			},
		}).toBytes();
	}

	// Helper to create a minimal valid V2 effects with failure status
	function createFailureEffectsV2(): Uint8Array {
		return bcs.TransactionEffects.serialize({
			V2: {
				status: {
					Failed: {
						error: { InsufficientGas: true },
						command: null,
					},
				},
				executedEpoch: 1n,
				gasUsed: {
					computationCost: 1000n,
					storageCost: 500n,
					storageRebate: 100n,
					nonRefundableStorageFee: 0n,
				},
				transactionDigest: ZERO_DIGEST,
				gasObjectIndex: null,
				eventsDigest: null,
				dependencies: [],
				lamportVersion: 1n,
				changedObjects: [],
				unchangedSharedObjects: [],
				auxDataDigest: null,
			},
		}).toBytes();
	}

	// Helper to create a minimal valid V1 effects with success status
	function createSuccessEffectsV1(): Uint8Array {
		return bcs.TransactionEffects.serialize({
			V1: {
				status: { Success: true },
				executedEpoch: 1n,
				gasUsed: {
					computationCost: 1000n,
					storageCost: 500n,
					storageRebate: 100n,
					nonRefundableStorageFee: 0n,
				},
				modifiedAtVersions: [],
				sharedObjects: [],
				transactionDigest: ZERO_DIGEST,
				created: [],
				mutated: [],
				unwrapped: [],
				deleted: [],
				unwrappedThenDeleted: [],
				wrapped: [],
				gasObject: [
					{
						objectId: ZERO_ADDRESS,
						version: 1n,
						digest: ZERO_DIGEST,
					},
					{ AddressOwner: ZERO_ADDRESS },
				],
				eventsDigest: null,
				dependencies: [],
			},
		}).toBytes();
	}

	// Helper to create a minimal valid V1 effects with failure status
	function createFailureEffectsV1(): Uint8Array {
		return bcs.TransactionEffects.serialize({
			V1: {
				status: {
					Failed: {
						error: { InsufficientGas: true },
						command: null,
					},
				},
				executedEpoch: 1n,
				gasUsed: {
					computationCost: 1000n,
					storageCost: 500n,
					storageRebate: 100n,
					nonRefundableStorageFee: 0n,
				},
				modifiedAtVersions: [],
				sharedObjects: [],
				transactionDigest: ZERO_DIGEST,
				created: [],
				mutated: [],
				unwrapped: [],
				deleted: [],
				unwrappedThenDeleted: [],
				wrapped: [],
				gasObject: [
					{
						objectId: ZERO_ADDRESS,
						version: 1n,
						digest: ZERO_DIGEST,
					},
					{ AddressOwner: ZERO_ADDRESS },
				],
				eventsDigest: null,
				dependencies: [],
			},
		}).toBytes();
	}

	// Helper to create a V2 effects with error data
	function createFailureEffectsV2WithData(): Uint8Array {
		return bcs.TransactionEffects.serialize({
			V2: {
				status: {
					Failed: {
						error: {
							MoveObjectTooBig: {
								objectSize: 1000000n,
								maxObjectSize: 500000n,
							},
						},
						command: null,
					},
				},
				executedEpoch: 1n,
				gasUsed: {
					computationCost: 1000n,
					storageCost: 500n,
					storageRebate: 100n,
					nonRefundableStorageFee: 0n,
				},
				transactionDigest: ZERO_DIGEST,
				gasObjectIndex: null,
				eventsDigest: null,
				dependencies: [],
				lamportVersion: 1n,
				changedObjects: [],
				unchangedSharedObjects: [],
				auxDataDigest: null,
			},
		}).toBytes();
	}

	describe('V2 effects', () => {
		it('should extract success status from V2 effects', () => {
			const effectsBytes = createSuccessEffectsV2();
			const status = extractStatusFromEffectsBcs(effectsBytes);

			expect(status.success).toBe(true);
			expect(status.error).toBeNull();
		});

		it('should extract failure status from V2 effects with detailed error', () => {
			const effectsBytes = createFailureEffectsV2();
			const status = extractStatusFromEffectsBcs(effectsBytes);

			expect(status.success).toBe(false);
			// Simple error without data - just the kind
			expect(status.error).toBe('InsufficientGas');
		});

		it('should extract failure status with error data as JSON', () => {
			const effectsBytes = createFailureEffectsV2WithData();
			const status = extractStatusFromEffectsBcs(effectsBytes);

			expect(status.success).toBe(false);
			// Error with data - serialized as JSON
			expect(status.error).toBe(
				'MoveObjectTooBig({"objectSize":"1000000","maxObjectSize":"500000"})',
			);
		});
	});

	describe('V1 effects', () => {
		it('should extract success status from V1 effects', () => {
			const effectsBytes = createSuccessEffectsV1();
			const status = extractStatusFromEffectsBcs(effectsBytes);

			expect(status.success).toBe(true);
			expect(status.error).toBeNull();
		});

		it('should extract failure status from V1 effects with detailed error', () => {
			const effectsBytes = createFailureEffectsV1();
			const status = extractStatusFromEffectsBcs(effectsBytes);

			expect(status.success).toBe(false);
			// We get the detailed error type from the ExecutionStatus BCS type
			expect(status.error).toBe('InsufficientGas');
		});
	});

	describe('error handling', () => {
		it('should throw for unknown effects version', () => {
			// Create an invalid effects with version 99
			const invalidBytes = new Uint8Array([99, 0, 0, 0]);

			expect(() => extractStatusFromEffectsBcs(invalidBytes)).toThrow(
				'Unknown value 99 for enum MinimalTransactionEffects',
			);
		});
	});
});
