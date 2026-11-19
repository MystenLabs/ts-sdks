// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';
import { describe, expect, expectTypeOf, test } from 'vitest';

import { dryRunFromSimulation, tryDryRunFromSimulation } from '../../src/json-rpc-compat/index.js';

const SENDER = '0x000000000000000000000000000000000000000000000000000000000000000a';
const RECIPIENT = '0x000000000000000000000000000000000000000000000000000000000000000b';
const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';
const GAS_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000100';
const CREATED_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000200';
const MUTATED_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000300';
const TRANSFERRED_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000400';

const owner = (address: string) =>
	({
		$kind: 'AddressOwner',
		AddressOwner: address,
	}) as const;

describe('dryRunFromSimulation', () => {
	test('maps included Core simulation fields into the legacy dry-run response shape', () => {
		const simulation = {
			digest: 'simulation-digest',
			signatures: [],
			epoch: '42',
			status: { success: true, error: null },
			balanceChanges: [
				{
					coinType: `${FRAMEWORK}::sui::SUI`,
					address: SENDER,
					amount: '-123',
				},
				{
					coinType: `${FRAMEWORK}::sui::SUI`,
					address: RECIPIENT,
					amount: '123',
				},
			],
			effects: {
				bcs: null,
				version: 2,
				status: { success: true, error: null },
				gasUsed: {
					computationCost: '1',
					storageCost: '2',
					storageRebate: '3',
					nonRefundableStorageFee: '0',
				},
				transactionDigest: 'tx-digest',
				gasObject: {
					objectId: GAS_OBJECT_ID,
					inputState: 'Exists',
					inputVersion: '1',
					inputDigest: 'gas-input-digest',
					inputOwner: owner(SENDER),
					outputState: 'ObjectWrite',
					outputVersion: '2',
					outputDigest: 'gas-output-digest',
					outputOwner: owner(SENDER),
					idOperation: 'None',
				},
				eventsDigest: null,
				dependencies: [],
				lamportVersion: '2',
				changedObjects: [
					{
						objectId: GAS_OBJECT_ID,
						inputState: 'Exists',
						inputVersion: '1',
						inputDigest: 'gas-input-digest',
						inputOwner: owner(SENDER),
						outputState: 'ObjectWrite',
						outputVersion: '2',
						outputDigest: 'gas-output-digest',
						outputOwner: owner(SENDER),
						idOperation: 'None',
					},
					{
						objectId: CREATED_OBJECT_ID,
						inputState: 'DoesNotExist',
						inputVersion: null,
						inputDigest: null,
						inputOwner: null,
						outputState: 'ObjectWrite',
						outputVersion: '2',
						outputDigest: 'created-output-digest',
						outputOwner: owner(RECIPIENT),
						idOperation: 'Created',
					},
					{
						objectId: MUTATED_OBJECT_ID,
						inputState: 'Exists',
						inputVersion: '1',
						inputDigest: 'mutated-input-digest',
						inputOwner: owner(SENDER),
						outputState: 'ObjectWrite',
						outputVersion: '2',
						outputDigest: 'mutated-output-digest',
						outputOwner: owner(SENDER),
						idOperation: 'None',
					},
					{
						objectId: TRANSFERRED_OBJECT_ID,
						inputState: 'Exists',
						inputVersion: '1',
						inputDigest: 'transferred-input-digest',
						inputOwner: owner(SENDER),
						outputState: 'ObjectWrite',
						outputVersion: '2',
						outputDigest: 'transferred-output-digest',
						outputOwner: owner(RECIPIENT),
						idOperation: 'None',
					},
				],
				unchangedConsensusObjects: [],
				auxiliaryDataDigest: null,
			},
			events: [],
			objectTypes: {
				[GAS_OBJECT_ID]: `${FRAMEWORK}::coin::Coin<${FRAMEWORK}::sui::SUI>`,
				[CREATED_OBJECT_ID]: `${FRAMEWORK}::coin::Coin<${FRAMEWORK}::sui::SUI>`,
				[MUTATED_OBJECT_ID]: `${FRAMEWORK}::demo::Nft`,
				[TRANSFERRED_OBJECT_ID]: `${FRAMEWORK}::demo::Nft`,
			},
			transaction: {
				version: 2,
				sender: SENDER,
				expiration: { None: true },
				gasData: {
					budget: '1000',
					price: '1',
					owner: SENDER,
					payment: [
						{
							objectId: GAS_OBJECT_ID,
							version: '1',
							digest: 'gas-input-digest',
						},
					],
				},
				inputs: [
					{
						Pure: {
							bytes: bcs.Address.serialize(RECIPIENT).toBase64(),
						},
					},
					{
						Pure: {
							bytes: bcs.U64.serialize(123).toBase64(),
						},
					},
				],
				commands: [
					{
						SplitCoins: {
							coin: { GasCoin: true },
							amounts: [{ Input: 1 }],
						},
					},
					{
						TransferObjects: {
							objects: [{ Result: 0 }],
							address: { Input: 0 },
						},
					},
				],
				digest: null,
			},
			bcs: undefined,
		} as unknown as SuiClientTypes.Transaction<{
			balanceChanges: true;
			effects: true;
			events: true;
			objectTypes: true;
			transaction: true;
		}>;

		const dryRun = dryRunFromSimulation(simulation);

		expect(dryRun.balanceChanges).toEqual([
			{
				amount: '-123',
				coinType: '0x2::sui::SUI',
				owner: { AddressOwner: SENDER },
			},
			{
				amount: '123',
				coinType: '0x2::sui::SUI',
				owner: { AddressOwner: RECIPIENT },
			},
		]);
		expect(dryRun.input.sender).toBe(SENDER);
		expect(dryRun.input.transaction.kind).toBe('ProgrammableTransaction');
		if (dryRun.input.transaction.kind !== 'ProgrammableTransaction') {
			throw new Error('Expected programmable transaction');
		}
		expect(dryRun.input.transaction.inputs).toEqual([
			{
				type: 'pure',
				value: RECIPIENT,
				valueType: 'address',
			},
			{
				type: 'pure',
				value: '123',
				valueType: 'u64',
			},
		]);
		expect(dryRun.input.transaction.transactions).toEqual([
			{ SplitCoins: ['GasCoin', [{ Input: 1 }]] },
			{ TransferObjects: [[{ Result: 0 }], { Input: 0 }] },
		]);
		expect(dryRun.objectChanges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'created',
					objectId: CREATED_OBJECT_ID,
					objectType: '0x2::coin::Coin<0x2::sui::SUI>',
					owner: { AddressOwner: RECIPIENT },
					sender: SENDER,
				}),
				expect.objectContaining({
					type: 'mutated',
					objectId: MUTATED_OBJECT_ID,
					objectType: '0x2::demo::Nft',
					owner: { AddressOwner: SENDER },
					previousVersion: '1',
					sender: SENDER,
				}),
				expect.objectContaining({
					type: 'transferred',
					objectId: TRANSFERRED_OBJECT_ID,
					objectType: '0x2::demo::Nft',
					recipient: { AddressOwner: RECIPIENT },
					sender: SENDER,
				}),
			]),
		);
		expect(dryRun.effects.status).toEqual({ status: 'success' });
		expect(dryRun.effects.gasObject).toEqual({
			reference: {
				objectId: GAS_OBJECT_ID,
				version: 2,
				digest: 'gas-output-digest',
			},
			owner: { AddressOwner: SENDER },
		});
		expect(dryRun.executionErrorSource).toBeNull();
	});
});

