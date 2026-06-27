// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import type { ClientWithCoreApi } from '../../../../src/client/core.js';
import type {
	BalanceChange,
	DryRunTransactionBlockResponse,
	ObjectOwner,
	OwnedObjectRef,
	SuiEvent,
	SuiObjectChange,
	SuiObjectRef,
	TransactionBlockData,
	TransactionEffects,
} from '../../../../src/jsonRpc/types/generated.js';
import { dryRunFromSimulate } from '../../../../src/jsonRpc/index.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { normalizeSuiAddress } from '../../../../src/utils/index.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';
import { createTestWithAllClients, setup, TestToolbox } from '../../utils/setup.js';

type BuildOutput = {
	modules: string[];
	dependencies: string[];
};

const DRY_RUN_COMPAT_INCLUDE = {
	balanceChanges: true,
	effects: true,
	events: true,
	objectTypes: true,
	transaction: true,
} as const satisfies SuiClientTypes.SimulateTransactionInclude;

type NormalizedDryRunResult = {
	balanceChanges: BalanceChange[];
	effects: ReturnType<typeof normalizeEffects>;
	events: SuiEvent[];
	executionErrorSource: string | null;
	input: TransactionBlockData;
	objectChanges: SuiObjectChange[];
	suggestedGasPrice: string | null;
};

type ProgrammableTransactionBlock = Extract<
	TransactionBlockData['transaction'],
	{ kind: 'ProgrammableTransaction' }
>;

