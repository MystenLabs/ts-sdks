// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';
import { describe, expect, test } from 'vitest';

import { dryRunFromSimulation } from '../../src/json-rpc-compat/index.js';
import { programmableTransactionData } from './transaction-data.js';

type Simulation = Parameters<typeof dryRunFromSimulation>[0];

const SENDER = '0x000000000000000000000000000000000000000000000000000000000000000a';
const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';
const PACKAGE = '0x0000000000000000000000000000000000000000000000000000000000000999';
const OBJECT_A = '0x0000000000000000000000000000000000000000000000000000000000000a00';
const OBJECT_B = '0x0000000000000000000000000000000000000000000000000000000000000b00';
const OBJECT_C = '0x0000000000000000000000000000000000000000000000000000000000000c00';
const OBJECT_D = '0x0000000000000000000000000000000000000000000000000000000000000d00';

const digestOf = (fill: number) => toBase58(Uint8Array.from({ length: 32 }, () => fill));
const owner = (address: string) => ({ $kind: 'AddressOwner', AddressOwner: address }) as const;

function changed(change: Partial<SuiClientTypes.ChangedObject>): SuiClientTypes.ChangedObject {
	return {
		objectId: OBJECT_A,
		inputState: 'Exists',
		inputVersion: '1',
		inputDigest: digestOf(1),
		inputOwner: owner(SENDER),
		outputState: 'ObjectWrite',
		outputVersion: '5',
		outputDigest: digestOf(2),
		outputOwner: owner(SENDER),
		idOperation: 'None',
		...change,
	};
}

function simulation({
	changedObjects = [],
	unchangedConsensusObjects = [],
	objectTypes = {},
	inputs = [],
	commands = [],
	status = { success: true, error: null },
}: {
	changedObjects?: SuiClientTypes.ChangedObject[];
	unchangedConsensusObjects?: SuiClientTypes.UnchangedConsensusObject[];
	objectTypes?: Record<string, string>;
	inputs?: unknown[];
	commands?: unknown[];
	status?: SuiClientTypes.ExecutionStatus;
}): Simulation {
	return {
		digest: digestOf(9),
		sender: SENDER,
		signatures: [],
		epoch: '1',
		status,
		balanceChanges: [],
		events: [],
		objectTypes,
		effects: {
			version: 2,
			status,
			gasUsed: {
				computationCost: '1',
				storageCost: '2',
				storageRebate: '3',
				nonRefundableStorageFee: '0',
			},
			transactionDigest: digestOf(9),
			gasObject: changed({ objectId: OBJECT_D }),
			eventsDigest: null,
			dependencies: [],
			lamportVersion: '5',
			changedObjects: [changed({ objectId: OBJECT_D }), ...changedObjects],
			unchangedConsensusObjects,
			auxiliaryDataDigest: null,
		},
		transaction: programmableTransactionData({
			version: 2,
			sender: SENDER,
			expiration: { $kind: 'None', None: true },
			gasData: {
				budget: '1000',
				price: '1',
				owner: SENDER,
				payment: [{ objectId: OBJECT_D, version: '1', digest: digestOf(1) }],
			},
			inputs,
			commands,
		}),
	} as unknown as Simulation;
}

function programmable(dryRun: ReturnType<typeof dryRunFromSimulation>) {
	const { transaction } = dryRun.input;
	if (transaction.kind !== 'ProgrammableTransaction') {
		throw new Error('Expected a programmable transaction');
	}
	return transaction;
}

