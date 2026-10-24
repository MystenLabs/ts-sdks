// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase58, toBase64 } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { beforeAll, describe, expect, expectTypeOf, test } from 'vitest';

import { programmableTransactionData } from './transaction-data.js';
import {
	MAPPABLE_TRANSACTION_INCLUDE,
	type MappableIncludeFor,
	mappableIncludeFor,
	type MappableTransaction,
	type SuiTransactionBlockResponse,
	type SuiTransactionBlockResponseOptions,
	transactionBlockResponseFromExecution,
} from '../../src/json-rpc-compat/index.js';

const SENDER = '0x000000000000000000000000000000000000000000000000000000000000000a';
const RECIPIENT = '0x000000000000000000000000000000000000000000000000000000000000000b';
const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';
const GAS_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000100';
const CREATED_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000200';
const PACKAGE_ID = '0x0000000000000000000000000000000000000000000000000000000000000300';

const digestOf = (fill: number) => toBase58(Uint8Array.from({ length: 32 }, () => fill));

const TX_DIGEST = digestOf(1);
const GAS_INPUT_DIGEST = digestOf(2);
const GAS_OUTPUT_DIGEST = digestOf(3);
const CREATED_DIGEST = digestOf(4);
const PACKAGE_DIGEST = digestOf(5);
const SIGNATURE = bcs.vector(bcs.u8()).serialize(new Uint8Array(97).fill(7)).toBase64();

const owner = (address: string) =>
	({
		$kind: 'AddressOwner',
		AddressOwner: address,
	}) as const;

/** A fresh PTB — split a coin off gas, transfer it — built offline. */
async function freshTransaction() {
	const tx = new Transaction();
	tx.setSender(SENDER);
	tx.setGasOwner(SENDER);
	tx.setGasPrice(1000n);
	tx.setGasBudget(2_000_000n);
	tx.setGasPayment([{ objectId: GAS_OBJECT_ID, version: '1', digest: GAS_INPUT_DIGEST }]);
	const [coin] = tx.splitCoins(tx.gas, [123]);
	tx.transferObjects([coin], RECIPIENT);

	const bytes = await tx.build();
	// With its inputs and commands moved under `kind`, `getData()` after a build
	// is the shape the core client parses an executed transaction into.
	return { bytes, data: programmableTransactionData(tx.getData()) };
}

/** The core `Transaction` a gRPC execution of that PTB parses to. */
function executedTransaction(data: unknown): MappableTransaction {
	return {
		digest: TX_DIGEST,
		signatures: [SIGNATURE],
		epoch: '42',
		status: { success: true, error: null },
		balanceChanges: [
			{ coinType: `${FRAMEWORK}::sui::SUI`, address: SENDER, amount: '-123' },
			{ coinType: `${FRAMEWORK}::sui::SUI`, address: RECIPIENT, amount: '123' },
		],
		effects: {
			bcs: new Uint8Array([1, 2, 3, 4]),
			version: 2,
			status: { success: true, error: null },
			gasUsed: {
				computationCost: '1',
				storageCost: '2',
				storageRebate: '3',
				nonRefundableStorageFee: '0',
			},
			transactionDigest: TX_DIGEST,
			gasObject: {
				objectId: GAS_OBJECT_ID,
				inputState: 'Exists',
				inputVersion: '1',
				inputDigest: GAS_INPUT_DIGEST,
				inputOwner: owner(SENDER),
				outputState: 'ObjectWrite',
				outputVersion: '2',
				outputDigest: GAS_OUTPUT_DIGEST,
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
					inputDigest: GAS_INPUT_DIGEST,
					inputOwner: owner(SENDER),
					outputState: 'ObjectWrite',
					outputVersion: '2',
					outputDigest: GAS_OUTPUT_DIGEST,
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
					outputDigest: CREATED_DIGEST,
					outputOwner: owner(RECIPIENT),
					idOperation: 'Created',
				},
			],
			unchangedConsensusObjects: [],
			auxiliaryDataDigest: null,
		},
		events: [
			{
				packageId: FRAMEWORK,
				module: 'demo',
				sender: SENDER,
				eventType: `${FRAMEWORK}::demo::Event`,
				bcs: new Uint8Array([9, 9]),
				json: { value: '1' },
			},
		],
		objectTypes: {
			[GAS_OBJECT_ID]: `${FRAMEWORK}::coin::Coin<${FRAMEWORK}::sui::SUI>`,
			[CREATED_OBJECT_ID]: `${FRAMEWORK}::coin::Coin<${FRAMEWORK}::sui::SUI>`,
		},
		transaction: data,
		bcs: undefined,
	} as unknown as MappableTransaction;
}

