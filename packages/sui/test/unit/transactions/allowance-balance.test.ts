// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import type { ClientWithCoreApi } from '../../../src/client/index.js';
import { ObjectError } from '../../../src/client/index.js';
import { Transaction } from '../../../src/transactions/index.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/index.js';

const ID = normalizeSuiAddress('0xa11');
const FUNDER = normalizeSuiAddress('0xf00d');
const SENDER = normalizeSuiAddress('0x123');
const SUI = normalizeStructTag('0x2::sui::SUI');
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

function mockClient({ app = false, type = TYPE, missing = false } = {}) {
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
								funder: FUNDER,
								spender: SENDER,
								app: app ? { name: 'example::app::APP' } : null,
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
		const [coin] = tx.coin({ allowance: ID, amount: '100' });
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

	it('keeps zero spends on the allowance path and never selects sender funds', async () => {
		const tx = new Transaction();
		tx.balance({ allowance: ID, amount: 0 });
		const { client, getBalance } = mockClient();
		await tx.toJSON({ client });
		expect(tx.getData().commands[0].MoveCall?.function).toBe('balance_spend');
		expect(getBalance).not.toHaveBeenCalled();
	});

	it('supports known funders without a metadata lookup, alongside ordinary funding', async () => {
		const tx = new Transaction();
		tx.setSender(SENDER);
		tx.sharedObjectRef({ objectId: ID, initialSharedVersion: '5', mutable: true });
		tx.transferObjects(
			[tx.coin({ allowance: { objectId: ID, funder: FUNDER }, amount: 5n })],
			SENDER,
		);
		tx.transferObjects([tx.coin({ amount: 10n })], SENDER);
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
		tx.coin({ allowance: ID, amount: 1 });
		const { client, getBalance, listCoins } = mockClient(options);
		await expect(tx.toJSON({ client })).rejects.toThrow(error);
		expect(getBalance).not.toHaveBeenCalled();
		expect(listCoins).not.toHaveBeenCalled();
	});

	it.each([-1n, 2n ** 64n, Number.MAX_SAFE_INTEGER + 1, 0.5])(
		'rejects invalid amounts: %s',
		(amount) => {
			expect(() => new Transaction().balance({ allowance: ID, amount })).toThrow();
		},
	);

	it('rejects ambiguous options at the type and runtime levels', () => {
		const tx = new Transaction();
		// @ts-expect-error amount and balance are mutually exclusive
		expect(() => tx.balance({ amount: 1, balance: 1 })).toThrow(/exactly one/);
		// @ts-expect-error gas selection does not apply to allowance funding
		expect(() => tx.coin({ amount: 1, allowance: ID, useGasCoin: false })).toThrow(/useGasCoin/);
		// @ts-expect-error an amount is required
		expect(() => tx.balance({ allowance: ID })).toThrow(/exactly one/);
	});
});
