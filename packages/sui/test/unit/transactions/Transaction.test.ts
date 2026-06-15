// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { TransactionCommands, Transaction } from '../../../src/transactions/index.js';
import { Inputs } from '../../../src/transactions/Inputs.js';
import type { BuildTransactionOptions } from '../../../src/transactions/resolve.js';
import type { TransactionDataBuilder } from '../../../src/transactions/TransactionData.js';

it('can construct and serialize an empty tranaction', () => {
	const tx = new Transaction();
	expect(() => tx.serialize()).not.toThrow();
});

it('can construct a receiving transaction argument', () => {
	const tx = new Transaction();
	tx.object(Inputs.ReceivingRef(ref()));
	expect(() => tx.serialize()).not.toThrow();
});

it('receiving transaction argument different from object argument', () => {
	const oref = ref();
	const rtx = new Transaction();
	rtx.object(Inputs.ReceivingRef(oref));
	const otx = new Transaction();
	otx.object(Inputs.ObjectRef(oref));
	expect(() => rtx.serialize()).not.toThrow();
	expect(() => otx.serialize()).not.toThrow();
	expect(otx.serialize()).not.toEqual(rtx.serialize());
});

it('can be serialized and deserialized to the same values', () => {
	const tx = new Transaction();
	tx.add(TransactionCommands.SplitCoins(tx.gas, [tx.pure.u64(100)]));
	const serialized = tx.serialize();
	const tx2 = Transaction.from(serialized);
	expect(serialized).toEqual(tx2.serialize());
});

it('allows transfer with the result of split Commands', () => {
	const tx = new Transaction();
	const coin = tx.add(TransactionCommands.SplitCoins(tx.gas, [tx.pure.u64(100)]));
	tx.add(TransactionCommands.TransferObjects([coin], tx.object('0x2')));
});

it('supports nested results through either array index or destructuring', () => {
	const tx = new Transaction();
	const registerResult = tx.add(
		TransactionCommands.MoveCall({
			target: '0x2::game::register',
		}),
	);

	const [nft, account] = registerResult;

	// NOTE: This might seem silly but destructuring works differently than property access.
	expect(nft).toBe(registerResult[0]);
	expect(account).toBe(registerResult[1]);
});

describe('offline build', () => {
	it('builds an empty transaction offline when provided sufficient data', async () => {
		const tx = setup();
		await tx.build();
	});

	it('supports epoch expiration', async () => {
		const tx = setup();
		tx.setExpiration({ Epoch: 1 });
		await tx.build();
	});

	it('builds a split transaction', async () => {
		const tx = setup();
		tx.add(TransactionCommands.SplitCoins(tx.gas, [tx.pure.u64(100)]));
		await tx.build();
	});

	it('breaks reference equality', () => {
		const tx = setup();
		const tx2 = Transaction.from(tx);

		tx.setGasBudget(999);

		// Ensure that setting budget after a clone does not affect the original:
		expect(tx2.getData()).not.toEqual(tx.getData());

		// Ensure `getData()` always breaks reference equality:
		expect(tx.getData()).not.toBe(tx.getData());
		expect(tx.getData().gasData).not.toBe(tx.getData().gasData);
		expect(tx.getData().commands).not.toBe(tx.getData().commands);
		expect(tx.getData().inputs).not.toBe(tx.getData().inputs);
	});

	it('can determine the type of inputs for built-in Commands', async () => {
		const tx = setup();
		tx.splitCoins(tx.gas, [100]);
		await tx.build();
	});

	it('supports pre-serialized inputs as Uint8Array', async () => {
		const tx = setup();
		const inputBytes = bcs.U64.serialize(100n).toBytes();
		// Use bytes directly in pure value:
		tx.add(TransactionCommands.SplitCoins(tx.gas, [tx.pure(inputBytes)]));
		await tx.build();
	});

	it('builds a more complex interaction', async () => {
		const tx = setup();
		const coin = tx.splitCoins(tx.gas, [100]);
		tx.add(TransactionCommands.MergeCoins(tx.gas, [coin, tx.object(Inputs.ObjectRef(ref()))]));
		tx.add(
			TransactionCommands.MoveCall({
				target: '0x2::devnet_nft::mint',
				typeArguments: [],
				arguments: [tx.pure.string('foo'), tx.pure.string('bar'), tx.pure.string('baz')],
			}),
		);
		await tx.build();
	});

	it('uses a receiving argument', async () => {
		const tx = setup();
		tx.object(Inputs.ObjectRef(ref()));
		const coin = tx.splitCoins(tx.gas, [100]);
		tx.add(TransactionCommands.MergeCoins(tx.gas, [coin, tx.object(Inputs.ObjectRef(ref()))]));
		tx.add(
			TransactionCommands.MoveCall({
				target: '0x2::devnet_nft::mint',
				typeArguments: [],
				arguments: [tx.object(Inputs.ObjectRef(ref())), tx.object(Inputs.ReceivingRef(ref()))],
			}),
		);

		const bytes = await tx.build();
		const tx2 = Transaction.from(bytes);
		const bytes2 = await tx2.build();

		expect(bytes).toEqual(bytes2);
	});

	it('builds a more complex interaction', async () => {
		const tx = setup();
		const coin = tx.splitCoins(tx.gas, [100]);
		tx.add(TransactionCommands.MergeCoins(tx.gas, [coin, tx.object(Inputs.ObjectRef(ref()))]));
		tx.add(
			TransactionCommands.MoveCall({
				target: '0x2::devnet_nft::mint',
				typeArguments: [],
				arguments: [tx.pure.string('foo'), tx.pure.string('bar'), tx.pure.string('baz')],
			}),
		);

		const bytes = await tx.build();
		const tx2 = Transaction.from(bytes);
		const bytes2 = await tx2.build();

		expect(bytes).toEqual(bytes2);
	});
});