describe('fullnode fidelity', () => {
	test('lists consensus objects the transaction wrote before the ones it only read', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				changedObjects: [
					changed({
						objectId: OBJECT_B,
						inputOwner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
						outputOwner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
					}),
				],
				unchangedConsensusObjects: [
					{ kind: 'ReadOnlyRoot', objectId: OBJECT_A, version: '3', digest: digestOf(3) },
					{ kind: 'ReadConsensusStreamEnded', objectId: OBJECT_C, version: '4', digest: null },
					{ kind: 'Cancelled', objectId: OBJECT_D, version: '4', digest: null },
					{ kind: 'PerEpochConfig', objectId: OBJECT_D, version: null, digest: null },
				],
			}),
		);

		expect(dryRun.effects.sharedObjects).toEqual([
			{ objectId: OBJECT_B, version: 1, digest: digestOf(1) },
			{ objectId: OBJECT_A, version: 3, digest: digestOf(3) },
			{ objectId: OBJECT_C, version: 4, digest: digestOf(99) },
			{ objectId: OBJECT_D, version: 4, digest: digestOf(77) },
		]);
	});

	test('reports a consensus address owner start version as a number', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				changedObjects: [
					changed({
						objectId: OBJECT_B,
						outputOwner: {
							$kind: 'ConsensusAddressOwner',
							ConsensusAddressOwner: { owner: SENDER, startVersion: '5' },
						},
					}),
				],
			}),
		);

		expect(dryRun.effects.mutated?.[1]?.owner).toEqual({
			ConsensusAddressOwner: { owner: SENDER, start_version: 5 },
		});
	});

	test('formats input type tags the way the node displayed them', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				inputs: [
					{
						$kind: 'FundsWithdrawal',
						FundsWithdrawal: {
							reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '500' },
							typeArg: { $kind: 'Balance', Balance: `${FRAMEWORK}::sui::SUI` },
							withdrawFrom: { $kind: 'Sender', Sender: true },
						},
					},
				],
				commands: [
					{
						$kind: 'MoveCall',
						MoveCall: {
							package: PACKAGE,
							module: 'm',
							function: 'f',
							typeArguments: [`${FRAMEWORK}::table::Table<${PACKAGE}::m::K,u64>`],
							arguments: [],
						},
					},
				],
			}),
		);
		const transaction = programmable(dryRun);

		expect(transaction.inputs[0]).toMatchObject({ typeArg: { balance: '0x2::sui::SUI' } });
		expect(transaction.transactions[0]).toEqual({
			MoveCall: {
				package: PACKAGE,
				module: 'm',
				function: 'f',
				type_arguments: ['0x2::table::Table<0x999::m::K, u64>'],
			},
		});
	});

	test('leaves a pure input without a type hint as raw bytes', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				inputs: [{ $kind: 'Pure', Pure: { bytes: 'BQAAAAAAAAA=' } }],
				commands: [
					{
						$kind: 'MoveCall',
						MoveCall: {
							package: PACKAGE,
							module: 'm',
							function: 'f',
							typeArguments: [],
							arguments: [{ $kind: 'Input', Input: 0 }],
						},
					},
				],
			}),
		);

		expect(programmable(dryRun).inputs[0]).toEqual({
			type: 'pure',
			value: [5, 0, 0, 0, 0, 0, 0, 0],
		});
	});

	test('drops object changes for upgraded packages and objects of unknown type', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				changedObjects: [
					changed({ objectId: OBJECT_A, outputState: 'PackageWrite', outputOwner: null }),
					changed({ objectId: OBJECT_B }),
				],
				objectTypes: { [OBJECT_D]: `${FRAMEWORK}::coin::Coin<${FRAMEWORK}::sui::SUI>` },
			}),
		);

		expect(dryRun.objectChanges.map((change) => 'objectId' in change && change.objectId)).toEqual([
			OBJECT_D,
		]);
		expect(dryRun.effects.mutated?.map((ref) => ref.reference.objectId)).toEqual([
			OBJECT_D,
			OBJECT_A,
			OBJECT_B,
		]);
	});

	test('reports a clever abort with its error code and line', () => {
		const status = {
			success: false,
			error: {
				$kind: 'MoveAbort',
				message: 'aborted',
				MoveAbort: {
					abortCode: '9223372079804448767',
					location: { package: PACKAGE, module: 'm', functionName: 'f' },
					cleverError: { errorCode: 3, lineNumber: 42 },
				},
			},
		} as SuiClientTypes.ExecutionStatus;

		const abortError: SuiJsonRpcTypes.SuiMoveAbort | null | undefined = dryRunFromSimulation(
			simulation({ status }),
		).effects.abortError;

		expect(abortError).toEqual({
			error_code: 3,
			function: 'f',
			line: 42,
			module_id: `${PACKAGE}::m`,
		});
	});
});

describe('gas paid from an address balance', () => {
	function addressBalanceGas() {
		const sim = simulation({});
		(sim.effects as { gasObject: unknown }).gasObject = {
			objectId: undefined,
			inputState: null,
			inputVersion: null,
			inputDigest: null,
			inputOwner: null,
			outputState: null,
			outputVersion: null,
			outputDigest: null,
			outputOwner: null,
			idOperation: null,
		};
		return sim;
	}

	test('reports the zero gas reference with the gas payer as its owner', () => {
		expect(dryRunFromSimulation(addressBalanceGas()).effects.gasObject).toEqual({
			reference: {
				objectId: '0x0000000000000000000000000000000000000000000000000000000000000000',
				version: 0,
				digest: digestOf(0),
			},
			owner: { AddressOwner: SENDER },
		});
	});

	test('uses the gas coin when there is one', () => {
		expect(dryRunFromSimulation(simulation({})).effects.gasObject).toEqual({
			reference: { objectId: OBJECT_D, version: 5, digest: digestOf(2) },
			owner: { AddressOwner: SENDER },
		});
	});
});

describe('objects moved under another object', () => {
	test('reports an address-owned object that becomes object-owned as mutated', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				changedObjects: [
					changed({
						objectId: OBJECT_A,
						outputOwner: { $kind: 'ObjectOwner', ObjectOwner: OBJECT_B },
					}),
				],
				objectTypes: { [OBJECT_A]: `${PACKAGE}::m::Nft` },
			}),
		);

		expect(dryRun.effects.wrapped).toBeUndefined();
		expect(dryRun.objectChanges).toEqual([
			{
				type: 'mutated',
				digest: digestOf(2),
				objectId: OBJECT_A,
				objectType: `${PACKAGE}::m::Nft`,
				owner: { ObjectOwner: OBJECT_B },
				previousVersion: '1',
				sender: SENDER,
				version: '5',
			},
		]);
	});
});