describe('gas paid from an address balance', () => {
	// Shape captured from a real mainnet suilend transaction: gas settles against
	// the accumulator, so the node returns no gas object and the Core client
	// materialises `effects.gasObject` with every field null.
	const ACCUMULATOR = '0x58e0ceba6a63e58fd3a9c38c98c09d8c07b7dfbda30a5175335e2f6fe3eb6ba2';
	const SPENT_COIN = '0xcb5c8cb03afe58f3bf8c556e1ded7ff8e936ba59d2ac0dab0d2ae4facb1cbd17';

	function simulation() {
		return {
			digest: 'simulation-digest',
			epoch: '42',
			status: { success: true, error: null },
			balanceChanges: [],
			effects: {
				version: 2,
				status: { success: true, error: null },
				gasUsed: {
					computationCost: '100',
					storageCost: '200',
					storageRebate: '300',
					nonRefundableStorageFee: '0',
				},
				transactionDigest: 'tx-digest',
				gasObject: {
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
				},
				eventsDigest: null,
				dependencies: [],
				lamportVersion: '958761622',
				changedObjects: [
					{
						objectId: ACCUMULATOR,
						inputState: 'DoesNotExist',
						outputState: 'AccumulatorWriteV1',
						outputVersion: null,
						outputDigest: null,
						idOperation: 'None',
					},
					{
						objectId: SPENT_COIN,
						inputState: 'Exists',
						inputVersion: '958761621',
						inputDigest: 'in',
						inputOwner: owner(SENDER),
						outputState: 'DoesNotExist',
						outputVersion: null,
						outputDigest: null,
						idOperation: 'Deleted',
					},
				],
				unchangedConsensusObjects: [],
				auxiliaryDataDigest: null,
			},
			events: [],
			objectTypes: {},
			transaction: {
				version: 2,
				sender: SENDER,
				expiration: { None: true },
				gasData: {
					budget: '200000',
					price: '100',
					owner: SENDER,
					payment: [{ objectId: SPENT_COIN, version: '958761621', digest: 'd' }],
				},
				inputs: [],
				commands: [],
				digest: null,
			},
		} as unknown as Parameters<typeof dryRunFromSimulation>[0];
	}

	test('maps the dry run instead of returning undefined', () => {
		const dryRun = tryDryRunFromSimulation(simulation());

		expect(dryRun).toBeDefined();
		expect(dryRun!.effects.gasUsed.computationCost).toBe('100');
		expect(dryRun!.objectChanges).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'deleted', objectId: SPENT_COIN })]),
		);
	});

	test('reports the gas payer as the gas object owner', () => {
		const dryRun = tryDryRunFromSimulation(simulation());

		// getGasSummary reads gasObject.owner for dry runs.
		expect(dryRun!.effects.gasObject.owner).toEqual({ AddressOwner: SENDER });
	});

	test('uses the real gas object when the node reports one', () => {
		const sim = simulation();
		(sim.effects as { gasObject: unknown }).gasObject = {
			objectId: GAS_OBJECT_ID,
			inputState: 'Exists',
			inputVersion: '1',
			inputDigest: 'gas-input-digest',
			inputOwner: owner(SENDER),
			outputState: 'ObjectWrite',
			outputVersion: '2',
			outputDigest: 'gas-output-digest',
			outputOwner: owner(RECIPIENT),
			idOperation: 'None',
		};

		expect(tryDryRunFromSimulation(sim)!.effects.gasObject).toEqual({
			reference: {
				objectId: GAS_OBJECT_ID,
				version: 2,
				digest: 'gas-output-digest',
			},
			owner: { AddressOwner: RECIPIENT },
		});
	});
});

