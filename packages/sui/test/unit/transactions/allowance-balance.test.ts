// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import type { ClientWithCoreApi } from '../../../src/client/index.js';
import { ObjectError } from '../../../src/client/index.js';
import { resolveAllowanceBalance } from '../../../src/transactions/intents/AllowanceBalance.js';
import { Transaction } from '../../../src/transactions/index.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/index.js';

const ID = normalizeSuiAddress('0xa11');
const FUNDER = normalizeSuiAddress('0xf00d');
const SENDER = normalizeSuiAddress('0x123');
const SUI = normalizeStructTag('0x2::sui::SUI');
const APP = normalizeStructTag('0xa::app::APP');
const TYPE = normalizeStructTag(`0x2::allowance::Allowance<0x2::balance::Balance<${SUI}>>`);

// A complete allowance with no rate limit, matching the Move layout.
const Allowance = bcs.struct('Allowance', {
	id: bcs.Address,
	settings: bcs.struct('Settings', {
		funder: bcs.Address,
		spender: bcs.option(bcs.Address),
		app: bcs.option(bcs.struct('TypeName', { name: bcs.string() })),
		lifetimeCap: bcs.option(bcs.u256()),
		start: bcs.option(bcs.u64()),
		expiration: bcs.option(bcs.u64()),
		rateLimit: bcs.option(bcs.u8()),
		name: bcs.string(),
	}),
	currentSpend: bcs.u256(),
});

function mockClient({ app = false, type = TYPE, missing = false, funder = FUNDER } = {}) {
	const getObjects = vi.fn().mockResolvedValue({
		objects: [
			missing
				? new ObjectError('notExists', 'Allowance not found')
				: {
						objectId: ID,
						type,
						owner: { $kind: 'Shared', Shared: { initialSharedVersion: '5' } },
						content: Allowance.serialize({
							id: ID,
							settings: {
								funder,
								spender: SENDER,
								app: app ? { name: APP.slice(2) } : null,
								lifetimeCap: 1000,
								start: null,
								expiration: null,
								rateLimit: null,
								name: 'Test allowance',
							},
							currentSpend: 0,
						}).toBytes(),
					},
		],
	});
	const getBalance = vi.fn();
	const listCoins = vi.fn();
	return {
		getObjects,
		getBalance,
		listCoins,
		client: { core: { getObjects, getBalance, listCoins } } as unknown as ClientWithCoreApi,
	};
}

