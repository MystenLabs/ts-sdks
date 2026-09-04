// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { TransactionCommands, Transaction } from '../../../src/transactions/index.js';
import { Inputs } from '../../../src/transactions/Inputs.js';
import type { BuildTransactionOptions } from '../../../src/transactions/resolve.js';
import type { TransactionDataBuilder } from '../../../src/transactions/TransactionData.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

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

	it('builds a transaction kind with CoinWithBalance using assumed address balances', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.transferObjects([tx.coin({ type: '0x123::test::TOKEN', balance: 100 })], '0x3');

		await tx.build({
			onlyTransactionKind: true,
			assumeSufficientAddressBalances: true,
		});
	});

	it('repeatedly builds a full transaction using address balance gas with an expiration', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.setExpiration({
			ValidDuring: {
				minEpoch: 100,
				maxEpoch: 101,
				minTimestamp: null,
				maxTimestamp: null,
				chain: toBase58(new Uint8Array(32)),
				nonce: 0,
			},
		});
		tx.transferObjects([tx.coin({ type: '0x123::test::TOKEN', balance: 100 })], '0x3');

		await tx.build({ assumeSufficientAddressBalances: true });
		await tx.build({ assumeSufficientAddressBalances: true });

		expect(tx.getData().gasData.payment).toEqual([]);
	});

	it('gets a digest offline using assumed address balances', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.setExpiration({
			ValidDuring: {
				minEpoch: 100,
				maxEpoch: 101,
				minTimestamp: null,
				maxTimestamp: null,
				chain: toBase58(new Uint8Array(32)),
				nonce: 0,
			},
		});
		tx.transferObjects([tx.coin({ type: '0x123::test::TOKEN', balance: 100 })], '0x3');

		await expect(tx.getDigest({ assumeSufficientAddressBalances: true })).resolves.toBeTypeOf(
			'string',
		);
	});

	it('does not treat an owned object input as replay protection', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.transferObjects([tx.objectRef(ref())], '0x3');

		await expect(tx.build({ assumeSufficientAddressBalances: true })).rejects.toThrow(
			'No sui client passed to Transaction#build',
		);
		expect(tx.getData().gasData.payment).toBeNull();
	});

	it.each([{ Epoch: 100 } as const, { None: true } as const])(
		'does not treat %o expiration as address balance replay protection',
		async (expiration) => {
			const tx = new Transaction();
			tx.setSender('0x2');
			tx.setGasPrice(1);
			tx.setGasBudget(1_000_000);
			tx.setExpiration(expiration);

			await expect(tx.build({ assumeSufficientAddressBalances: true })).rejects.toThrow(
				'No sui client passed to Transaction#build',
			);
			expect(tx.getData().gasData.payment).toBeNull();
		},
	);

	it('preserves resolution behavior for an explicitly empty gas payment', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.setGasPayment([]);
		tx.transferObjects([tx.objectRef(ref())], '0x3');

		await expect(tx.build()).rejects.toThrow('No sui client passed to Transaction#build');
		await expect(tx.build({ assumeSufficientAddressBalances: true })).rejects.toThrow(
			'No sui client passed to Transaction#build',
		);
		expect(tx.getData().gasData.payment).toEqual([]);
	});

	it('keeps address balance gas payment for later builds without the assumption', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.setExpiration({
			ValidDuring: {
				minEpoch: 100,
				maxEpoch: 101,
				minTimestamp: null,
				maxTimestamp: null,
				chain: toBase58(new Uint8Array(32)),
				nonce: 0,
			},
		});
		tx.transferObjects([tx.coin({ type: '0x123::test::TOKEN', balance: 100 })], '0x3');

		const assumedBytes = await tx.build({ assumeSufficientAddressBalances: true });
		expect(tx.getData().gasData.payment).toEqual([]);

		// The selected payment is now part of the transaction, exactly like `setGasPayment([])`.
		expect(await tx.build()).toEqual(assumedBytes);
	});

	it('does not apply the gas assumption when transaction resolution is needed', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		const payment = ref();
		const resolver = vi.fn(
			async (
				transactionData: TransactionDataBuilder,
				options: BuildTransactionOptions,
				next: () => Promise<void>,
			) => {
				expect(transactionData.gasData.payment).toBeNull();
				expect(options.assumeSufficientAddressBalances).toBe(true);
				transactionData.gasData.payment = [payment];
				await next();
			},
		);

		await tx.build({
			client: {
				core: {
					resolveTransactionPlugin: () => resolver,
				},
			} as any,
			assumeSufficientAddressBalances: true,
		});

		expect(resolver).toHaveBeenCalledOnce();
		expect(tx.getData().gasData.payment).toHaveLength(1);
	});

	it('does not use address balance gas when the gas coin is referenced', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.setExpiration({
			ValidDuring: {
				minEpoch: 100,
				maxEpoch: 101,
				minTimestamp: null,
				maxTimestamp: null,
				chain: toBase58(new Uint8Array(32)),
				nonce: 0,
			},
		});
		tx.splitCoins(tx.gas, [100]);

		await expect(tx.build({ assumeSufficientAddressBalances: true })).rejects.toThrow(
			'No sui client passed to Transaction#build',
		);
	});

	it('does not use address balance gas when a build plugin adds a gas coin reference', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		tx.setExpiration({
			ValidDuring: {
				minEpoch: 100,
				maxEpoch: 101,
				minTimestamp: null,
				maxTimestamp: null,
				chain: toBase58(new Uint8Array(32)),
				nonce: 0,
			},
		});
		tx.addBuildPlugin(async (transactionData, _options, next) => {
			transactionData.commands.push(
				TransactionCommands.SplitCoins({ $kind: 'GasCoin', GasCoin: true }, [
					transactionData.addInput('pure', Inputs.Pure(bcs.U64.serialize(1))),
				]),
			);
			await next();
		});

		await expect(tx.build({ assumeSufficientAddressBalances: true })).rejects.toThrow(
			'No sui client passed to Transaction#build',
		);
		expect(tx.getData().gasData.payment).toBeNull();
	});

	it('preserves an explicitly configured gas payment', async () => {
		const tx = new Transaction();
		tx.setSender('0x2');
		tx.setGasPrice(1);
		tx.setGasBudget(1_000_000);
		const payment = ref();
		tx.setGasPayment([payment]);

		await tx.build({ assumeSufficientAddressBalances: true });

		expect(tx.getData().gasData.payment).toEqual([
			expect.objectContaining({ objectId: normalizeSuiAddress(payment.objectId) }),
		]);
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