describe('objects moved under another object', () => {
	const PARENT_ID = '0x0000000000000000000000000000000000000000000000000000000000000500';
	const CHILD_ID = '0x0000000000000000000000000000000000000000000000000000000000000600';
	const WRAPPED_ID = '0x0000000000000000000000000000000000000000000000000000000000000700';

	function simulation(changedObjects: unknown[]) {
		return {
			digest: 'simulation-digest',
			epoch: '42',
			status: { success: true, error: null },
			balanceChanges: [],
			effects: {
				version: 2,
				status: { success: true, error: null },
				gasUsed: {
					computationCost: '1',
					storageCost: '2',
					storageRebate: '3',
					nonRefundableStorageFee: '0',
				},
				transactionDigest: 'tx-digest',
				gasObject: null,
				eventsDigest: null,
				dependencies: [],
				lamportVersion: '2',
				changedObjects,
				unchangedConsensusObjects: [],
				auxiliaryDataDigest: null,
			},
			events: [],
			objectTypes: {
				[CHILD_ID]: `${FRAMEWORK}::demo::Nft`,
				[WRAPPED_ID]: `${FRAMEWORK}::demo::Nft`,
			},
			transaction: {
				version: 2,
				sender: SENDER,
				expiration: { None: true },
				gasData: { budget: '1000', price: '1', owner: SENDER, payment: [] },
				inputs: [],
				commands: [],
				digest: null,
			},
		} as unknown as Parameters<typeof dryRunFromSimulation>[0];
	}

	// `transfer::transfer` to an object id, or a receiving-pattern object: the
	// object is still stored on its own, so the node reported it as mutated.
	const movedUnderParent = {
		objectId: CHILD_ID,
		inputState: 'Exists',
		inputVersion: '1',
		inputDigest: 'child-input-digest',
		inputOwner: owner(SENDER),
		outputState: 'ObjectWrite',
		outputVersion: '2',
		outputDigest: 'child-output-digest',
		outputOwner: { $kind: 'ObjectOwner', ObjectOwner: PARENT_ID },
		idOperation: 'None',
	};

	test('reports an address-owned object that becomes object-owned as mutated', () => {
		const dryRun = dryRunFromSimulation(simulation([movedUnderParent]));

		expect(dryRun.effects.wrapped).toEqual([]);
		expect(dryRun.effects.mutated).toEqual([
			{
				reference: { objectId: CHILD_ID, version: 2, digest: 'child-output-digest' },
				owner: { ObjectOwner: PARENT_ID },
			},
		]);
		expect(dryRun.objectChanges).toEqual([
			{
				type: 'mutated',
				digest: 'child-output-digest',
				objectId: CHILD_ID,
				objectType: '0x2::demo::Nft',
				owner: { ObjectOwner: PARENT_ID },
				previousVersion: '1',
				sender: SENDER,
				version: '2',
			},
		]);
	});

	test('reports an object that stops existing on its own as wrapped', () => {
		const dryRun = dryRunFromSimulation(
			simulation([
				{
					objectId: WRAPPED_ID,
					inputState: 'Exists',
					inputVersion: '1',
					inputDigest: 'wrapped-input-digest',
					inputOwner: owner(SENDER),
					outputState: 'DoesNotExist',
					outputVersion: null,
					outputDigest: null,
					outputOwner: null,
					idOperation: 'None',
				},
			]),
		);

		expect(dryRun.effects.mutated).toEqual([]);
		expect(dryRun.effects.wrapped).toEqual([
			expect.objectContaining({ objectId: WRAPPED_ID, version: 2 }),
		]);
		expect(dryRun.objectChanges).toEqual([
			expect.objectContaining({ type: 'wrapped', objectId: WRAPPED_ID, version: '2' }),
		]);
	});
});

