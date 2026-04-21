// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID, normalizeSuiAddress } from '@mysten/sui/utils';

import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import { balanceFlows } from '../../src/transaction-analyzer/rules/balance-flows.js';
import { createPASMoveCallHandler } from '../../src/transaction-analyzer/move-call-handlers/pas.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';
import { DEFAULT_SENDER, TEST_USDC_COIN_ID } from '../mocks/mockData.js';

const PAS_PACKAGE = normalizeSuiAddress('0xbad1');
const PAS_NAMESPACE = normalizeSuiAddress('0xb0b5');
const USDC = '0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC';
const USDC_TYPE_ARG = '0xa0b::usdc::USDC';
const ACCOUNT_A_ID = normalizeSuiAddress('0xacc1');
const ACCOUNT_B_ID = normalizeSuiAddress('0xacc2');
const POLICY = normalizeSuiAddress('0xb01cabe');

function deriveTestAccountAddress(owner: string): string {
	const key = bcs.Address.serialize(normalizeSuiAddress(owner)).toBytes();
	return deriveObjectID(PAS_NAMESPACE, `${PAS_PACKAGE}::keys::AccountKey`, key);
}

function setupClient(accountIds: string[]): MockSuiClient {
	const client = new MockSuiClient();
	for (const objectId of accountIds) {
		client.addObject({
			objectId,
			objectType: `${PAS_PACKAGE}::account::Account`,
			owner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
		});
	}
	client.addObject({
		objectId: POLICY,
		objectType: `${PAS_PACKAGE}::policy::Policy<${USDC_TYPE_ARG}>`,
		owner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
	});
	client.addObject({
		objectId: PAS_NAMESPACE,
		objectType: `${PAS_PACKAGE}::namespace::Namespace`,
		owner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
	});
	const register = (moduleName: string, name: string, parameters: number) => {
		client.addMoveFunction({
			packageId: PAS_PACKAGE,
			moduleName,
			name,
			visibility: 'public',
			isEntry: false,
			typeParameters: [{ constraints: [], isPhantom: false }],
			parameters: Array(parameters).fill({
				reference: null,
				body: { $kind: 'datatype', datatype: { typeName: 'opaque', typeParameters: [] } },
			}),
		});
	};
	register('account', 'new_auth', 0);
	register('account', 'create', 3);
	register('account', 'deposit_balance', 2);
	register('account', 'send_balance', 5);
	register('account', 'unlock_balance', 4);
	register('account', 'clawback_balance', 3);
	register('account', 'unsafe_send_balance', 5);
	register('unlock_funds', 'resolve', 2);
	register('unlock_funds', 'resolve_unrestricted_balance', 2);
	register('clawback_funds', 'resolve', 2);
	register('send_funds', 'resolve_balance', 2);

	// A stand-in issuer approval MoveCall that takes the request by &mut —
	// matches the shape of real `demo_usd::approve_transfer(&mut Request<…>, &Policy)` etc.
	client.addMoveFunction({
		packageId: normalizeSuiAddress('0x9999'),
		moduleName: 'issuer',
		name: 'approve_transfer',
		visibility: 'public',
		isEntry: false,
		typeParameters: [],
		parameters: [
			{
				reference: 'mutable',
				body: { $kind: 'datatype', datatype: { typeName: 'opaque', typeParameters: [] } },
			},
			{
				reference: 'immutable',
				body: { $kind: 'datatype', datatype: { typeName: 'opaque', typeParameters: [] } },
			},
		],
	});

	return client;
}

async function analyzeTx(client: MockSuiClient, tx: Transaction) {
	return analyze(
		{ balanceFlows },
		{
			client,
			transaction: await tx.toJSON(),
			balanceFlows: {
				moveCallHandlers: [
					createPASMoveCallHandler({ packageId: PAS_PACKAGE, namespaceId: PAS_NAMESPACE }),
				],
			},
		},
	);
}

