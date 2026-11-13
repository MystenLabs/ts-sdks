// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import type { ClientWithCoreApi } from '../../../src/client/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import {
	DEFAULT_RESTRICTED_MOVE_CALLS,
	findRestrictedMoveCalls,
	SerialTransactionExecutor,
	Transaction,
	TransactionCommands,
	validateRestrictedMoveCalls,
} from '../../../src/transactions/index.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

const SUI = normalizeSuiAddress('0x2');
const APP = normalizeSuiAddress('0xa99');

function txWith(...targets: string[]) {
	const tx = new Transaction();
	for (const target of targets) tx.moveCall({ target });
	return tx;
}

function resolvedTxWith(...targets: string[]) {
	const tx = txWith(...targets);
	tx.setSender(APP);
	tx.setGasPrice(1000);
	tx.setGasBudget(1_000_000);
	tx.setGasPayment([{ objectId: APP, version: '1', digest: toBase58(new Uint8Array(32)) }]);
	return tx;
}

const signer = new Ed25519Keypair();
const ALIAS = '0x2::address_alias::add';

const offline = () =>
	vi.fn(async () => {
		throw new Error('offline');
	});

/** The error message, or 'ok', so a call that gets past the check can fail later on the network. */
const outcome = (promise: Promise<unknown>) =>
	promise.then(
		() => 'ok',
		(error) => String(error),
	);

describe.each([
	[
		'gRPC',
		(fetch: typeof globalThis.fetch, restrictedMoveCalls?: string[]) =>
			new SuiGrpcClient({
				baseUrl: 'http://localhost',
				network: 'localnet',
				fetch,
				restrictedMoveCalls,
			}),
	],
	[
		'GraphQL',
		(fetch: typeof globalThis.fetch, restrictedMoveCalls?: string[]) =>
			new SuiGraphQLClient({
				url: 'http://localhost',
				network: 'localnet',
				fetch,
				restrictedMoveCalls,
			}),
	],
])('%s client restrictedMoveCalls', (_name, makeClient) => {
	it.each([
		['build', (client: ClientWithCoreApi) => resolvedTxWith(ALIAS).build({ client })],
		['toJSON', (client: ClientWithCoreApi) => txWith(ALIAS).toJSON({ client })],
		[
			'Signer.signAndExecuteTransaction',
			(client: ClientWithCoreApi) =>
				signer.signAndExecuteTransaction({ transaction: resolvedTxWith(ALIAS), client }),
		],
		[
			'core.signAndExecuteTransaction',
			(client: ClientWithCoreApi) =>
				client.core.signAndExecuteTransaction({ transaction: resolvedTxWith(ALIAS), signer }),
		],
		[
			'core.simulateTransaction',
			(client: ClientWithCoreApi) =>
				client.core.simulateTransaction({ transaction: txWith(ALIAS) }),
		],
		[
			'SerialTransactionExecutor',
			(client: ClientWithCoreApi) =>
				new SerialTransactionExecutor({ client, signer }).executeTransaction(txWith(ALIAS)),
		],
	])('%s uses the client list', async (_method, run) => {
		const fetch = offline();
		await expect(run(makeClient(fetch))).rejects.toThrow('restricted Move calls');
		expect(fetch).not.toHaveBeenCalled();

		expect(await outcome(run(makeClient(offline(), [])))).not.toContain('restricted Move calls');
	});

	it('rejects a custom entry', async () => {
		const client = makeClient(offline(), ['0xa99::vault']);
		await expect(txWith('0xa99::vault::drain').toJSON({ client })).rejects.toThrow(
			'restricted Move calls',
		);
		expect(await outcome(txWith(ALIAS).toJSON({ client }))).toBe('ok');
	});

	it('lets a per-call list take precedence', async () => {
		await expect(
			txWith(ALIAS).toJSON({
				client: makeClient(offline(), []),
				restrictedMoveCalls: [...DEFAULT_RESTRICTED_MOVE_CALLS],
			}),
		).rejects.toThrow('restricted Move calls');
		expect(
			await outcome(
				txWith(ALIAS).toJSON({ client: makeClient(offline()), restrictedMoveCalls: [] }),
			),
		).toBe('ok');
	});

	it('throws on a malformed entry', () => {
		expect(() => makeClient(offline(), ['0x2::a::b::c'])).toThrow(
			'Invalid restrictedMoveCalls entry',
		);
	});
});