// `Required` so that a new option added to the legacy shape fails to compile
// here until it is accounted for.
const EVERY_OPTION = {
	showBalanceChanges: true,
	showEffects: true,
	showEvents: true,
	showInput: true,
	showObjectChanges: true,
	showRawEffects: true,
	showRawInput: true,
} as const satisfies Required<SuiTransactionBlockResponseOptions>;

type Option = keyof typeof EVERY_OPTION;

/**
 * The response field each option fills, so a test can tell a mapped section
 * apart from one `section()` swallowed.
 */
const RESPONSE_FIELD = {
	showBalanceChanges: 'balanceChanges',
	showEffects: 'effects',
	showEvents: 'events',
	showInput: 'transaction',
	showObjectChanges: 'objectChanges',
	showRawEffects: 'rawEffects',
	showRawInput: 'rawTransaction',
} as const satisfies Record<Option, keyof SuiTransactionBlockResponse>;

const INCLUDE_SECTIONS = Object.keys(
	MAPPABLE_TRANSACTION_INCLUDE,
) as (keyof typeof MAPPABLE_TRANSACTION_INCLUDE)[];

let bytes: Uint8Array;
let transaction: MappableTransaction;

beforeAll(async () => {
	const fresh = await freshTransaction();
	bytes = fresh.bytes;
	transaction = executedTransaction(fresh.data);
});

function build(context: Partial<Parameters<typeof transactionBlockResponseFromExecution>[1]> = {}) {
	return transactionBlockResponseFromExecution(transaction, {
		bytes,
		signatures: [SIGNATURE],
		...context,
	});
}

/**
 * The execution as a parse with `include` would deliver it: every section left
 * out throws on access, which is what reading an absent one costs a mapper.
 */
function parsedWith(include: SuiClientTypes.TransactionInclude): MappableTransaction {
	const absent: PropertyDescriptorMap = {};

	for (const section of INCLUDE_SECTIONS) {
		if (!include[section]) {
			absent[section] = {
				get() {
					throw new Error(`${section} was not included`);
				},
			};
		}
	}

	return Object.create(transaction, absent) as MappableTransaction;
}

/** Whether a response built for `option` actually carries that option's field. */
function mapped(option: Option, include: SuiClientTypes.TransactionInclude) {
	const response = transactionBlockResponseFromExecution(parsedWith(include), {
		bytes,
		signatures: [SIGNATURE],
		options: { [option]: true },
	});

	return response[RESPONSE_FIELD[option]] !== undefined;
}