describe('PAS balanceFlows handler', () => {
	it('credits deposit_balance to the account address', async () => {
		const client = setupClient([ACCOUNT_A_ID]);

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const withdrawal = tx.withdrawal({ amount: 500_000_000n, type: USDC_TYPE_ARG });
		const balance = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: [USDC_TYPE_ARG],
			arguments: [withdrawal],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::deposit_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), balance],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		expect(
			deltas?.[normalizeSuiAddress(DEFAULT_SENDER)]?.find((f) => f.coinType === USDC)?.amount,
		).toBe(-500_000_000n);
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(500_000_000n);
	});

	it('send_balance moves value between account addresses (credit at resolve_balance)', async () => {
		const client = setupClient([ACCOUNT_A_ID, ACCOUNT_B_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [
				tx.object(ACCOUNT_A_ID),
				auth,
				tx.object(ACCOUNT_B_ID),
				tx.pure.u64(300_000_000n),
			],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-300_000_000n);
		expect(deltas?.[ACCOUNT_B_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(300_000_000n);
	});

	it('unlock_balance + unlock_funds::resolve routes the Balance<T> downstream', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::unlock_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, tx.pure.u64(150_000_000n)],
		});
		const balance = tx.moveCall({
			target: `${PAS_PACKAGE}::unlock_funds::resolve`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});
		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: [USDC_TYPE_ARG],
			arguments: [balance],
		});
		tx.transferObjects([coin], tx.pure.address(DEFAULT_SENDER));

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-150_000_000n);
		expect(
			deltas?.[normalizeSuiAddress(DEFAULT_SENDER)]?.find((f) => f.coinType === USDC)?.amount,
		).toBe(150_000_000n);
	});

	it('clawback_balance debits the source account address', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::clawback_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), tx.pure.u64(100_000_000n)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::clawback_funds::resolve`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-100_000_000n);
	});

	it('unsafe_send_balance credits the recipients derived account address', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const recipientWallet = normalizeSuiAddress('0xbeef');
		const expectedRecipientAccount = deriveTestAccountAddress(recipientWallet);

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::unsafe_send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [
				tx.object(ACCOUNT_A_ID),
				auth,
				tx.pure.address(recipientWallet),
				tx.pure.u64(75_000_000n),
			],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-75_000_000n);
		expect(deltas?.[expectedRecipientAccount]?.find((f) => f.coinType === USDC)?.amount).toBe(
			75_000_000n,
		);
		// The raw recipient wallet address should NOT appear as a credited address.
		expect(deltas?.[recipientWallet]).toBeUndefined();
	});

	it('resolves Account args that come from a prior account::create Result', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const freshOwner = normalizeSuiAddress('0xfa7e');
		const expectedFreshAddress = deriveTestAccountAddress(freshOwner);

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		// Build up a fresh Balance<USDC> from the sender's AB.
		const withdrawal = tx.withdrawal({ amount: 250_000_000n, type: USDC_TYPE_ARG });
		const balance = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: [USDC_TYPE_ARG],
			arguments: [withdrawal],
		});
		// Create a fresh PAS account for `freshOwner` and deposit into it via the Result ref.
		const freshAccount = tx.moveCall({
			target: `${PAS_PACKAGE}::account::create`,
			arguments: [tx.object(PAS_NAMESPACE), tx.pure.address(freshOwner)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::deposit_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [freshAccount, balance],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[expectedFreshAddress]?.find((f) => f.coinType === USDC)?.amount).toBe(
			250_000_000n,
		);
	});

	it('flags a non-pure amount on send_balance', async () => {
		const client = setupClient([ACCOUNT_A_ID, ACCOUNT_B_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		// `auth` as the amount arg — a Result, not a Pure. Dynamic
		// withdrawals are flagged; balanceFlows won't produce a delta.
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, tx.object(ACCOUNT_B_ID), auth],
		});

		const results = await analyzeTx(client, tx);

		expect(
			results.balanceFlows.issues?.some((i) =>
				/pas::account::send_balance.*expects a pure u64 amount/.test(i.message),
			),
		).toBe(true);
	});

	it('flags a non-pure amount on unlock_balance', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::unlock_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, auth, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(
			results.balanceFlows.issues?.some((i) =>
				/pas::account::unlock_balance.*expects a pure u64 amount/.test(i.message),
			),
		).toBe(true);
	});

	it('flags a non-pure amount on clawback_balance', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const amount = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::clawback_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), amount, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(
			results.balanceFlows.issues?.some((i) =>
				/pas::account::clawback_balance.*expects a pure u64 amount/.test(i.message),
			),
		).toBe(true);
	});

	it('does nothing for MoveCalls in other packages', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const coin = tx.object(TEST_USDC_COIN_ID);
		const [split] = tx.splitCoins(coin, [100n]);
		// Exercise a real foreign-package MoveCall — not a TransferObjects.
		tx.moveCall({
			target: `${normalizeSuiAddress('0x9999')}::issuer::approve_transfer`,
			arguments: [tx.object(ACCOUNT_A_ID), tx.object(POLICY)],
		});
		tx.transferObjects([split], tx.pure.address(normalizeSuiAddress('0x456')));

		const results = await analyzeTx(client, tx);

		const deltas = results.balanceFlows.result?.byAddress;
		// Account A should not appear in deltas just because it was passed to a foreign MoveCall.
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount ?? 0n).toBe(0n);
	});

	it('preserves send_balance credit across a template approval MoveCall', async () => {
		const client = setupClient([ACCOUNT_A_ID, ACCOUNT_B_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [
				tx.object(ACCOUNT_A_ID),
				auth,
				tx.object(ACCOUNT_B_ID),
				tx.pure.u64(120_000_000n),
			],
		});
		// Issuer approval template — takes the Request by &mut, which under a naive
		// analyzer would consume the tracked hot potato before resolve_balance runs.
		tx.moveCall({
			target: `${normalizeSuiAddress('0x9999')}::issuer::approve_transfer`,
			arguments: [request, tx.object(POLICY)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-120_000_000n);
		expect(deltas?.[ACCOUNT_B_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(120_000_000n);
	});

	it('unlock_funds::resolve_unrestricted_balance surfaces the Balance<T> downstream', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::unlock_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, tx.pure.u64(80_000_000n)],
		});
		// Use the unrestricted resolver (takes Namespace, not Policy).
		const balance = tx.moveCall({
			target: `${PAS_PACKAGE}::unlock_funds::resolve_unrestricted_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(PAS_NAMESPACE)],
		});
		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: [USDC_TYPE_ARG],
			arguments: [balance],
		});
		tx.transferObjects([coin], tx.pure.address(DEFAULT_SENDER));

		const results = await analyzeTx(client, tx);

		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-80_000_000n);
		expect(
			deltas?.[normalizeSuiAddress(DEFAULT_SENDER)]?.find((f) => f.coinType === USDC)?.amount,
		).toBe(80_000_000n);
	});

	it('handles mixed Object/Result account args on send_balance', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const freshOwner = normalizeSuiAddress('0xca11');
		const freshAccount = deriveTestAccountAddress(freshOwner);

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const to = tx.moveCall({
			target: `${PAS_PACKAGE}::account::create`,
			arguments: [tx.object(PAS_NAMESPACE), tx.pure.address(freshOwner)],
		});
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, to, tx.pure.u64(40_000_000n)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		const deltas = results.balanceFlows.result?.byAddress;
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-40_000_000n);
		expect(deltas?.[freshAccount]?.find((f) => f.coinType === USDC)?.amount).toBe(40_000_000n);
	});

	it('tracks multiple PAS operations in one PTB', async () => {
		const client = setupClient([ACCOUNT_A_ID, ACCOUNT_B_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		// A -> B: 100
		const sendReq = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, tx.object(ACCOUNT_B_ID), tx.pure.u64(100n)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [sendReq, tx.object(POLICY)],
		});
		// Clawback B: 30 (using same policy as stand-in)
		const clawReq = tx.moveCall({
			target: `${PAS_PACKAGE}::account::clawback_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_B_ID), tx.pure.u64(30n)],
		});
		const clawback = tx.moveCall({
			target: `${PAS_PACKAGE}::clawback_funds::resolve`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [clawReq, tx.object(POLICY)],
		});
		// Deposit clawback back into A.
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::deposit_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), clawback],
		});

		const results = await analyzeTx(client, tx);

		const deltas = results.balanceFlows.result?.byAddress;
		// A: -100 (send) + 30 (deposit) = -70; B: +100 (receive) - 30 (clawback) = +70.
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-70n);
		expect(deltas?.[ACCOUNT_B_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(70n);
	});

	it('emits no delta when send_balance amount is zero', async () => {
		const client = setupClient([ACCOUNT_A_ID, ACCOUNT_B_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const req = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, tx.object(ACCOUNT_B_ID), tx.pure.u64(0n)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [req, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress ?? {};
		expect(deltas[ACCOUNT_A_ID]).toBeUndefined();
		expect(deltas[ACCOUNT_B_ID]).toBeUndefined();
	});

	it('does not refund the sender when deposit_balance target account is unresolvable', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const withdrawal = tx.withdrawal({ amount: 500_000_000n, type: USDC_TYPE_ARG });
		const balance = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: [USDC_TYPE_ARG],
			arguments: [withdrawal],
		});
		// An Account Result the handler can't resolve (not from account::create).
		const unknownAccount = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::deposit_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [unknownAccount, balance],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		// Sender's debit must stick — the balance left. If the handler failed to
		// consume the tracked balance, the implicit-return loop would refund it.
		expect(
			deltas?.[normalizeSuiAddress(DEFAULT_SENDER)]?.find((f) => f.coinType === USDC)?.amount,
		).toBe(-500_000_000n);
	});

	it('flags an issue when send_balance source is unresolvable', async () => {
		const client = setupClient([ACCOUNT_B_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		// `from` is a Result we can't resolve (not account::create), `to` is a
		// real shared Account.
		const unresolvableFrom = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [unresolvableFrom, auth, tx.object(ACCOUNT_B_ID), tx.pure.u64(200_000_000n)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(
			results.balanceFlows.issues?.some((i) =>
				/pas::account::send_balance.*could not resolve the source account/.test(i.message),
			),
		).toBe(true);
	});

	it('flags an issue when unlock_balance source account is unresolvable', async () => {
		const client = setupClient([]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		// Account arg is a Result from something other than account::create.
		const unresolvableAccount = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::unlock_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [unresolvableAccount, auth, tx.pure.u64(100_000_000n), tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(
			results.balanceFlows.issues?.some((i) =>
				/pas::account::unlock_balance.*could not resolve the source account/.test(i.message),
			),
		).toBe(true);
	});

	it('flags an issue when clawback_balance source account is unresolvable', async () => {
		const client = setupClient([]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const unresolvableAccount = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		tx.moveCall({
			target: `${PAS_PACKAGE}::account::clawback_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [unresolvableAccount, tx.pure.u64(50_000_000n), tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(
			results.balanceFlows.issues?.some((i) =>
				/pas::account::clawback_balance.*could not resolve the source account/.test(i.message),
			),
		).toBe(true);
	});

	it('still records send_balance debit when the recipient is unresolvable', async () => {
		const client = setupClient([ACCOUNT_A_ID]);
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		const auth = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		// `to` is a Result we can't resolve; `from` is a real shared Account.
		const unresolvableTo = tx.moveCall({ target: `${PAS_PACKAGE}::account::new_auth` });
		const request = tx.moveCall({
			target: `${PAS_PACKAGE}::account::send_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [tx.object(ACCOUNT_A_ID), auth, unresolvableTo, tx.pure.u64(175_000_000n)],
		});
		tx.moveCall({
			target: `${PAS_PACKAGE}::send_funds::resolve_balance`,
			typeArguments: [USDC_TYPE_ARG],
			arguments: [request, tx.object(POLICY)],
		});

		const results = await analyzeTx(client, tx);

		expect(results.balanceFlows.issues).toBeUndefined();
		const deltas = results.balanceFlows.result?.byAddress;
		// Debit fires — the source lost value even if we can't identify the recipient.
		expect(deltas?.[ACCOUNT_A_ID]?.find((f) => f.coinType === USDC)?.amount).toBe(-175_000_000n);
	});
});
