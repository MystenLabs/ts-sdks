// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import type { RestrictedMoveCallsOptions } from '../../src/transaction-analyzer/rules/restricted-move-calls.js';
import { restrictedMoveCalls } from '../../src/transaction-analyzer/rules/restricted-move-calls.js';
import { DEFAULT_SENDER } from '../mocks/mockData.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';

const SUI = normalizeSuiAddress('0x2');
const APP = normalizeSuiAddress('0xa99');
const BAD = normalizeSuiAddress('0xbad');

function transactionWith(targets: string[]) {
	const tx = new Transaction();
	tx.setSender(DEFAULT_SENDER);
	tx.setGasBudget(2_000_000n);
	tx.setGasPrice(1000n);
	tx.setGasPayment([]);
	for (const target of targets) {
		tx.moveCall({ target });
	}
	return tx.toJSON();
}

async function run(targets: string[], options?: RestrictedMoveCallsOptions) {
	const results = await analyze(
		{ restricted: restrictedMoveCalls(options) },
		{ client: new MockSuiClient(), transaction: await transactionWith(targets) },
	);
	return results.restricted;
}

describe('restrictedMoveCalls', () => {
	it('blocks every address alias call by default', async () => {
		const result = await run([
			'0x2::address_alias::enable',
			'0x2::coin::zero',
			`${SUI}::address_alias::add`,
			'0x2::address_alias::replace_all',
			'0x2::address_alias::remove',
		]);

		expect(result).toEqual({
			status: 'success',
			result: [
				{
					index: 0,
					target: `${SUI}::address_alias::enable`,
					level: 'block',
					matchedBy: ['addressAliases'],
				},
				{
					index: 2,
					target: `${SUI}::address_alias::add`,
					level: 'block',
					matchedBy: ['addressAliases'],
				},
				{
					index: 3,
					target: `${SUI}::address_alias::replace_all`,
					level: 'block',
					matchedBy: ['addressAliases'],
				},
				{
					index: 4,
					target: `${SUI}::address_alias::remove`,
					level: 'block',
					matchedBy: ['addressAliases'],
				},
			],
		});
	});

	it('reports nothing for unrestricted calls, including address_alias modules in other packages', async () => {
		expect(await run(['0x2::coin::zero', `${APP}::address_alias::add`])).toEqual({
			status: 'success',
			result: [],
		});
	});

	it('uses the addressAliases level, or turns it off', async () => {
		expect((await run(['0x2::address_alias::add'], { addressAliases: 'warn' })).result).toEqual([
			expect.objectContaining({ level: 'warn' }),
		]);
		expect((await run(['0x2::address_alias::add'], { addressAliases: false })).result).toEqual([]);
	});

	it('matches package, module and function targets', async () => {
		const result = await run(
			[`${BAD}::any::thing`, '0x2::allowance::new', '0x2::coin::mint', '0x2::coin::zero'],
			{
				targets: {
					'0xbad': 'block',
					'0x2::allowance': 'warn',
					'0x2::coin::mint': 'block',
				},
			},
		);

		expect(result.result).toEqual([
			{ index: 0, target: `${BAD}::any::thing`, level: 'block', matchedBy: ['0xbad'] },
			{
				index: 1,
				target: `${SUI}::allowance::new`,
				level: 'warn',
				matchedBy: ['0x2::allowance'],
			},
			{ index: 2, target: `${SUI}::coin::mint`, level: 'block', matchedBy: ['0x2::coin::mint'] },
		]);
	});

	it('skips exceptions, which only narrow their own key', async () => {
		const narrowed = await run(
			['0x2::allowance::new', '0x2::allowance::revoke', '0x2::allowance::unknown'],
			{
				targets: {
					'0x2::allowance': {
						level: 'warn',
						except: ['0x2::allowance::new', '0x2::allowance::revoke'],
					},
					'0x2::allowance::revoke': 'block',
				},
			},
		);

		expect(narrowed.result).toEqual([
			{
				index: 1,
				target: `${SUI}::allowance::revoke`,
				level: 'block',
				matchedBy: ['0x2::allowance::revoke'],
			},
			{
				index: 2,
				target: `${SUI}::allowance::unknown`,
				level: 'warn',
				matchedBy: ['0x2::allowance'],
			},
		]);
	});

	it('flags unknown packages with a wildcard and its exceptions', async () => {
		const result = await run([`${APP}::shop::buy`, '0x2::coin::zero', `${BAD}::drain::all`], {
			targets: { '*': { level: 'warn', except: ['0x2', '0xa99'] } },
		});

		expect(result.result).toEqual([
			{ index: 2, target: `${BAD}::drain::all`, level: 'warn', matchedBy: ['*'] },
		]);
	});

	it('reports every key that matched, at the most severe level', async () => {
		const result = await run(['0x2::address_alias::add'], {
			targets: { '*': { level: 'warn', except: ['0xa99'] } },
		});

		expect(result.result).toEqual([
			{
				index: 0,
				target: `${SUI}::address_alias::add`,
				level: 'block',
				matchedBy: ['addressAliases', '*'],
			},
		]);
	});

	it('turns off a key set to false', async () => {
		expect((await run([`${BAD}::any::thing`], { targets: { '0xbad': false } })).result).toEqual([]);
	});

	it('rejects malformed targets and exceptions outside their key', () => {
		expect(() => restrictedMoveCalls({ targets: { '0x2::a::b::c': 'block' } })).toThrow(
			'Invalid restricted Move call target',
		);
		expect(() => restrictedMoveCalls({ targets: { '0x2::': 'block' } })).toThrow(
			'Invalid restricted Move call target',
		);
		expect(() =>
			restrictedMoveCalls({
				targets: { '0x2::allowance': { level: 'warn', except: ['0x2::coin::zero'] } },
			}),
		).toThrow('is not within restricted target');
	});

	it('runs several configurations in the same analysis', async () => {
		const results = await analyze(
			{
				blocked: restrictedMoveCalls(),
				unknown: restrictedMoveCalls({
					addressAliases: false,
					targets: { '*': { level: 'warn', except: ['0x2'] } },
				}),
			},
			{
				client: new MockSuiClient(),
				transaction: await transactionWith(['0x2::address_alias::add', `${BAD}::drain::all`]),
			},
		);

		expect(results.blocked.result?.map((call) => call.index)).toEqual([0]);
		expect(results.unknown.result?.map((call) => call.index)).toEqual([1]);
	});
});
