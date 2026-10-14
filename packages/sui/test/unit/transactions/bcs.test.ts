// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BcsWriter, fromHex, toBase58 } from '@mysten/bcs';
import { expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { EndOfEpochTransactionKind } from '../../../src/bcs/transactions.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/sui-types.js';

// Oooh-weeee we nailed it!
it('can serialize simplified programmable call struct', () => {
	const moveCall = {
		package: '0x2',
		module: 'display',
		function: 'new',
		typeArguments: [normalizeStructTag('0x6::capy::Capy')],
		arguments: [
			{
				$kind: 'GasCoin',
				GasCoin: true,
			},
			{
				$kind: 'NestedResult',
				NestedResult: [0, 1],
			},
			{
				$kind: 'Input',
				Input: 3,
			},
			{
				$kind: 'Result',
				Result: 1,
			},
		],
	} satisfies typeof bcs.ProgrammableMoveCall.$inferType;

	const bytes = bcs.ProgrammableMoveCall.serialize(moveCall).toBytes();
	const result = bcs.ProgrammableMoveCall.parse(bytes);

	// since we normalize addresses when (de)serializing, the returned value differs
	// only check the module and the function; ignore address comparison (it's not an issue
	// with non-0x2 addresses).
	expect(result.arguments).toEqual(moveCall.arguments);
	expect(result.function).toEqual(moveCall.function);
	expect(result.module).toEqual(moveCall.module);
	expect(normalizeSuiAddress(result.package)).toEqual(normalizeSuiAddress(moveCall.package));
	expect(result.typeArguments[0]).toEqual(moveCall.typeArguments[0]);
});

function ref(): { objectId: string; version: string; digest: string } {
	return {
		objectId: normalizeSuiAddress((Math.random() * 100000).toFixed(0).padEnd(64, '0')),
		version: String((Math.random() * 10000).toFixed(0)),
		digest: toBase58(
			new Uint8Array([
				0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1,
				2,
			]),
		),
	};
}

it.each([{ epoch: '42', proposers: [0, 2, 5] }, null])(
	'round-trips a Validity expiration with allowed proposers %j',
	(allowedProposers) => {
		const expiration = {
			Validity: {
				minEpoch: '42',
				maxEpoch: '43',
				minTimestamp: '1700000000123',
				maxTimestamp: '1700000999456',
				chain: toBase58(new Uint8Array(32).fill(7)),
				nonce: 0xc0ffee,
				allowedProposers,
			},
		} satisfies typeof bcs.TransactionExpiration.$inferInput;

		const bytes = bcs.TransactionExpiration.serialize(expiration).toBytes();
		expect(bcs.TransactionExpiration.parse(bytes)).toEqual({ $kind: 'Validity', ...expiration });
	},
);

function validityBytes(proposers: number[]) {
	return bcs.TransactionExpiration.serialize({
		Validity: {
			minEpoch: null,
			maxEpoch: null,
			minTimestamp: null,
			maxTimestamp: null,
			chain: toBase58(new Uint8Array(32).fill(7)),
			nonce: 0,
			allowedProposers: { epoch: '42', proposers },
		},
	}).toBytes();
}

it.each([[[]], [[2, 2]], [[2, 1]]])(
	'rejects invalid allowed proposer indices when encoding %j',
	(proposers) => {
		expect(() => validityBytes(proposers)).toThrow(/Allowed proposers/);
	},
);

it('decodes an unsorted allowed proposer set', () => {
	const bytes = validityBytes([2, 5]);
	// Swap the two trailing u32s so the encoded set reads [5, 2].
	bytes.set([...bytes.slice(-4), ...bytes.slice(-8, -4)], bytes.length - 8);

	expect(bcs.TransactionExpiration.parse(bytes).Validity?.allowedProposers?.proposers).toEqual([
		5, 2,
	]);
});

it('rejects an empty allowed proposer set when decoding', () => {
	// Drop the trailing u32 and rewrite the vector length as 0.
	const bytes = new Uint8Array([...validityBytes([2]).slice(0, -5), 0]);

	expect(() => bcs.TransactionExpiration.parse(bytes)).toThrow(
		/Allowed proposers must not be empty/,
	);
});

it('serializes ForwardingAddressRegistryCreate with its upstream enum index', () => {
	expect(
		EndOfEpochTransactionKind.serialize({ ForwardingAddressRegistryCreate: true }).toBytes(),
	).toEqual(new Uint8Array([13]));
});

it('can serialize transaction data with a programmable transaction', () => {
	const sui = normalizeSuiAddress('0x2');
	const txData = {
		$kind: 'V1',
		V1: {
			sender: normalizeSuiAddress('0xBAD'),
			expiration: { $kind: 'None', None: true },
			gasData: {
				payment: [ref()],
				owner: sui,
				price: '1',
				budget: '1000000',
			},
			kind: {
				$kind: 'ProgrammableTransaction',
				ProgrammableTransaction: {
					inputs: [
						// first argument is the publisher object
						{
							$kind: 'Object',
							Object: {
								$kind: 'ImmOrOwnedObject',
								ImmOrOwnedObject: ref(),
							},
						},
						// second argument is a vector of names
						{
							$kind: 'Pure',
							Pure: {
								bytes: bcs
									.vector(bcs.String)
									.serialize(['name', 'description', 'img_url'])
									.toBase64(),
							},
						},
						// third argument is a vector of values
						{
							$kind: 'Pure',
							Pure: {
								bytes: bcs
									.vector(bcs.String)
									.serialize([
										'Capy {name}',
										'A cute little creature',
										'https://api.capy.art/{id}/svg',
									])
									.toBase64(),
							},
						},
						// 4th and last argument is the account address to send display to
						{
							$kind: 'Pure',
							Pure: {
								bytes: bcs.Address.serialize(ref().objectId).toBase64(),
							},
						},
					],
					commands: [
						{
							$kind: 'MoveCall',
							MoveCall: {
								package: sui,
								module: 'display',
								function: 'new',
								typeArguments: [`${sui}::capy::Capy`],
								arguments: [
									// publisher object
									{
										$kind: 'Input',
										Input: 0,
									},
								],
							},
						},
						{
							$kind: 'MoveCall',
							MoveCall: {
								package: sui,
								module: 'display',
								function: 'add_multiple',
								typeArguments: [`${sui}::capy::Capy`],
								arguments: [
									// result of the first transaction
									{
										$kind: 'Result',
										Result: 0,
									},
									// second argument - vector of names
									{
										$kind: 'Input',
										Input: 1,
									},
									// third argument - vector of values
									{
										$kind: 'Input',
										Input: 2,
									},
								],
							},
						},
						{
							$kind: 'MoveCall',
							MoveCall: {
								package: sui,
								module: 'display',
								function: 'update_version',
								typeArguments: [`${sui}::capy::Capy`],
								arguments: [
									// result of the first transaction again
									{
										$kind: 'Result',
										Result: 0,
									},
								],
							},
						},
						{
							$kind: 'TransferObjects',
							TransferObjects: {
								objects: [
									// the display object
									{
										$kind: 'Result',
										Result: 0,
									},
								],
								// address is also an input
								address: {
									$kind: 'Input',
									Input: 3,
								},
							},
						},
					],
				},
			},
		},
	} satisfies typeof bcs.TransactionData.$inferType;

	const bytes = bcs.TransactionData.serialize(txData).toBytes();
	const result = bcs.TransactionData.parse(bytes);
	expect(result).toMatchObject(txData);
});

it('serializes every accepted address string form like normalizeSuiAddress', () => {
	const full = 'ab'.repeat(32);
	const accepted = [
		'0x',
		'0x2',
		'2',
		'0x02',
		'0X2',
		'0xAbCd',
		'ABCD',
		`0x${full}`,
		full,
		full.toUpperCase(),
	];
	for (const value of accepted) {
		const expected = normalizeSuiAddress(value);
		const bytes = bcs.Address.serialize(value).toBytes();
		expect(bcs.Address.parse(bytes), value).toBe(expected);
		expect(bytes, value).toEqual(fromHex(expected));
	}
	expect(bcs.Address.parse(new Uint8Array(32))).toBe(normalizeSuiAddress('0x0'));
});

it('rejects invalid address strings', () => {
	const rejected = [
		'',
		'0x0x1',
		' 0x1',
		'0x1 ',
		'0xg',
		'0x-1',
		`0x${'1'.repeat(65)}`,
		'1'.repeat(65),
	];
	for (const value of rejected) {
		expect(() => bcs.Address.serialize(value), JSON.stringify(value)).toThrow(
			'Invalid Sui address',
		);
	}
});

it('validates object digests by decoded length', () => {
	const digest = toBase58(new Uint8Array(32).fill(7));
	expect(bcs.ObjectDigest.parse(bcs.ObjectDigest.serialize(digest).toBytes())).toBe(digest);
	expect(() => bcs.ObjectDigest.serialize(toBase58(new Uint8Array(31)))).toThrow(
		'ObjectDigest must be 32 bytes',
	);
	expect(() => bcs.ObjectDigest.validate(toBase58(new Uint8Array(33)))).toThrow(
		'ObjectDigest must be 32 bytes',
	);
	expect(() => bcs.ObjectDigest.serialize('0OIl')).toThrow();
});

it('does not share decoded address bytes between writes', () => {
	const address = `0x${'11'.repeat(32)}`;
	class ZeroingWriter extends BcsWriter {
		override writeBytes(bytes: Uint8Array) {
			const result = super.writeBytes(bytes);
			bytes.fill(0);
			return result;
		}
	}
	bcs.Address.write(address, new ZeroingWriter());
	expect(bcs.Address.serialize(address).toHex()).toBe('11'.repeat(32));
});