describe('options', () => {
	test('returns only the always-present fields when no options are given', () => {
		const response = build();

		expect(response.digest).toBe(TX_DIGEST);
		expect(response.transaction).toBeUndefined();
		expect(response.effects).toBeUndefined();
		expect(response.events).toBeUndefined();
		expect(response.objectChanges).toBeUndefined();
		expect(response.balanceChanges).toBeUndefined();
		expect(response.rawTransaction).toBeUndefined();
		expect(response.rawEffects).toBeUndefined();
	});

	test('showInput returns the transaction data and the submitted signatures', () => {
		const response = build({ options: { showInput: true } });

		expect(response.transaction?.txSignatures).toEqual([SIGNATURE]);
		expect(response.transaction?.data.sender).toBe(SENDER);
		expect(response.transaction?.data.gasData.owner).toBe(SENDER);
		expect(response.transaction?.data.gasData.budget).toBe('2000000');
		expect(response.effects).toBeUndefined();
	});

	test('showRawInput returns SenderSignedData that round-trips to the executed bytes', () => {
		const response = build({ options: { showRawInput: true } });

		expect(response.rawTransaction).toBeTypeOf('string');
		const [signed] = bcs.SenderSignedData.parse(fromBase64(response.rawTransaction!));
		expect(bcs.TransactionData.serialize(signed.intentMessage.value).toBytes()).toEqual(bytes);
		expect(signed.txSignatures).toHaveLength(1);
	});

	test('showEffects returns the mapped legacy effects', () => {
		const response = build({ options: { showEffects: true } });

		expect(response.effects?.status).toEqual({ status: 'success' });
		expect(response.effects?.transactionDigest).toBe(TX_DIGEST);
		expect(response.effects?.created?.[0]?.reference.objectId).toBe(CREATED_OBJECT_ID);
	});

	test('showRawInput accepts the executed bytes as base64', () => {
		const fromBytes = build({ options: { showRawInput: true } });
		const fromBase64String = build({
			bytes: toBase64(bytes),
			options: { showRawInput: true },
		});

		expect(fromBase64String.rawTransaction).toBe(fromBytes.rawTransaction);
	});

	test('showRawEffects returns the effects BCS as a byte array', () => {
		expect(build({ options: { showRawEffects: true } }).rawEffects).toEqual([1, 2, 3, 4]);
	});

	test('showRawEffects omits rawEffects when the node sent no effects BCS', () => {
		const withoutBcs = {
			...transaction,
			effects: { ...transaction.effects, bcs: null },
		} as MappableTransaction;

		const response = transactionBlockResponseFromExecution(withoutBcs, {
			bytes,
			signatures: [SIGNATURE],
			options: { showRawEffects: true },
		});

		expect(response.rawEffects).toBeUndefined();
	});

	test('showRawEffects omits rawEffects when the effects BCS is empty', () => {
		const emptyBcs = {
			...transaction,
			effects: { ...transaction.effects, bcs: new Uint8Array(0) },
		} as MappableTransaction;

		const response = transactionBlockResponseFromExecution(emptyBcs, {
			bytes,
			signatures: [SIGNATURE],
			options: { showRawEffects: true },
		});

		expect(response.rawEffects).toBeUndefined();
	});

	test('showEvents returns the mapped events', () => {
		const response = build({ options: { showEvents: true } });

		expect(response.events).toHaveLength(1);
		expect(response.events?.[0]?.type).toBe('0x2::demo::Event');
		expect(response.events?.[0]?.id).toEqual({ txDigest: TX_DIGEST, eventSeq: '0' });
	});

	test('showObjectChanges returns the mapped object changes', () => {
		const response = build({ options: { showObjectChanges: true } });

		expect(response.objectChanges?.some((change) => change.type === 'created')).toBe(true);
	});

	test('showBalanceChanges returns the mapped balance changes', () => {
		const response = build({ options: { showBalanceChanges: true } });

		expect(response.balanceChanges).toEqual([
			{ amount: '-123', coinType: '0x2::sui::SUI', owner: { AddressOwner: SENDER } },
			{ amount: '123', coinType: '0x2::sui::SUI', owner: { AddressOwner: RECIPIENT } },
		]);
	});

	test('every option together populates every section', () => {
		const response = build({ options: EVERY_OPTION });

		expect(response.transaction).toBeDefined();
		expect(response.rawTransaction).toBeDefined();
		expect(response.effects).toBeDefined();
		expect(response.rawEffects).toBeDefined();
		expect(response.events).toBeDefined();
		expect(response.objectChanges).toBeDefined();
		expect(response.balanceChanges).toBeDefined();
	});
});

