// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '../../../src/transactions/Transaction.js';
import { TransactionDataBuilder } from '../../../src/transactions/TransactionData.js';

describe('TransactionDataBuilder.insertTransaction', () => {
	it('should merge transactions with input deduplication', async () => {
		const objId = '0x123';

		// Main transaction
		const mainTx = new Transaction();
		mainTx.moveCall({
			target: '0x1::main::func',
			arguments: [mainTx.object(objId)],
		});

		// Other transaction uses SAME object
		const otherTx = new Transaction();
		otherTx.moveCall({
			target: '0x2::other::func',
			arguments: [otherTx.object(objId)],
		});

		await mainTx.prepareForSerialization({});
		await otherTx.prepareForSerialization({});

		const mainData = mainTx.getData();
		const otherData = otherTx.getData();
		const mainBuilder = TransactionDataBuilder.restore(mainData);

		mainBuilder.insertTransaction(1, otherData);

		// Should deduplicate - only 1 object input (may be Object or UnresolvedObject)
		const objectInputs = mainBuilder.inputs.filter(
			(input) => input.Object || input.UnresolvedObject,
		);
		expect(objectInputs.length).toBe(1);

		// Both commands should use the same input
		expect(mainBuilder.commands[0].MoveCall?.arguments[0]).toMatchObject({
			$kind: 'Input',
			Input: 0,
		});
		expect(mainBuilder.commands[1].MoveCall?.arguments[0]).toMatchObject({
			$kind: 'Input',
			Input: 0,
		});
	});

	it('should remap Result references correctly', async () => {
		const mainTx = new Transaction();
		const result1 = mainTx.moveCall({
			target: '0x1::main::func1',
			arguments: [],
		});

		mainTx.moveCall({
			target: '0x1::main::func2',
			arguments: [result1], // References command 0
		});

		// Other transaction with internal Result reference
		const otherTx = new Transaction();
		const otherResult1 = otherTx.moveCall({
			target: '0x2::other::step1',
			arguments: [],
		});
		otherTx.moveCall({
			target: '0x2::other::step2',
			arguments: [otherResult1], // References command 0 in other tx
		});

		await mainTx.prepareForSerialization({});
		await otherTx.prepareForSerialization({});

		const mainData = mainTx.getData();
		const otherData = otherTx.getData();
		const mainBuilder = TransactionDataBuilder.restore(mainData);

		// Insert at position 1
		mainBuilder.insertTransaction(1, otherData);

		// Commands: func1(0), step1(1), step2(2), func2(3)
		// step2 should reference step1 (command 1)
		expect(mainBuilder.commands[2].MoveCall?.arguments[0]).toEqual({ $kind: 'Result', Result: 1 });

		// func2 should still reference func1 (command 0)
		expect(mainBuilder.commands[3].MoveCall?.arguments[0]).toEqual({ $kind: 'Result', Result: 0 });
	});

	it('should upgrade shared object mutability', async () => {
		const sharedObjId = '0xabc';

		const mainTx = new Transaction();
		mainTx.moveCall({
			target: '0x1::main::func',
			arguments: [
				mainTx.sharedObjectRef({ objectId: sharedObjId, initialSharedVersion: 1, mutable: false }),
			],
		});

		const otherTx = new Transaction();
		otherTx.moveCall({
			target: '0x2::other::func',
			arguments: [
				otherTx.sharedObjectRef({ objectId: sharedObjId, initialSharedVersion: 1, mutable: true }),
			],
		});

		await mainTx.prepareForSerialization({});
		await otherTx.prepareForSerialization({});

		const mainBuilder = TransactionDataBuilder.restore(mainTx.getData());
		mainBuilder.insertTransaction(1, otherTx.getData());

		// Should be deduplicated and upgraded to mutable
		const sharedInput = mainBuilder.inputs[0];
		expect(sharedInput.Object?.SharedObject?.mutable).toBe(true);
	});

	it('should insert at beginning, middle, and end', async () => {
		const createTx = (name: string) => {
			const tx = new Transaction();
			tx.moveCall({ target: `0x1::${name}::func`, arguments: [] });
			return tx;
		};

		// Insert at beginning
		const tx1 = createTx('main');
		const toInsert1 = createTx('insert');
		await tx1.prepareForSerialization({});
		await toInsert1.prepareForSerialization({});
		const builder1 = TransactionDataBuilder.restore(tx1.getData());
		builder1.insertTransaction(0, toInsert1.getData());
		expect(builder1.commands[0].MoveCall?.module).toBe('insert');
		expect(builder1.commands[1].MoveCall?.module).toBe('main');

		// Insert at end
		const tx2 = createTx('main');
		const toInsert2 = createTx('insert');
		await tx2.prepareForSerialization({});
		await toInsert2.prepareForSerialization({});
		const builder2 = TransactionDataBuilder.restore(tx2.getData());
		builder2.insertTransaction(1, toInsert2.getData());
		expect(builder2.commands[0].MoveCall?.module).toBe('main');
		expect(builder2.commands[1].MoveCall?.module).toBe('insert');
	});
});
