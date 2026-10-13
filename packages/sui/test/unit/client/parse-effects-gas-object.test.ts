// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { parseTransactionEffects } from '../../../src/grpc/core.js';
import type { TransactionEffects as GrpcTransactionEffects } from '../../../src/grpc/proto/sui/rpc/v2/effects.js';
import {
	ChangedObject_IdOperation,
	ChangedObject_InputObjectState,
	ChangedObject_OutputObjectState,
} from '../../../src/grpc/proto/sui/rpc/v2/effects.js';

const GAS_OBJECT_ID = '0x00000000000000000000000000000000000000000000000000000000000000c0';

describe('gRPC parseTransactionEffects gasObject', () => {
	function grpcEffects(
		gasObject: Partial<GrpcTransactionEffects['gasObject']> | undefined,
	): GrpcTransactionEffects {
		return {
			status: { success: true },
			gasUsed: {
				computationCost: 100n,
				storageCost: 200n,
				storageRebate: 300n,
				nonRefundableStorageFee: 0n,
			},
			transactionDigest: 'tx-digest',
			gasObject,
			dependencies: [],
			lamportVersion: 5n,
			changedObjects: [],
			unchangedConsensusObjects: [],
		} as unknown as GrpcTransactionEffects;
	}

	it('returns null when the node reports no gas object', () => {
		// Gas paid from an address balance settles against the accumulator, so
		// the node leaves gas_object unset.
		const effects = parseTransactionEffects({ effects: grpcEffects(undefined) });

		expect(effects?.gasObject).toBeNull();
	});

	it('maps the gas object when the node reports one', () => {
		const effects = parseTransactionEffects({
			effects: grpcEffects({
				objectId: GAS_OBJECT_ID,
				inputState: ChangedObject_InputObjectState.EXISTS,
				inputVersion: 4n,
				inputDigest: 'input-digest',
				outputState: ChangedObject_OutputObjectState.OBJECT_WRITE,
				outputVersion: 5n,
				outputDigest: 'output-digest',
				idOperation: ChangedObject_IdOperation.NONE,
			}),
		});

		expect(effects?.gasObject).toEqual({
			objectId: GAS_OBJECT_ID,
			inputState: 'Exists',
			inputVersion: '4',
			inputDigest: 'input-digest',
			inputOwner: null,
			outputState: 'ObjectWrite',
			outputVersion: '5',
			outputDigest: 'output-digest',
			outputOwner: null,
			idOperation: 'None',
		});
	});
});