describe('funds withdrawal inputs', () => {
	const FUNDER = '0x000000000000000000000000000000000000000000000000000000000000000c';
	const ALLOWANCE_ID = '0x0000000000000000000000000000000000000000000000000000000000000800';

	function inputFor(withdrawFrom: unknown) {
		const simulation = {
			digest: 'simulation-digest',
			epoch: '42',
			status: { success: true, error: null },
			balanceChanges: [],
			effects: {
				version: 2,
				status: { success: true, error: null },
				gasUsed: {
					computationCost: '1',
					storageCost: '2',
					storageRebate: '3',
					nonRefundableStorageFee: '0',
				},
				transactionDigest: 'tx-digest',
				gasObject: null,
				eventsDigest: null,
				dependencies: [],
				lamportVersion: '2',
				changedObjects: [],
				unchangedConsensusObjects: [],
				auxiliaryDataDigest: null,
			},
			events: [],
			objectTypes: {},
			transaction: {
				version: 2,
				sender: SENDER,
				expiration: { None: true },
				gasData: { budget: '1000', price: '1', owner: SENDER, payment: [] },
				inputs: [
					{
						FundsWithdrawal: {
							reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '500' },
							typeArg: { $kind: 'Balance', Balance: `${FRAMEWORK}::sui::SUI` },
							withdrawFrom,
						},
					},
				],
				commands: [],
				digest: null,
			},
		} as unknown as Parameters<typeof dryRunFromSimulation>[0];

		const { transaction } = dryRunFromSimulation(simulation).input;
		if (transaction.kind !== 'ProgrammableTransaction') {
			throw new Error('Expected programmable transaction');
		}
		return transaction.inputs[0];
	}

	test('maps sender and sponsor withdrawals to their legacy strings', () => {
		expect(inputFor({ $kind: 'Sender', Sender: true })).toEqual({
			type: 'fundsWithdrawal',
			reservation: { maxAmountU64: '500' },
			typeArg: { balance: `${FRAMEWORK}::sui::SUI` },
			withdrawFrom: 'sender',
		});
		expect(inputFor({ $kind: 'Sponsor', Sponsor: true })).toMatchObject({
			withdrawFrom: 'sponsor',
		});
	});

	// The node serialized `SuiWithdrawFrom::SenderAllowance` this way.
	test('keeps the funder and allowance of an allowance withdrawal', () => {
		const withdrawFrom: SuiJsonRpcTypes.SuiWithdrawFrom = {
			senderAllowance: { funder: FUNDER, allowance: ALLOWANCE_ID },
		};
		expectTypeOf(withdrawFrom).toExtend<SuiJsonRpcTypes.SuiWithdrawFrom>();

		expect(
			inputFor({
				$kind: 'SenderAllowance',
				SenderAllowance: { funder: FUNDER, allowance: ALLOWANCE_ID },
			}),
		).toMatchObject({
			type: 'fundsWithdrawal',
			withdrawFrom,
		});
	});

	test('refuses a withdrawal source it does not know rather than guessing one', () => {
		expect(() => inputFor({ $kind: 'Somewhere', Somewhere: true })).toThrow(
			/Unsupported fundsWithdrawal source/,
		);
	});
});