describe('allowance balances', () => {
	it('resolves repeated coin and balance spends once and preserves their consumers through copying and JSON', async () => {
		const tx = new Transaction();
		tx.setSender(SENDER);
		const [coin] = tx.coin({ allowance: ID, balance: '100' });
		tx.transferObjects([coin], SENDER);
		const balance = tx.balance({ allowance: ID, balance: 50n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [SUI],
			arguments: [balance, tx.pure.address(SENDER)],
		});
		const copy = Transaction.from(tx);
		const restored = Transaction.from(
			await copy.toJSON({ supportedIntents: ['AllowanceBalance'] }),
		);
		const { client, getObjects, getBalance, listCoins } = mockClient();
		const bytes = await restored.build({ client, onlyTransactionKind: true });
		const data = bcs.TransactionKind.parse(bytes).ProgrammableTransaction!;
		expect(getObjects).toHaveBeenCalledExactlyOnceWith({
			objectIds: [ID],
			include: { content: true },
		});
		expect(getBalance).not.toHaveBeenCalled();
		expect(listCoins).not.toHaveBeenCalled();
		expect(
			data.inputs.filter((input) => input.FundsWithdrawal).map((input) => input.FundsWithdrawal),
		).toEqual(
			[100, 50].map((amount) => ({
				reservation: { $kind: 'MaxAmountU64', MaxAmountU64: String(amount) },
				typeArg: { $kind: 'Balance', Balance: SUI },
				withdrawFrom: {
					$kind: 'SenderAllowance',
					SenderAllowance: { funder: FUNDER, allowance: ID },
				},
			})),
		);
		expect(data.commands[0].MoveCall).toMatchObject({
			module: 'allowance',
			function: 'balance_spend',
		});
		expect(data.commands[1].MoveCall).toMatchObject({
			module: 'coin',
			function: 'from_balance',
			arguments: [{ Result: 0 }],
		});
		expect(data.commands[2].TransferObjects?.objects).toMatchObject([{ NestedResult: [1, 0] }]);
		expect(data.commands[3].MoveCall).toMatchObject({
			module: 'allowance',
			function: 'balance_spend',
		});
		expect(data.commands[4].MoveCall?.arguments[0]).toMatchObject({ NestedResult: [3, 0] });
	});

	it.each([false, true])(
		'preserves app permits and consumers through expansion and serialization (known funder: %s)',
		async (knownFunder) => {
			const tx = new Transaction();
			tx.setSender(SENDER);
			tx.sharedObjectRef({ objectId: ID, initialSharedVersion: '5', mutable: true });
			for (const output of ['coin', 'balance'] as const) {
				const permit = tx.moveCall({ target: '0xa::app::authorize', arguments: [tx.pure.u64(42)] });
				const value = tx[output]({
					balance: 10n,
					allowance: {
						objectId: ID,
						funder: knownFunder ? FUNDER : undefined,
						app: { type: APP, permit },
					},
				});
				if (output === 'coin') tx.transferObjects([value], SENDER);
				else
					tx.moveCall({
						target: '0x2::balance::send_funds',
						typeArguments: [SUI],
						arguments: [value, tx.pure.address(SENDER)],
					});
			}
			const restored = Transaction.from(
				await Transaction.from(tx).toJSON({ supportedIntents: ['AllowanceBalance'] }),
			);
			const { client, getObjects, getBalance, listCoins } = mockClient({ app: true });
			const bytes = await restored.build({ client, onlyTransactionKind: true });
			const commands = bcs.TransactionKind.parse(bytes).ProgrammableTransaction!.commands;
			expect(commands[1].MoveCall).toMatchObject({
				function: 'app_balance_spend',
				arguments: [{ Input: 0 }, { Result: 0 }, { Input: 6 }, { Input: 2 }],
			});
			expect(commands[3].TransferObjects?.objects).toMatchObject([{ NestedResult: [2, 0] }]);
			expect(commands[5].MoveCall).toMatchObject({
				function: 'app_balance_spend',
				arguments: [{ Input: 0 }, { Result: 4 }, { Input: 7 }, { Input: 2 }],
			});
			expect(commands[6].MoveCall?.arguments[0]).toMatchObject({ NestedResult: [5, 0] });
			expect(getObjects).toHaveBeenCalledTimes(knownFunder ? 0 : 1);
			expect(getBalance).not.toHaveBeenCalled();
			expect(listCoins).not.toHaveBeenCalled();
		},
	);

	it('remaps app authorization arguments when an ordinary coin intent resolves later', async () => {
		const tx = new Transaction();
		tx.setSender(SENDER);
		tx.sharedObjectRef({ objectId: ID, initialSharedVersion: '5', mutable: true });
		const authorizationFee = tx.coin({ balance: 2n });
		const [, permit] = tx.moveCall({
			target: '0xa::app::authorize',
			arguments: [authorizationFee],
		});
		const coin = tx.coin({
			balance: 10n,
			allowance: { objectId: ID, funder: FUNDER, app: { type: APP, permit } },
		});
		tx.transferObjects([coin], SENDER);
		await tx.build({ onlyTransactionKind: true, assumeSufficientAddressBalances: true });
		const commands = tx.getData().commands;
		const authorizeIndex = commands.findIndex(
			(command) => command.MoveCall?.function === 'authorize',
		);
		const spend = commands.find(
			(command) => command.MoveCall?.function === 'app_balance_spend',
		)!.MoveCall!;
		expect(spend.arguments[1]).toMatchObject({ NestedResult: [authorizeIndex, 1] });
		const fee = commands[authorizeIndex].MoveCall!.arguments[0];
		expect(fee.$kind).toBe('NestedResult');
		if (fee.$kind !== 'NestedResult') throw new Error('Expected a resolved coin result');
		expect(fee.NestedResult[0]).toBeLessThan(authorizeIndex);
		expect(commands[fee.NestedResult[0]].$kind).toBe('SplitCoins');
		expect(commands.at(-1)?.TransferObjects?.objects[0]).toMatchObject({
			NestedResult: [commands.length - 2, 0],
		});
	});

	it.each([false, true])('rejects an app mismatch (app-bound: %s)', async (app) => {
		const tx = new Transaction();
		const permit = tx.moveCall({ target: '0xb::app::authorize' });
		tx.balance({
			balance: 1n,
			allowance: { objectId: ID, app: { type: '0xb::app::APP', permit } },
		});
		const { client } = mockClient({ app });
		await expect(tx.toJSON({ client })).rejects.toThrow(/is not bound to app/);
	});

	it.each([
		{ allowanceFirst: true, useGasCoin: true, type: SUI },
		{ allowanceFirst: false, useGasCoin: true, type: SUI },
		{ allowanceFirst: true, useGasCoin: false, type: SUI },
		{ allowanceFirst: false, useGasCoin: false, type: SUI },
		{ allowanceFirst: false, useGasCoin: false, type: normalizeStructTag('0xa::coin::COIN') },
	])(
		'reserves self-funded allowance spends before ordinary selection: %j',
		async ({ allowanceFirst, useGasCoin, type }) => {
			const tx = new Transaction();
			tx.setSender(SENDER);
			const allowance = () => tx.coin({ allowance: ID, balance: 80n, type });
			const ordinary = () => tx.coin({ balance: 80n, type, useGasCoin });
			const first = allowanceFirst ? allowance() : ordinary();
			const second = allowanceFirst ? ordinary() : allowance();
			tx.transferObjects([first, second], SENDER);
			const { client, getBalance, listCoins } = mockClient({
				funder: SENDER,
				type: normalizeStructTag(`0x2::allowance::Allowance<0x2::balance::Balance<${type}>>`),
			});
			getBalance.mockResolvedValue({
				balance: { balance: '1100', addressBalance: '100', coinBalance: '1000' },
			});
			listCoins.mockResolvedValue({
				objects: [
					{
						objectId: normalizeSuiAddress('0xc01'),
						version: '1',
						digest: '11111111111111111111111111111111',
						balance: '1000',
						coinType: type,
					},
				],
				hasNextPage: false,
				cursor: null,
			});
			await tx.toJSON({ client });
			const withdrawals = tx
				.getData()
				.inputs.flatMap((input) => (input.FundsWithdrawal ? [input.FundsWithdrawal] : []));
			expect(withdrawals).toHaveLength(1);
			expect(withdrawals[0].withdrawFrom).toMatchObject({ SenderAllowance: { funder: SENDER } });
			expect(withdrawals[0].reservation.MaxAmountU64).toBe('80');
			expect(tx.getData().commands.some((command) => command.SplitCoins)).toBe(true);
		},
	);

	it.each([true, false])(
		'resolves allowances while preserving coin intents (allowance first: %s)',
		async (allowanceFirst) => {
			const tx = new Transaction();
			tx.setSender(SENDER);
			const allowance = () => tx.coin({ allowance: ID, balance: 80n });
			const ordinary = () => tx.coin({ balance: 80n });
			const first = allowanceFirst ? allowance() : ordinary();
			const second = allowanceFirst ? ordinary() : allowance();
			tx.transferObjects([first, second], SENDER);
			const { client, getObjects, getBalance } = mockClient({ funder: SENDER });
			const preserved = await tx.toJSON({ client, supportedIntents: ['CoinWithBalance'] });
			expect(tx.getData().commands.filter((command) => command.$Intent)).toHaveLength(1);
			expect(tx.getData().commands.find((command) => command.$Intent)?.$Intent?.name).toBe(
				'CoinWithBalance',
			);
			expect(getObjects).toHaveBeenCalledTimes(1);
			expect(getBalance).not.toHaveBeenCalled();
			const restored = Transaction.from(preserved);
			await restored.toJSON({ assumeSufficientAddressBalances: true });
			expect(restored.getData().commands.some((command) => command.$Intent)).toBe(false);
		},
	);

	it('preserves both funding intents without looking up funds or allowances', async () => {
		const tx = new Transaction();
		tx.coin({ balance: 1n });
		tx.balance({ allowance: ID, balance: 1n });
		const restored = Transaction.from(
			await tx.toJSON({ supportedIntents: ['CoinWithBalance', 'AllowanceBalance'] }),
		);
		expect(restored.getData().commands.map((command) => command.$Intent?.name)).toEqual([
			'CoinWithBalance',
			'AllowanceBalance',
		]);
	});

	it('leaves a custom coin resolver in charge of its intent', async () => {
		const tx = new Transaction();
		tx.coin({ allowance: ID, balance: 1n });
		tx.coin({ balance: 1n });
		const custom = vi.fn(async (data, _options, next) => {
			const index = data.commands.findIndex(
				(command: { $Intent?: { name: string } }) => command.$Intent?.name === 'CoinWithBalance',
			);
			expect(index).toBeGreaterThanOrEqual(0);
			data.replaceCommand(index, []);
			await next();
		});
		const restored = Transaction.from(tx, { intentResolvers: { CoinWithBalance: custom } });
		await restored.toJSON({ client: mockClient().client });
		expect(custom).toHaveBeenCalledTimes(1);
	});

	it.each([false, true])(
		'runs a custom allowance resolver before coin selection (allowance first: %s)',
		async (allowanceFirst) => {
			const tx = new Transaction();
			tx.setSender(SENDER);
			const allowance = () => tx.coin({ allowance: ID, balance: 80n });
			const ordinary = () => tx.coin({ balance: 80n });
			const first = allowanceFirst ? allowance() : ordinary();
			const second = allowanceFirst ? ordinary() : allowance();
			tx.transferObjects([first, second], SENDER);
			const custom = vi.fn(resolveAllowanceBalance);
			const restored = Transaction.from(tx, { intentResolvers: { AllowanceBalance: custom } });
			const { client, getBalance } = mockClient({ funder: SENDER });
			getBalance.mockResolvedValue({
				balance: { balance: '100', addressBalance: '100', coinBalance: '0' },
			});
			await restored.toJSON({ client });
			expect(restored.getData().inputs.filter((input) => input.FundsWithdrawal)).toHaveLength(1);
			expect(restored.getData().commands.some((command) => command.SplitCoins)).toBe(true);
			expect(custom).toHaveBeenCalledTimes(1);
			expect(restored.getData().commands.some((command) => command.$Intent)).toBe(false);
		},
	);

	it.each(['', ' ', '\t\n', '0x10', '1.5', '-1', '+1'])(
		'rejects non-decimal amount strings: %j',
		(balance) => {
			expect(() => new Transaction().coin({ balance })).toThrow(/decimal/);
		},
	);

	it.each([false, true])(
		'resolves MVR coin and app types before metadata checks (known funder: %s)',
		async (knownFunder) => {
			const tx = new Transaction();
			const permit = tx.moveCall({ target: '0xa::app::authorize' });
			const { client } = mockClient({ app: true });
			const resolve = vi.fn(async ({ types }: { types: string[] }) => ({
				packages: {},
				types: Object.fromEntries(
					types.map((type) => [type, { type: type.includes('::sui::') ? SUI : APP }]),
				),
			}));
			Object.assign(client.core, { mvr: { resolve } });
			tx.balance({
				balance: 1n,
				type: '@test/coins::sui::SUI',
				allowance: {
					objectId: ID,
					funder: knownFunder ? FUNDER : undefined,
					app: { type: '@test/apps::app::APP', permit },
				},
			});
			await tx.toJSON({ client });
			expect(resolve).toHaveBeenCalledTimes(1);
			expect(
				tx.getData().inputs.find((input) => input.FundsWithdrawal)?.FundsWithdrawal?.typeArg
					.Balance,
			).toBe(SUI);
			expect(
				tx.getData().commands.find((command) => command.MoveCall?.function === 'app_balance_spend')
					?.MoveCall?.typeArguments,
			).toEqual([SUI, APP]);
		},
	);

	it('starts metadata requests in parallel within every transport batch limit', async () => {
		const tx = new Transaction();
		for (let index = 1; index <= 100; index++)
			tx.balance({ allowance: `0x${index.toString(16)}`, balance: 1n });
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const getObjects = vi.fn(async (_options: { objectIds: string[] }) => {
			await gate;
			return { objects: [] };
		});
		const client = { core: { getObjects } } as unknown as ClientWithCoreApi;
		const build = tx.toJSON({ client });
		const failure = expect(build).rejects.toThrow(/Expected a shared/);
		await vi.waitFor(() => expect(getObjects).toHaveBeenCalled());
		const requests = getObjects.mock.calls.length;
		release();
		await failure;
		expect(requests).toBe(3);
		expect(getObjects.mock.calls.map(([options]) => options.objectIds.length)).toEqual([
			40, 40, 20,
		]);
	});

	it('requires dependent intents to be resolved together', async () => {
		const tx = new Transaction();
		tx.setSender(SENDER);
		tx.coin({ balance: 1n });
		tx.coin({ allowance: { objectId: ID, funder: SENDER }, balance: 1n });
		await expect(
			tx.toJSON({ supportedIntents: ['AllowanceBalance'], assumeSufficientAddressBalances: true }),
		).rejects.toThrow(/preserve both intents/);
	});

	it('keeps zero spends on the allowance path and never selects sender funds', async () => {
		const tx = new Transaction();
		tx.balance({ allowance: ID, balance: 0 });
		const { client, getBalance } = mockClient();
		await tx.toJSON({ client });
		expect(tx.getData().commands[0].MoveCall?.function).toBe('balance_spend');
		expect(getBalance).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'upgrades a read-only allowance input with a known funder (app: %s)',
		async (app) => {
			const tx = new Transaction();
			tx.sharedObjectRef({ objectId: ID, initialSharedVersion: '5', mutable: false });
			const permit = app ? tx.moveCall({ target: '0xa::app::authorize' }) : undefined;
			tx.balance({
				balance: 1n,
				allowance: {
					objectId: ID,
					funder: FUNDER,
					app: permit ? { type: APP, permit } : undefined,
				},
			});
			await tx.toJSON();
			expect(tx.getData().inputs[0].Object?.SharedObject).toEqual({
				objectId: ID,
				initialSharedVersion: '5',
				mutable: true,
			});
			expect(
				tx.getData().inputs.filter((input) => input.Object?.SharedObject?.objectId === ID),
			).toHaveLength(1);
		},
	);

	it('supports known funders without a metadata lookup, alongside ordinary funding', async () => {
		const tx = new Transaction();
		tx.setSender(SENDER);
		tx.sharedObjectRef({ objectId: ID, initialSharedVersion: '5', mutable: true });
		tx.transferObjects(
			[tx.coin({ allowance: { objectId: ID, funder: FUNDER }, balance: 5n })],
			SENDER,
		);
		tx.transferObjects([tx.coin({ balance: 10n })], SENDER);
		await tx.build({ onlyTransactionKind: true, assumeSufficientAddressBalances: true });
		const sources = tx
			.getData()
			.inputs.flatMap((input) =>
				input.FundsWithdrawal ? [input.FundsWithdrawal.withdrawFrom.$kind] : [],
			);
		expect(sources).toEqual(['SenderAllowance', 'Sender']);
	});

	it.each([
		[{ app: true }, /app-bound.*SpendPermit/],
		[{ type: normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>') }, /Expected a shared/],
		[{ missing: true }, /Allowance not found/],
	] as const)('rejects unsupported allowances without falling back: %j', async (options, error) => {
		const tx = new Transaction();
		tx.coin({ allowance: ID, balance: 1 });
		const { client, getBalance, listCoins } = mockClient(options);
		await expect(tx.toJSON({ client })).rejects.toThrow(error);
		expect(getBalance).not.toHaveBeenCalled();
		expect(listCoins).not.toHaveBeenCalled();
	});

	it.each([-1n, 2n ** 64n, Number.MAX_SAFE_INTEGER + 1, 0.5])(
		'rejects invalid amounts: %s',
		(amount) => {
			expect(() => new Transaction().balance({ allowance: ID, balance: amount })).toThrow();
		},
	);

	it('rejects ambiguous options at the type and runtime levels', () => {
		const tx = new Transaction();
		// @ts-expect-error gas selection does not apply to allowance funding
		expect(() => tx.coin({ balance: 1, allowance: ID, useGasCoin: false })).toThrow(/useGasCoin/);
		// @ts-expect-error a balance is required
		expect(() => tx.balance({ allowance: ID })).toThrow();
	});
});