describe('findRestrictedMoveCalls', () => {
	it('defaults to the address alias module', () => {
		expect(DEFAULT_RESTRICTED_MOVE_CALLS).toEqual(['0x2::address_alias']);
		const data = txWith(
			'0x2::coin::zero',
			`${SUI}::address_alias::add`,
			`${APP}::address_alias::add`,
			'0x2::address_alias_x::add',
		).getData();
		expect(findRestrictedMoveCalls(data)).toEqual([
			{ index: 1, target: `${SUI}::address_alias::add`, matchedBy: '0x2::address_alias' },
		]);
	});

	it('matches package and package::module entries, and replaces the default', () => {
		const data = txWith(
			'0x2::address_alias::add',
			'0xa99::vault::drain',
			'0xa99::other::call',
			'0xb::bridge::send',
		).getData();
		expect(
			findRestrictedMoveCalls(data, ['0xa99::vault', `${normalizeSuiAddress('0xb')}`]),
		).toEqual([
			{ index: 1, target: `${APP}::vault::drain`, matchedBy: '0xa99::vault' },
			{
				index: 3,
				target: `${normalizeSuiAddress('0xb')}::bridge::send`,
				matchedBy: normalizeSuiAddress('0xb'),
			},
		]);
		expect(findRestrictedMoveCalls(data, [])).toEqual([]);
	});

	it('matches a function entry only for that function', () => {
		const data = txWith('0x2::address_alias::enable', '0x2::address_alias::add').getData();
		expect(findRestrictedMoveCalls(data, ['0x2::address_alias::add'])).toEqual([
			{ index: 1, target: `${SUI}::address_alias::add`, matchedBy: '0x2::address_alias::add' },
		]);
	});

	it.each(['', '0x', '0x2::a::b::c', '0x2::1bad', '0x2::coin::1bad', '@mysten/app', '0x2::', 'zz'])(
		'throws on the malformed entry %j',
		(entry) => {
			expect(() => findRestrictedMoveCalls(txWith().getData(), [entry])).toThrow(
				'Invalid restrictedMoveCalls entry',
			);
		},
	);

	it('validateRestrictedMoveCalls accepts valid entries and throws on a malformed one', () => {
		expect(() =>
			validateRestrictedMoveCalls(['0x2', '0x2::address_alias', `${SUI}::address_alias::add`]),
		).not.toThrow();
		expect(() => validateRestrictedMoveCalls(['0x2', '0x2::a::b::c'])).toThrow(
			'Invalid restrictedMoveCalls entry "0x2::a::b::c"',
		);
	});
});

describe('Transaction restrictedMoveCalls', () => {
	it.each(['0x2::address_alias::add', `${SUI}::address_alias::add`])(
		'refuses to serialize or build %s by default',
		async (target) => {
			await expect(txWith(target).toJSON()).rejects.toThrow(
				`command 0 calls ${SUI}::address_alias::add`,
			);
			await expect(txWith(target).build({ onlyTransactionKind: true })).rejects.toThrow(
				`command 0 calls ${SUI}::address_alias::add (restricted by "0x2::address_alias")`,
			);
		},
	);

	it('catches calls added by build plugins', async () => {
		const tx = txWith('0x2::coin::zero');
		tx.addBuildPlugin(async (data, _options, next) => {
			data.commands.push(
				TransactionCommands.MoveCall({ package: '0x2', module: 'address_alias', function: 'add' }),
			);
			await next();
		});
		await expect(tx.build({ onlyTransactionKind: true })).rejects.toThrow(
			`command 1 calls ${SUI}::address_alias::add`,
		);
	});

	it('names every restricted call', async () => {
		await expect(
			txWith('0x2::address_alias::enable', '0x2::coin::zero', '0xa99::vault::drain').toJSON({
				restrictedMoveCalls: ['0x2::address_alias', '0xa99'],
			}),
		).rejects.toThrow(
			`Transaction has restricted Move calls: command 0 calls ${SUI}::address_alias::enable (restricted by "0x2::address_alias"), command 2 calls ${APP}::vault::drain (restricted by "0xa99"). To allow them, set \`restrictedMoveCalls\` on the client or in \`build()\`/\`toJSON()\` options (\`[]\` allows all).`,
		);
	});

	it('reads the list before plugins can change it', async () => {
		const tx = txWith('0x2::address_alias::add');
		tx.addSerializationPlugin(async (_data, options, next) => {
			options.restrictedMoveCalls = [];
			await next();
		});
		await expect(tx.build({ onlyTransactionKind: true })).rejects.toThrow('restricted Move calls');
	});

	it('reads the list before build plugins can change it', async () => {
		const tx = txWith('0x2::coin::zero');
		tx.addBuildPlugin(async (data, options, next) => {
			options.restrictedMoveCalls = [];
			data.commands.push(
				TransactionCommands.MoveCall({ package: '0x2', module: 'address_alias', function: 'add' }),
			);
			await next();
		});
		await expect(tx.build({ onlyTransactionKind: true })).rejects.toThrow('restricted Move calls');
	});

	it('honours the option in getDigest and sign', async () => {
		const tx = resolvedTxWith('0x2::address_alias::add');
		await expect(tx.getDigest()).rejects.toThrow('restricted Move calls');
		await expect(tx.getDigest({ restrictedMoveCalls: [] })).resolves.toBeTypeOf('string');

		await expect(tx.sign({ signer })).rejects.toThrow('restricted Move calls');
		await expect(tx.sign({ signer, restrictedMoveCalls: [] })).resolves.toHaveProperty('signature');
	});

	it('catches an MVR name that resolves to a restricted package', async () => {
		const client = {
			core: {
				mvr: {
					resolve: async () => ({ packages: { '@test/alias': { package: '0x2' } }, types: {} }),
				},
			},
		} as unknown as ClientWithCoreApi;
		await expect(txWith('@test/alias::address_alias::add').toJSON({ client })).rejects.toThrow(
			`command 0 calls ${SUI}::address_alias::add`,
		);
	});

	it('does not carry an opt-in through serialized JSON', async () => {
		const json = await txWith('0x2::address_alias::add').toJSON({ restrictedMoveCalls: [] });
		await expect(Transaction.from(json).build({ onlyTransactionKind: true })).rejects.toThrow(
			`command 0 calls ${SUI}::address_alias::add`,
		);
	});
});