describe('Core API - dry-run compatibility', () => {
	let toolbox: TestToolbox;
	let testAddress: string;
	let packageId: string;
	let simpleObjectId: string;
	let buildOutput: BuildOutput;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();
		packageId = toolbox.getPackage('test_data');
		simpleObjectId = await createSimpleObject(101);
		buildOutput = toolbox.getPackageBuildOutput('test_data');
	});

	const cases: Array<{
		name: string;
		expectedType: SuiObjectChange['type'];
		build: () => Promise<Uint8Array>;
	}> = [
		{
			name: 'created',
			expectedType: 'created',
			build: () => buildCreateTransaction(201),
		},
		{
			name: 'mutated',
			expectedType: 'mutated',
			build: () => buildMutateTransaction(simpleObjectId, 202),
		},
		{
			name: 'transferred-as-mutated',
			expectedType: 'mutated',
			build: () => buildTransferTransaction(simpleObjectId),
		},
		{
			name: 'deleted',
			expectedType: 'deleted',
			build: () => buildDeleteTransaction(simpleObjectId),
		},
		{
			name: 'wrapped',
			expectedType: 'wrapped',
			build: () => buildWrapTransaction(simpleObjectId),
		},
		{
			name: 'published',
			expectedType: 'published',
			build: () => buildPublishTransaction(),
		},
	];

	for (const testCase of cases) {
		testWithAllClients(
			`converts ${testCase.name} object changes from simulateTransaction to dry-run shape`,
			async (client) => {
				const transaction = await testCase.build();
				await expectCompatibilityResultMatchesDryRun(client, transaction, testCase.expectedType);
			},
		);
	}

	testWithAllClients(
		'converts legacy input for standard programmable transaction commands',
		async (client) => {
			const transaction = await buildInputCoverageTransaction();
			const [dryRunResult, compatibilityResult] = await getCompatibilityComparison(
				client,
				transaction,
			);

			const normalizedCompatibility = normalizeDryRunResult(compatibilityResult);
			const normalizedDryRun = normalizeDryRunResult(dryRunResult);
			expect(normalizedCompatibility).toEqual(normalizedDryRun);

			const transactionInput = getProgrammableTransaction(normalizedCompatibility.input);
			const commands = transactionInput.transactions;
			expect(commands.some((command) => 'MoveCall' in command)).toBe(true);
			expect(commands.some((command) => 'SplitCoins' in command)).toBe(true);
			expect(commands.some((command) => 'MergeCoins' in command)).toBe(true);
			expect(commands.some((command) => 'TransferObjects' in command)).toBe(true);
			expect(commands.some((command) => 'MakeMoveVec' in command)).toBe(true);
			expect(commands.some((command) => 'Publish' in command)).toBe(true);

			const argumentKinds = new Set(
				commands.flatMap(
					(command) => JSON.stringify(command).match(/GasCoin|Input|Result|NestedResult/g) ?? [],
				),
			);
			expect(argumentKinds).toEqual(new Set(['GasCoin', 'Input', 'Result', 'NestedResult']));
			expect(transactionInput.inputs.some((input) => input.type === 'pure')).toBe(true);
			expect(transactionInput.inputs.some((input) => input.type === 'object')).toBe(true);
		},
	);

	it('converts upgrade commands and funds withdrawal inputs', () => {
		const result = createSyntheticUpgradeAndWithdrawalResult();
		const dryRunResult = dryRunFromSimulate(result);
		const transactionInput = getProgrammableTransaction(dryRunResult.input);

		expect(transactionInput.inputs).toContainEqual({
			type: 'fundsWithdrawal',
			reservation: { maxAmountU64: '99' },
			typeArg: { balance: '0x2::sui::SUI' },
			withdrawFrom: 'sender',
		});
		expect(transactionInput.transactions).toContainEqual({
			Upgrade: [['AQID'], '0x1234', { Input: 1 }],
		});
	});

	async function createSimpleObject(value: number) {
		const tx = new Transaction();
		const [object] = tx.moveCall({
			target: `${packageId}::test_objects::create_simple_object`,
			arguments: [tx.pure.u64(value)],
		});
		tx.transferObjects([object], tx.pure.address(testAddress));

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: { showObjectChanges: true },
		});
		await toolbox.waitForTransaction({ digest: result.digest });

		const createdObject = result.objectChanges?.find(
			(change) =>
				change.type === 'created' && change.objectType.endsWith('::test_objects::SimpleObject'),
		);
		if (!createdObject || createdObject.type !== 'created') {
			throw new Error('Failed to create SimpleObject test fixture');
		}

		return createdObject.objectId;
	}

	async function buildCreateTransaction(value: number) {
		const tx = new Transaction();
		const [object] = tx.moveCall({
			target: `${packageId}::test_objects::create_simple_object`,
			arguments: [tx.pure.u64(value)],
		});
		tx.transferObjects([object], tx.pure.address(testAddress));
		return buildTransaction(tx);
	}

	async function buildMutateTransaction(objectId: string, value: number) {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::test_objects::update_value`,
			arguments: [tx.object(objectId), tx.pure.u64(value)],
		});
		return buildTransaction(tx);
	}

	async function buildTransferTransaction(objectId: string) {
		const tx = new Transaction();
		tx.transferObjects([tx.object(objectId)], tx.pure.address(normalizeSuiAddress('0xcafe')));
		return buildTransaction(tx);
	}

	async function buildDeleteTransaction(objectId: string) {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::test_objects::delete_simple_object`,
			arguments: [tx.object(objectId)],
		});
		return buildTransaction(tx);
	}

	async function buildWrapTransaction(objectId: string) {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::test_objects::wrap_simple_object`,
			arguments: [tx.object(objectId)],
		});
		return buildTransaction(tx);
	}

	async function buildPublishTransaction() {
		const tx = new Transaction();
		const cap = tx.publish(buildOutput);
		tx.transferObjects([cap], tx.pure.address(testAddress));
		return buildTransaction(tx);
	}

	async function buildInputCoverageTransaction() {
		const tx = new Transaction();

		tx.moveCall({
			target: `${packageId}::test_objects::update_value`,
			arguments: [tx.object(simpleObjectId), tx.pure.u64(303)],
		});

		const coins = tx.splitCoins(tx.gas, [1000, 2000]);
		tx.mergeCoins(coins[0], [coins[1]]);
		tx.transferObjects([coins[0]], tx.pure.address(testAddress));

		const [object] = tx.moveCall({
			target: `${packageId}::test_objects::create_simple_object`,
			arguments: [tx.pure.u64(404)],
		});
		const objects = tx.makeMoveVec({
			type: `${packageId}::test_objects::SimpleObject`,
			elements: [object],
		});
		tx.moveCall({
			target: `${packageId}::test_objects::delete_simple_objects`,
			arguments: [objects],
		});

		const cap = tx.publish(buildOutput);
		tx.transferObjects([cap], tx.pure.address(testAddress));

		return buildTransaction(tx);
	}

	async function buildTransaction(tx: Transaction) {
		tx.setSender(testAddress);
		return tx.build({ client: toolbox.jsonRpcClient });
	}

	async function expectCompatibilityResultMatchesDryRun(
		client: ClientWithCoreApi,
		transaction: Uint8Array,
		expectedType: SuiObjectChange['type'],
	) {
		const [dryRunResult, compatibilityResult] = await getCompatibilityComparison(
			client,
			transaction,
		);

		expect(compatibilityResult.objectChanges.some((change) => change.type === expectedType)).toBe(
			true,
		);
		expect(normalizeDryRunResult(compatibilityResult)).toEqual(normalizeDryRunResult(dryRunResult));
	}

	async function getCompatibilityComparison(client: ClientWithCoreApi, transaction: Uint8Array) {
		return await Promise.all([
			toolbox.jsonRpcClient.dryRunTransactionBlock({ transactionBlock: transaction }),
			client.core
				.simulateTransaction({
					transaction,
					include: DRY_RUN_COMPAT_INCLUDE,
				})
				.then(dryRunFromSimulate),
		]);
	}
});

function normalizeDryRunResult(result: DryRunTransactionBlockResponse): NormalizedDryRunResult {
	return {
		balanceChanges: sortByJson(result.balanceChanges),
		effects: normalizeEffects(result.effects),
		events: sortByJson(result.events),
		executionErrorSource: result.executionErrorSource ?? null,
		input: normalizeInput(result.input),
		objectChanges: sortByJson(result.objectChanges.map(normalizeObjectChange)),
		suggestedGasPrice: result.suggestedGasPrice ?? null,
	};
}

function normalizeInput(input: TransactionBlockData): TransactionBlockData {
	return JSON.parse(JSON.stringify(input));
}

function getProgrammableTransaction(input: TransactionBlockData): ProgrammableTransactionBlock {
	if (input.transaction.kind !== 'ProgrammableTransaction') {
		throw new Error(`Expected ProgrammableTransaction input, got ${input.transaction.kind}`);
	}

	return input.transaction;
}

function createSyntheticUpgradeAndWithdrawalResult(): SuiClientTypes.SimulateTransactionResult<
	typeof DRY_RUN_COMPAT_INCLUDE
> {
	const sender = normalizeSuiAddress('0xa');
	const gasObjectId = normalizeSuiAddress('0xb');
	const ticketObjectId = normalizeSuiAddress('0xc');

	return {
		$kind: 'Transaction',
		commandResults: undefined,
		Transaction: {
			balanceChanges: [],
			bcs: undefined,
			digest: '4RJ8qFyk4g2w4LkUrsn3sXisDe3t6X8bBKy9r8HhHf7J',
			epoch: '0',
			events: [],
			objectTypes: {
				[gasObjectId]: '0x2::coin::Coin<0x2::sui::SUI>',
			},
			signatures: [],
			status: { success: true, error: null },
			transaction: {
				version: 2,
				sender,
				expiration: null,
				gasData: {
					budget: '1000',
					owner: sender,
					payment: [
						{
							objectId: gasObjectId,
							version: '1',
							digest: '11111111111111111111111111111111',
						},
					],
					price: '1',
				},
				inputs: [
					{
						FundsWithdrawal: {
							reservation: { MaxAmountU64: '99' },
							typeArg: { Balance: '0x2::sui::SUI' },
							withdrawFrom: { Sender: true },
						},
					},
					{
						Object: {
							ImmOrOwnedObject: {
								objectId: ticketObjectId,
								version: '1',
								digest: '22222222222222222222222222222222',
							},
						},
					},
				],
				commands: [
					{
						Upgrade: {
							modules: ['AQID'],
							dependencies: ['0x2'],
							package: '0x1234',
							ticket: { Input: 1 },
						},
					},
				],
			},
			effects: {
				auxiliaryDataDigest: null,
				bcs: null,
				changedObjects: [
					{
						objectId: gasObjectId,
						inputState: 'Exists',
						inputVersion: '1',
						inputDigest: '11111111111111111111111111111111',
						inputOwner: { $kind: 'AddressOwner', AddressOwner: sender },
						outputState: 'ObjectWrite',
						outputVersion: '2',
						outputDigest: '33333333333333333333333333333333',
						outputOwner: { $kind: 'AddressOwner', AddressOwner: sender },
						idOperation: 'None',
					},
				],
				dependencies: [],
				eventsDigest: null,
				gasObject: {
					objectId: gasObjectId,
					inputState: 'Exists',
					inputVersion: '1',
					inputDigest: '11111111111111111111111111111111',
					inputOwner: { $kind: 'AddressOwner', AddressOwner: sender },
					outputState: 'ObjectWrite',
					outputVersion: '2',
					outputDigest: '33333333333333333333333333333333',
					outputOwner: { $kind: 'AddressOwner', AddressOwner: sender },
					idOperation: 'None',
				},
				gasUsed: {
					computationCost: '0',
					nonRefundableStorageFee: '0',
					storageCost: '0',
					storageRebate: '0',
				},
				lamportVersion: '2',
				status: { success: true, error: null },
				transactionDigest: '4RJ8qFyk4g2w4LkUrsn3sXisDe3t6X8bBKy9r8HhHf7J',
				unchangedConsensusObjects: [],
				version: 2,
			},
		},
	};
}

function normalizeEffects(effects: TransactionEffects) {
	return {
		created: sortOwnedObjectRefs(effects.created ?? []),
		deleted: sortObjectRefs(effects.deleted ?? []),
		dependencies: [...(effects.dependencies ?? [])].sort(),
		eventsDigest: effects.eventsDigest,
		executedEpoch: effects.executedEpoch,
		gasObject: normalizeOwnedObjectRef(effects.gasObject),
		gasUsed: effects.gasUsed,
		messageVersion: effects.messageVersion,
		modifiedAtVersions: sortByJson(effects.modifiedAtVersions ?? []),
		mutated: sortOwnedObjectRefs(effects.mutated ?? []),
		sharedObjects: sortObjectRefs(effects.sharedObjects ?? []),
		status: effects.status,
		transactionDigest: effects.transactionDigest,
		unwrapped: sortOwnedObjectRefs(effects.unwrapped ?? []),
		unwrappedThenDeleted: sortObjectRefs(effects.unwrappedThenDeleted ?? []),
		wrapped: sortObjectRefs(effects.wrapped ?? []),
	};
}

function normalizeObjectChange(change: SuiObjectChange): SuiObjectChange {
	if (change.type === 'published') {
		return {
			...change,
			modules: [...change.modules].sort(),
		};
	}

	return change;
}

function sortOwnedObjectRefs(objects: OwnedObjectRef[]): OwnedObjectRef[] {
	return sortByJson(objects.map(normalizeOwnedObjectRef));
}

function normalizeOwnedObjectRef(object: OwnedObjectRef): OwnedObjectRef {
	return {
		...object,
		owner: normalizeOwner(object.owner),
	};
}

function sortObjectRefs<T extends SuiObjectRef>(objects: T[]): T[] {
	return sortByJson(objects);
}

function normalizeOwner(owner: ObjectOwner): ObjectOwner {
	if (typeof owner === 'string') {
		return owner;
	}

	if ('Shared' in owner) {
		return {
			Shared: {
				initial_shared_version: owner.Shared.initial_shared_version,
			},
		};
	}

	return owner;
}

function sortByJson<T>(values: T[]): T[] {
	return [...values].sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
}

function stableStringify(value: unknown): string {
	return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortKeys);
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, child]) => [key, sortKeys(child)]),
		);
	}

	return value;
}