describe('fidelity limits', () => {
	test('timestampMs, checkpoint and errors are empty on execute', () => {
		const response = build({ options: EVERY_OPTION });

		expect(response.timestampMs).toBeNull();
		expect(response.checkpoint).toBeNull();
		expect(response.errors).toEqual([]);
	});

	test('confirmedLocalExecution is true only when the dApp waited and our wait resolved', () => {
		expect(
			build({ requestType: 'WaitForLocalExecution', waited: true }).confirmedLocalExecution,
		).toBe(true);
		expect(
			build({ requestType: 'WaitForLocalExecution', waited: false }).confirmedLocalExecution,
		).toBe(false);
		expect(build({ requestType: 'WaitForEffectsCert', waited: true }).confirmedLocalExecution).toBe(
			false,
		);
		expect(build().confirmedLocalExecution).toBe(false);
	});

	test('an omitted requestType is WaitForEffectsCert even when sections are asked for', () => {
		expect(build({ options: EVERY_OPTION, waited: true }).confirmedLocalExecution).toBe(false);
	});

	test('a Move abort surfaces as effects.abortError, only on the execute path', () => {
		const aborted = {
			...transaction,
			status: {
				success: false,
				error: {
					$kind: 'MoveAbort',
					message: 'MoveAbort',
					MoveAbort: {
						abortCode: '7',
						location: {
							package: FRAMEWORK,
							module: 'demo',
							functionName: 'do_thing',
						},
						cleverError: { lineNumber: 42 },
					},
				},
			},
		} as unknown as MappableTransaction;

		const response = transactionBlockResponseFromExecution(aborted, {
			bytes,
			signatures: [SIGNATURE],
			options: { showEffects: true },
		});

		expect(response.effects?.abortError).toEqual({
			error_code: '7',
			function: 'do_thing',
			line: 42,
			module_id: `${FRAMEWORK}::demo`,
		});
	});

	test('a successful transaction carries no abortError', () => {
		expect(build({ options: { showEffects: true } }).effects?.abortError).toBeUndefined();
	});

	test('a non-abort failure carries no abortError', () => {
		const failed = {
			...transaction,
			status: {
				success: false,
				error: { $kind: 'InsufficientGas', message: 'InsufficientGas' },
			},
		} as unknown as MappableTransaction;

		const response = transactionBlockResponseFromExecution(failed, {
			bytes,
			signatures: [SIGNATURE],
			options: { showEffects: true },
		});

		expect(response.effects?.abortError).toBeUndefined();
	});

	test('a section that cannot be mapped is omitted, and the rest still returns', () => {
		// `objectTypes` is what the object-change mapper reads; drop it and that
		// section alone should fail.
		const unmappable = {
			...transaction,
			get objectTypes(): never {
				throw new Error('objectTypes unavailable');
			},
		} as unknown as MappableTransaction;

		const response = transactionBlockResponseFromExecution(unmappable, {
			bytes,
			signatures: [SIGNATURE],
			options: EVERY_OPTION,
		});

		expect(response.objectChanges).toBeUndefined();
		expect(response.digest).toBe(TX_DIGEST);
		expect(response.rawTransaction).toBeDefined();
		expect(response.rawEffects).toEqual([1, 2, 3, 4]);
		expect(response.effects).toBeDefined();
	});
});

describe('published object changes', () => {
	/**
	 * Minimal Move `CompiledModule` bytes naming one module. `readMoveModuleName`
	 * reads the header, the module-handle table and the identifier table only, so
	 * nothing else has to be there.
	 */
	function compiledModule(name: string): number[] {
		const identifier = [name.length, ...new TextEncoder().encode(name)];

		return [
			0xa1,
			0x1c,
			0xeb,
			0x0b,
			6,
			0,
			0,
			0, // magic, version
			2,
			0x1,
			0,
			2,
			0x7,
			2,
			identifier.length, // module-handle and identifier tables
			0,
			0, // one module handle, naming identifier 0
			...identifier,
			0, // self module handle index
		];
	}

	/** An execution of `commands` whose only change is writing a new package. */
	function packageWritingExecution(commands: (tx: Transaction) => void): MappableTransaction {
		const tx = new Transaction();
		tx.setSender(SENDER);
		commands(tx);

		return {
			...transaction,
			transaction: programmableTransactionData(tx.getData()),
			objectTypes: {},
			effects: {
				...transaction.effects,
				changedObjects: [
					{
						objectId: PACKAGE_ID,
						inputState: 'DoesNotExist',
						inputVersion: null,
						inputDigest: null,
						inputOwner: null,
						outputState: 'PackageWrite',
						outputVersion: '2',
						outputDigest: PACKAGE_DIGEST,
						outputOwner: null,
						idOperation: 'Created',
					},
				],
			},
		} as unknown as MappableTransaction;
	}

	function modulesOf(executed: MappableTransaction) {
		const [change] = transactionBlockResponseFromExecution(executed, {
			bytes,
			signatures: [SIGNATURE],
			options: { showObjectChanges: true },
		}).objectChanges!;

		expect(change).toMatchObject({ type: 'published', packageId: PACKAGE_ID });
		return (change as { modules: string[] }).modules;
	}

	test('carry the module names of a publish command', () => {
		const executed = packageWritingExecution((tx) => {
			tx.publish({
				modules: [compiledModule('demo')],
				dependencies: [FRAMEWORK],
			});
		});

		expect(modulesOf(executed)).toEqual(['demo']);
	});

	test('carry the module names of an upgrade command', () => {
		const executed = packageWritingExecution((tx) => {
			const ticket = tx.moveCall({
				target: `${FRAMEWORK}::package::authorize_upgrade`,
			});
			tx.upgrade({
				modules: [compiledModule('demo_v2')],
				dependencies: [FRAMEWORK],
				package: PACKAGE_ID,
				ticket,
			});
		});

		expect(modulesOf(executed)).toEqual(['demo_v2']);
	});
});