describe('funds withdrawal inputs', () => {
	const FUNDER = '0x000000000000000000000000000000000000000000000000000000000000000c';

	function inputFor(withdrawFrom: unknown) {
		const dryRun = dryRunFromSimulation(
			simulation({
				inputs: [
					{
						$kind: 'FundsWithdrawal',
						FundsWithdrawal: {
							reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '500' },
							typeArg: { $kind: 'Balance', Balance: `${FRAMEWORK}::sui::SUI` },
							withdrawFrom,
						},
					},
				],
			}),
		);
		return programmable(dryRun).inputs[0];
	}

	test('maps sender and sponsor withdrawals to their legacy strings', () => {
		expect(inputFor({ $kind: 'Sender', Sender: true })).toEqual({
			type: 'fundsWithdrawal',
			reservation: { maxAmountU64: '500' },
			typeArg: { balance: '0x2::sui::SUI' },
			withdrawFrom: 'sender',
		});
		expect(inputFor({ $kind: 'Sponsor', Sponsor: true })).toMatchObject({
			withdrawFrom: 'sponsor',
		});
	});

	test('keeps the funder and allowance of an allowance withdrawal', () => {
		const withdrawFrom: SuiJsonRpcTypes.SuiWithdrawFrom = {
			senderAllowance: { funder: FUNDER, allowance: OBJECT_A },
		};

		expect(
			inputFor({
				$kind: 'SenderAllowance',
				SenderAllowance: { funder: FUNDER, allowance: OBJECT_A },
			}),
		).toMatchObject({ withdrawFrom });
	});

	test('refuses a withdrawal source it does not know', () => {
		expect(() => inputFor({ $kind: 'Somewhere', Somewhere: true })).toThrow(
			/Unsupported fundsWithdrawal source/,
		);
	});
});

describe('JSON-RPC type and owner forms', () => {
	const SYSTEM = '0x0000000000000000000000000000000000000000000000000000000000000003';
	const DEEPBOOK = '0x000000000000000000000000000000000000000000000000000000000000dee9';

	test('shortens only system addresses in object and event types', () => {
		const sim = simulation({
			changedObjects: [
				changed({ objectId: OBJECT_A, inputState: 'DoesNotExist', idOperation: 'Created' }),
			],
			objectTypes: {
				[OBJECT_A]: `${FRAMEWORK}::coin::Coin<${DEEPBOOK}::custodian::Account<${PACKAGE}::m::T,u64>>`,
			},
		});
		(sim as { events: unknown }).events = [
			{
				packageId: SYSTEM,
				module: 'validator',
				sender: SENDER,
				eventType: `${SYSTEM}::validator::StakingRequestEvent`,
				bcs: new Uint8Array(),
				json: null,
			},
		];
		const dryRun = dryRunFromSimulation(sim);

		expect(dryRun.objectChanges[0]).toMatchObject({
			type: 'created',
			objectType: `0x2::coin::Coin<0xdee9::custodian::Account<${PACKAGE}::m::T, u64>>`,
		});
		expect(dryRun.events[0]).toMatchObject({
			packageId: SYSTEM,
			transactionModule: 'validator',
			type: '0x3::validator::StakingRequestEvent',
		});
	});

	test('reports a published package as immutable', () => {
		const dryRun = dryRunFromSimulation(
			simulation({
				changedObjects: [
					changed({
						objectId: OBJECT_A,
						inputState: 'DoesNotExist',
						idOperation: 'Created',
						outputState: 'PackageWrite',
						outputOwner: null,
					}),
				],
			}),
		);

		expect(dryRun.effects.created?.[0]?.owner).toBe('Immutable');
	});

	test('throws on a written object without an owner instead of inventing one', () => {
		expect(() =>
			dryRunFromSimulation(
				simulation({ changedObjects: [changed({ objectId: OBJECT_A, outputOwner: null })] }),
			),
		).toThrow('Cannot map object owner');
	});
});

describe('transaction kinds', () => {
	function withKind(kind: SuiClientTypes.TransactionData['kind']) {
		const sim = simulation({});
		return { ...sim, transaction: { ...sim.transaction, kind } } as Simulation;
	}

	test('refuses a transaction kind the client could not map', () => {
		expect(() => dryRunFromSimulation(withKind({ $kind: 'Unknown', Unknown: true }))).toThrow(
			/update the SDK/,
		);
	});

	test('reports a programmable system transaction under its own kind', () => {
		const dryRun = dryRunFromSimulation(
			withKind({
				$kind: 'ProgrammableSystemTransaction',
				ProgrammableSystemTransaction: { inputs: [], commands: [] },
			}),
		);

		expect(dryRun.input.transaction.kind).toBe('ProgrammableSystemTransaction');
	});

	test('refuses to map the input of other system transactions', () => {
		expect(() =>
			dryRunFromSimulation(withKind({ $kind: 'EndOfEpochTransaction', EndOfEpochTransaction: [] })),
		).toThrow('Unsupported transaction kind EndOfEpochTransaction');
	});
});
