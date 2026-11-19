// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import type { CoreClient } from '../../../src/client/core.js';
import { resolveUnresolvedPureInputs } from '../../../src/client/resolve-pure-inputs.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { TransactionCommands } from '../../../src/transactions/Commands.js';
import { Inputs } from '../../../src/transactions/Inputs.js';
import { TransactionDataBuilder } from '../../../src/transactions/TransactionData.js';

const ADDRESS = '0x' + 'a'.repeat(64);
const OBJECT_ID = '0x' + 'b'.repeat(64);

const u64: SuiClientTypes.OpenSignature = { reference: null, body: { $kind: 'u64' } };
const address: SuiClientTypes.OpenSignature = { reference: null, body: { $kind: 'address' } };
const bytes: SuiClientTypes.OpenSignature = {
	reference: null,
	body: { $kind: 'vector', vector: { $kind: 'u8' } },
};
const string: SuiClientTypes.OpenSignature = {
	reference: null,
	body: {
		$kind: 'datatype',
		datatype: { typeName: '0x1::string::String', typeParameters: [] },
	},
};
const object: SuiClientTypes.OpenSignature = {
	reference: 'mutable',
	body: {
		$kind: 'datatype',
		datatype: { typeName: '0x2::coin::Coin', typeParameters: [{ $kind: 'unknown' }] },
	},
};
const txContext: SuiClientTypes.OpenSignature = {
	reference: 'mutable',
	body: {
		$kind: 'datatype',
		datatype: { typeName: '0x2::tx_context::TxContext', typeParameters: [] },
	},
};

function mockClient(parameters: SuiClientTypes.OpenSignature[]) {
	const getMoveFunction = vi.fn(async (options: SuiClientTypes.GetMoveFunctionOptions) => ({
		function: {
			packageId: options.packageId,
			moduleName: options.moduleName,
			name: options.name,
			visibility: 'public' as const,
			isEntry: false,
			typeParameters: [],
			parameters,
			returns: [],
		},
	}));
	return {
		client: { core: { getMoveFunction } } as unknown as {
			core: Pick<CoreClient, 'getMoveFunction'>;
		},
		getMoveFunction,
	};
}

function txWithMoveCall(values: unknown[], target = '0x2::test::run') {
	const data = new TransactionDataBuilder();
	const args = values.map((value) =>
		data.addInput('pure', { $kind: 'UnresolvedPure', UnresolvedPure: { value } }),
	);
	data.commands.push(TransactionCommands.MoveCall({ target, arguments: args }));
	return data;
}