describe('mappableIncludeFor', () => {
	test('asks for nothing but the effects when no section will be mapped', () => {
		for (const options of [undefined, null, {}, { showRawEffects: true, showRawInput: true }]) {
			expect(mappableIncludeFor(options)).toEqual({ effects: true });
		}
	});

	// The include and the mappers have to stay in step: an option mapped from a
	// section the execution was not asked for throws inside the response
	// builder, and is silently omitted from the dApp's response.
	test('asks for every section the requested option reads', () => {
		for (const option of Object.keys(EVERY_OPTION) as Option[]) {
			const include = mappableIncludeFor({ [option]: true });

			expect({ option, mapped: mapped(option, include) }).toEqual({ option, mapped: true });
		}
	});

	test('asks for nothing above the effects floor that the option does not read', () => {
		for (const option of Object.keys(EVERY_OPTION) as Option[]) {
			const include = mappableIncludeFor({ [option]: true });
			const beyondTheFloor = INCLUDE_SECTIONS.filter(
				(section) => section !== 'effects' && include[section],
			);

			for (const section of beyondTheFloor) {
				const without = { ...include, [section]: false };

				expect({ option, section, mapped: mapped(option, without) }).toEqual({
					option,
					section,
					mapped: false,
				});
			}
		}
	});

	test('unions the sections of every option it is given', () => {
		expect(mappableIncludeFor({ showBalanceChanges: true })).toEqual({
			balanceChanges: true,
			effects: true,
		});
		expect(mappableIncludeFor({ showEvents: true, showInput: true })).toEqual({
			effects: true,
			events: true,
			transaction: true,
		});
		expect(mappableIncludeFor(EVERY_OPTION)).toEqual(MAPPABLE_TRANSACTION_INCLUDE);
	});
});

describe('type contract', () => {
	test('accepts a core transaction parsed with every include section', () => {
		const typed: SuiClientTypes.Transaction<{
			balanceChanges: true;
			effects: true;
			events: true;
			objectTypes: true;
			transaction: true;
		}> = transaction;

		expect(
			transactionBlockResponseFromExecution(typed, {
				bytes,
				signatures: [SIGNATURE],
			}).digest,
		).toBe(TX_DIGEST);
	});
});

