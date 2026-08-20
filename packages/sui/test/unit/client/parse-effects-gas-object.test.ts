// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { parseTransactionEffects } from '../../../src/grpc/core.js';
import { parseTransactionEffectsJson } from '../../../src/jsonRpc/core.js';
import type { TransactionEffects as GrpcTransactionEffects } from '../../../src/grpc/proto/sui/rpc/v2/effects.js';
import {
	ChangedObject_IdOperation,
	ChangedObject_InputObjectState,
	ChangedObject_OutputObjectState,
} from '../../../src/grpc/proto/sui/rpc/v2/effects.js';
import type { TransactionEffects as JsonRpcTransactionEffects } from '../../../src/jsonRpc/types/generated.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

const SENDER = '0x000000000000000000000000000000000000000000000000000000000000000a';
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

describe('JSON-RPC parseTransactionEffectsJson gasObject', () => {
	function jsonRpcEffects(gasObject: JsonRpcTransactionEffects['gasObject']) {
		return {
			messageVersion: 'v1',
			status: { status: 'success' },
			executedEpoch: '0',
			gasUsed: {
				computationCost: '100',
				storageCost: '200',
				storageRebate: '300',
				nonRefundableStorageFee: '0',
			},
			transactionDigest: 'tx-digest',
			gasObject,
			dependencies: [],
		} as unknown as JsonRpcTransactionEffects;
	}

	it('maps the placeholder 0x0 gas object to null', () => {
		// When the transaction has no gas object the RPC substitutes a
		// placeholder ref instead of omitting the field.
		const { effects } = parseTransactionEffectsJson({
			effects: jsonRpcEffects({
				owner: { AddressOwner: normalizeSuiAddress('0x0') },
				reference: {
					objectId: normalizeSuiAddress('0x0'),
					version: '0',
					digest: '11111111111111111111111111111111',
				},
			}),
			objectChanges: [
				{
					type: 'mutated',
					sender: SENDER,
					owner: { AddressOwner: SENDER },
					objectType: '0x2::coin::Coin<0x2::sui::SUI>',
					objectId: GAS_OBJECT_ID,
					version: '9',
					previousVersion: '8',
					digest: 'object-digest',
				},
			],
		});

		expect(effects.gasObject).toBeNull();
		// The lamport version can no longer come from the gas object, so it is
		// recovered from the written objects.
		expect(effects.lamportVersion).toBe('9');
	});

	it('maps a real gas object', () => {
		const { effects } = parseTransactionEffectsJson({
			effects: jsonRpcEffects({
				owner: { AddressOwner: SENDER },
				reference: { objectId: GAS_OBJECT_ID, version: '5', digest: 'gas-digest' },
			}),
			objectChanges: [],
		});

		expect(effects.gasObject).toEqual({
			objectId: GAS_OBJECT_ID,
			inputState: 'Exists',
			inputVersion: null,
			inputDigest: null,
			inputOwner: null,
			outputState: 'ObjectWrite',
			outputVersion: '5',
			outputDigest: 'gas-digest',
			outputOwner: { $kind: 'AddressOwner', AddressOwner: SENDER },
			idOperation: 'None',
		});
		expect(effects.lamportVersion).toBe('5');
	});
});