describe('resolveUnresolvedPureInputs', () => {
	it('serializes raw values with the parameter types of the target function', async () => {
		const { client, getMoveFunction } = mockClient([u64, address, bytes, string]);
		const data = txWithMoveCall([123, ADDRESS, [1, 2, 3], 'hello']);

		await resolveUnresolvedPureInputs(data, client);

		expect(getMoveFunction).toHaveBeenCalledTimes(1);
		expect(getMoveFunction).toHaveBeenCalledWith(
			expect.objectContaining({ packageId: '0x2', moduleName: 'test', name: 'run' }),
		);
		expect(data.inputs).toEqual([
			Inputs.Pure(bcs.u64().serialize(123).toBytes()),
			Inputs.Pure(bcs.Address.serialize(ADDRESS).toBytes()),
			Inputs.Pure(bcs.vector(bcs.u8()).serialize([1, 2, 3]).toBytes()),
			Inputs.Pure(bcs.string().serialize('hello').toBytes()),
		]);
		expect(
			(data.commands[0].MoveCall!.arguments as { type?: string }[]).map((arg) => arg.type),
		).toEqual(['pure', 'pure', 'pure', 'pure']);
	});

	it('turns a raw value passed to an object parameter into an UnresolvedObject', async () => {
		const { client } = mockClient([object, u64]);
		const data = txWithMoveCall([OBJECT_ID, '5']);

		await resolveUnresolvedPureInputs(data, client);

		expect(data.inputs[0]).toEqual({
			$kind: 'UnresolvedObject',
			UnresolvedObject: { objectId: OBJECT_ID },
		});
		expect(data.inputs[1]).toEqual(Inputs.Pure(bcs.u64().serialize(5).toBytes()));
		expect((data.commands[0].MoveCall!.arguments[0] as { type?: string }).type).toBe('object');
	});

	it('rejects a non-string value passed to an object parameter', async () => {
		const { client } = mockClient([object]);
		const data = txWithMoveCall([42]);

		await expect(resolveUnresolvedPureInputs(data, client)).rejects.toThrow(
			'Expect the argument to be an object id string',
		);
	});

	it('strips a trailing TxContext parameter', async () => {
		const { client } = mockClient([u64, txContext]);
		const data = txWithMoveCall([7]);

		await resolveUnresolvedPureInputs(data, client);

		expect(data.commands[0].MoveCall!._argumentTypes).toEqual([u64]);
		expect(data.inputs[0]).toEqual(Inputs.Pure(bcs.u64().serialize(7).toBytes()));
	});

	it('throws when the number of arguments does not match the function', async () => {
		const { client } = mockClient([u64, u64]);
		const data = txWithMoveCall([1]);

		await expect(resolveUnresolvedPureInputs(data, client)).rejects.toThrow(
			'Incorrect number of arguments for 0x2::test::run',
		);
	});

	it('fetches each distinct target once', async () => {
		const { client, getMoveFunction } = mockClient([u64]);
		const data = txWithMoveCall([1]);
		const second = data.addInput('pure', { $kind: 'UnresolvedPure', UnresolvedPure: { value: 2 } });
		data.commands.push(
			TransactionCommands.MoveCall({ target: '0x2::test::run', arguments: [second] }),
		);

		await resolveUnresolvedPureInputs(data, client);

		expect(getMoveFunction).toHaveBeenCalledTimes(1);
		expect(data.inputs.every((input) => input.$kind === 'Pure')).toBe(true);
	});

	it('makes no requests when there are no raw pure values', async () => {
		const { client, getMoveFunction } = mockClient([object]);
		const data = new TransactionDataBuilder();
		const arg = data.addInput('object', {
			$kind: 'UnresolvedObject',
			UnresolvedObject: { objectId: OBJECT_ID },
		});
		data.commands.push(
			TransactionCommands.MoveCall({ target: '0x2::test::run', arguments: [arg] }),
		);
		const before = structuredClone(data.snapshot());

		await resolveUnresolvedPureInputs(data, client);

		expect(getMoveFunction).not.toHaveBeenCalled();
		expect(data.snapshot()).toEqual(before);
	});

	it('fetches signatures for ambiguous object inputs when resolveObjectArgumentTypes is set', async () => {
		const { client, getMoveFunction } = mockClient([object]);
		const data = new TransactionDataBuilder();
		const arg = data.addInput('object', {
			$kind: 'UnresolvedObject',
			UnresolvedObject: { objectId: OBJECT_ID },
		});
		data.commands.push(
			TransactionCommands.MoveCall({ target: '0x2::test::run', arguments: [arg] }),
		);

		await resolveUnresolvedPureInputs(data, client, { resolveObjectArgumentTypes: true });

		expect(getMoveFunction).toHaveBeenCalledTimes(1);
		expect(data.commands[0].MoveCall!._argumentTypes).toEqual([object]);
	});

	it('passes the abort signal to getMoveFunction and stops when already aborted', async () => {
		const { client, getMoveFunction } = mockClient([u64]);
		const controller = new AbortController();

		await resolveUnresolvedPureInputs(txWithMoveCall([1]), client, { signal: controller.signal });
		expect(getMoveFunction).toHaveBeenCalledWith(
			expect.objectContaining({ signal: controller.signal }),
		);

		controller.abort();
		await expect(
			resolveUnresolvedPureInputs(txWithMoveCall([1]), client, { signal: controller.signal }),
		).rejects.toThrow();
		expect(getMoveFunction).toHaveBeenCalledTimes(1);
	});
});