describe('partial includes', () => {
	test('types only the sections the options are known to request', () => {
		type Parsed<Include extends SuiClientTypes.TransactionInclude> =
			SuiClientTypes.Transaction<Include>;

		const rawOnly = mappableIncludeFor({ showRawEffects: true, showRawInput: true });
		expectTypeOf<
			Parsed<typeof rawOnly>['effects']
		>().toEqualTypeOf<SuiClientTypes.TransactionEffects>();
		expectTypeOf<Parsed<typeof rawOnly>['events']>().toEqualTypeOf<undefined>();
		expectTypeOf<Parsed<typeof rawOnly>['balanceChanges']>().toEqualTypeOf<undefined>();

		const events = mappableIncludeFor({ showEvents: true });
		expectTypeOf<Parsed<typeof events>['events']>().toEqualTypeOf<SuiClientTypes.Event[]>();
		expectTypeOf<Parsed<typeof events>['transaction']>().toEqualTypeOf<undefined>();

		// A dApp's options are only known at runtime, so nothing past the
		// effects floor can be promised.
		const requested = {} as SuiTransactionBlockResponseOptions | null | undefined;
		const dynamic = mappableIncludeFor(requested);
		expectTypeOf<
			Parsed<typeof dynamic>['effects']
		>().toEqualTypeOf<SuiClientTypes.TransactionEffects>();
		expectTypeOf<Parsed<typeof dynamic>['events']>().toEqualTypeOf<undefined>();
		expectTypeOf<Parsed<typeof dynamic>['objectTypes']>().toEqualTypeOf<undefined>();
		expectTypeOf(mappableIncludeFor(requested)).toExtend<SuiClientTypes.TransactionInclude>();
		expectTypeOf<Parsed<typeof dynamic>>().toExtend<
			Parameters<typeof transactionBlockResponseFromExecution>[0]
		>();

		expectTypeOf<
			Parsed<ReturnType<typeof mappableIncludeFor>>['events']
		>().toEqualTypeOf<undefined>();
	});

	test('types each member of a union of options with its own sections', () => {
		type Parsed<Include extends SuiClientTypes.TransactionInclude> =
			SuiClientTypes.Transaction<Include>;

		const options = { showEvents: true } as
			{ readonly showEvents: true } | { readonly showBalanceChanges: true };
		const include = mappableIncludeFor(options);

		expectTypeOf(include).toEqualTypeOf<
			MappableIncludeFor<{ showEvents: true }> | MappableIncludeFor<{ showBalanceChanges: true }>
		>();
		expectTypeOf<Parsed<MappableIncludeFor<{ showEvents: true }>>['events']>().toEqualTypeOf<
			SuiClientTypes.Event[]
		>();
		expectTypeOf<
			Parsed<MappableIncludeFor<{ showBalanceChanges: true }>>['balanceChanges']
		>().toEqualTypeOf<SuiClientTypes.BalanceChange[]>();

		if ('events' in include) {
			expectTypeOf(include.events).toEqualTypeOf<true>();
		} else {
			expectTypeOf(include.balanceChanges).toEqualTypeOf<true>();
		}
	});

	test('omits a requested field whose sections the execution was not parsed with', () => {
		// What the Core API returns for `include: { effects: true }`: the other
		// sections are undefined, not missing getters.
		const effectsOnly: SuiClientTypes.Transaction<{ effects: true }> = {
			...transaction,
			balanceChanges: undefined,
			events: undefined,
			objectTypes: undefined,
			transaction: undefined,
			bcs: undefined,
		};

		const response = transactionBlockResponseFromExecution(effectsOnly, {
			bytes,
			signatures: [SIGNATURE],
			options: EVERY_OPTION,
		});

		expect(response.digest).toBe(TX_DIGEST);
		expect(response.rawEffects).toEqual([1, 2, 3, 4]);
		expect(response.rawTransaction).toBeDefined();
		expect(response.effects).toBeUndefined();
		expect(response.events).toBeUndefined();
		expect(response.objectChanges).toBeUndefined();
		expect(response.balanceChanges).toBeUndefined();
		expect(response.transaction).toBeUndefined();
	});

	test('accepts an execution parsed with the include it computed', () => {
		const options = { showEffects: true, showBalanceChanges: true } as const;
		const include = mappableIncludeFor(options);
		const parsed: SuiClientTypes.Transaction<typeof include> = transaction;

		const response = transactionBlockResponseFromExecution(parsed, {
			bytes,
			signatures: [SIGNATURE],
			options,
		});

		expect(response.effects).toBeDefined();
		expect(response.balanceChanges).toHaveLength(2);
	});
});

describe('transaction kinds', () => {
	test('leave out every section that needs the transaction body for a kind the client could not map', () => {
		const { kind: _, ...header } = transaction.transaction;
		const unknown = executedTransaction({ ...header, kind: { $kind: 'Unknown', Unknown: true } });
		const response = transactionBlockResponseFromExecution(unknown, {
			bytes,
			signatures: [SIGNATURE],
			options: { showInput: true, showEffects: true, showObjectChanges: true },
		});

		expect(response.transaction).toBeUndefined();
		expect(response.effects).toBeUndefined();
		expect(response.objectChanges).toBeUndefined();
	});

	test('map effects and object changes of a system transaction but leave out the input', () => {
		const { kind: _, ...header } = transaction.transaction;
		const system = executedTransaction({
			...header,
			kind: { $kind: 'EndOfEpochTransaction', EndOfEpochTransaction: [] },
		});
		const response = transactionBlockResponseFromExecution(system, {
			bytes,
			signatures: [SIGNATURE],
			options: { showInput: true, showEffects: true, showObjectChanges: true },
		});

		expect(response.transaction).toBeUndefined();
		expect(response.effects).toEqual(build({ options: { showEffects: true } }).effects);
		expect(response.objectChanges).toEqual(
			build({ options: { showObjectChanges: true } }).objectChanges,
		);
	});
});