describe('Transaction.from with custom intents', () => {
	const TEST_INTENT = 'TestIntent';

	function testIntent() {
		return (tx: Transaction) => {
			tx.addIntentResolver(TEST_INTENT, resolveTestIntent);
			return tx.add(
				TransactionCommands.Intent({
					name: TEST_INTENT,
					inputs: {},
					data: {},
				}),
			);
		};
	}

	async function resolveTestIntent(
		transactionData: TransactionDataBuilder,
		_buildOptions: BuildTransactionOptions,
		next: () => Promise<void>,
	) {
		for (let i = 0; i < transactionData.commands.length; i++) {
			const command = transactionData.commands[i];
			if (command.$kind === '$Intent' && command.$Intent.name === TEST_INTENT) {
				transactionData.replaceCommand(i, {
					$kind: 'MoveCall',
					MoveCall: {
						package: '0x1',
						module: 'test',
						function: 'test',
						typeArguments: [],
						arguments: [],
					},
				});
			}
		}

		await next();
	}

	it('throws when copying a transaction with a custom intent and no resolver', () => {
		const tx = new Transaction();
		tx.add(testIntent());

		expect(() => Transaction.from(tx)).toThrowError(/unresolved intents or async thunks/);
	});

	it('copies a transaction with a custom intent when a resolver is provided', async () => {
		const tx = new Transaction();
		const result = tx.add(testIntent());
		tx.transferObjects([result], '0x2');

		const copy = Transaction.from(tx, {
			intentResolvers: { [TEST_INTENT]: resolveTestIntent },
		});

		// The intent is preserved in the copy until it is resolved.
		expect(copy.getData().commands.some((cmd) => cmd.$Intent?.name === TEST_INTENT)).toBe(true);

		// Serializing the copy resolves the custom intent into concrete commands, with no client needed.
		const json = JSON.parse(await copy.toJSON());
		expect(json.commands.some((cmd: { $Intent?: unknown }) => cmd.$Intent)).toBe(false);
		expect(
			json.commands.some(
				(cmd: { MoveCall?: { function: string } }) => cmd.MoveCall?.function === 'test',
			),
		).toBe(true);

		// The copy resolves to the same output the original would have.
		expect(await copy.toJSON()).toEqual(await tx.toJSON());
	});

	it('accepts resolvers for intents that are not present without affecting serialization', async () => {
		const tx = new Transaction();
		tx.add(TransactionCommands.SplitCoins(tx.gas, [tx.pure.u64(100)]));

		const copy = Transaction.from(tx, {
			intentResolvers: { [TEST_INTENT]: resolveTestIntent },
		});

		// An unused resolver is registered but never runs, so the copy serializes unchanged.
		expect(await copy.toJSON()).toEqual(await tx.toJSON());
	});

	it('still copies a transaction using the built-in CoinWithBalance intent without extra options', () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		const coin = tx.coin({ balance: 100n });
		tx.transferObjects([coin], '0x2');

		const copy = Transaction.from(tx);

		expect(
			copy.getData().commands.filter((cmd) => cmd.$Intent?.name === 'CoinWithBalance'),
		).toHaveLength(1);
	});
});

function ref(): { objectId: string; version: string; digest: string } {
	return {
		objectId: (Math.random() * 100000).toFixed(0).padEnd(64, '0'),
		version: String((Math.random() * 10000).toFixed(0)),
		digest: toBase58(
			new Uint8Array([
				0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1,
				2,
			]),
		),
	};
}

function setup() {
	const tx = new Transaction();
	tx.setSender('0x2');
	tx.setGasPrice(5);
	tx.setGasBudget(100);
	tx.setGasPayment([ref()]);
	return tx;
}
