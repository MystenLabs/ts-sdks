// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import type { ClientWithCoreApi } from '../../../../src/client/index.js';
import type { Ed25519Keypair } from '../../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { createTestWithAllClients, setup, TestToolbox } from '../../utils/setup.js';

const SUI = '0x2::sui::SUI';
const ALLOWANCE_TYPE = '0x2::balance::Balance<0x2::sui::SUI>';
const LIFETIME_CAP = 1_000_000_000n; // 1 SUI
const SPEND_AMOUNT = 100_000_000n; // 0.1 SUI
const U64_MAX = 18446744073709551615n;

describe('Allowance withdrawals', () => {
	let toolbox: TestToolbox;
	let funder: { keypair: Ed25519Keypair; address: string };
	let spender: { keypair: Ed25519Keypair; address: string };
	let allowanceId: string;
	let spendDigest: string;
	const testWithAllClients = createTestWithAllClients(() => toolbox);

	/** A spend of `SPEND_AMOUNT` from the allowance, with the allowance left for the resolver. */
	function buildSpend() {
		const tx = new Transaction();
		tx.setSender(spender.address);
		const withdrawal = tx.withdrawal({
			amount: SPEND_AMOUNT,
			type: SUI,
			withdrawFrom: {
				$kind: 'SenderAllowance',
				SenderAllowance: { funder: funder.address, allowance: allowanceId },
			},
		});
		const balance = tx.moveCall({
			target: '0x2::allowance::balance_spend',
			typeArguments: [SUI],
			arguments: [tx.object(allowanceId), withdrawal, tx.object.clock()],
		});
		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: [SUI],
			arguments: [balance],
		});
		tx.transferObjects([coin], spender.address);
		return tx;
	}

	async function executeSpend(client: ClientWithCoreApi) {
		const result = await client.core.signAndExecuteTransaction({
			transaction: buildSpend(),
			signer: spender.keypair,
			include: { effects: true, transaction: true },
		});
		if (result.$kind !== 'Transaction') {
			throw new Error(
				`Spend failed: ${result.FailedTransaction.status.error?.message ?? 'unknown error'}`,
			);
		}
		await toolbox.waitForTransaction({ digest: result.Transaction.digest });
		return result.Transaction;
	}

	beforeAll(async () => {
		toolbox = await setup();
		[funder, spender] = await Promise.all([
			toolbox.getSigner({ coins: [200_000_000n], addressBalance: 2_000_000_000n }),
			toolbox.getSigner({ coins: [200_000_000n, 200_000_000n, 200_000_000n, 200_000_000n] }),
		]);

		// The funder issues a plain allowance over its SUI address balance to the spender.
		const tx = new Transaction();
		const noRateLimit = tx.moveCall({
			target: '0x1::option::none',
			typeArguments: ['0x2::allowance::RateLimit'],
		});
		tx.moveCall({
			target: '0x2::allowance::new',
			typeArguments: [ALLOWANCE_TYPE],
			arguments: [
				tx.pure.string('ts-sdk e2e'),
				tx.pure.address(spender.address),
				tx.pure.option('u256', LIFETIME_CAP),
				tx.pure.option('u64', null),
				tx.pure.option('u64', U64_MAX),
				noRateLimit,
			],
		});
		const issued = await toolbox.signAndExecuteTransaction({
			transaction: tx,
			signer: funder.keypair,
			include: { effects: true },
		});
		if (issued.$kind !== 'Transaction') {
			throw new Error(
				`Issuing the allowance failed: ${issued.FailedTransaction.status.error?.message ?? 'unknown error'}`,
			);
		}
		const allowance = issued.Transaction.effects!.changedObjects.find(
			(change) => change.idOperation === 'Created' && change.outputOwner?.$kind === 'Shared',
		);
		if (!allowance) {
			throw new Error('The allowance was not created as a shared object');
		}
		allowanceId = allowance.objectId;

		spendDigest = (await executeSpend(toolbox.grpcClient)).digest;
	});

	it('all clients return same data: transaction with an allowance withdrawal', async () => {
		await toolbox.expectAllClientsReturnSameData((client) =>
			client.core.getTransaction({
				digest: spendDigest,
				include: { transaction: true, effects: true, balanceChanges: true },
			}),
		);
	});

	testWithAllClients('decodes a SenderAllowance withdrawal input', async (client) => {
		const result = await client.core.getTransaction({
			digest: spendDigest,
			include: { transaction: true },
		});

		const input = result.Transaction!.transaction!.inputs.find(
			(input) => 'FundsWithdrawal' in input,
		);
		expect(input && 'FundsWithdrawal' in input ? input.FundsWithdrawal : undefined).toMatchObject({
			reservation: { $kind: 'MaxAmountU64', MaxAmountU64: SPEND_AMOUNT.toString() },
			withdrawFrom: {
				$kind: 'SenderAllowance',
				SenderAllowance: { funder: funder.address, allowance: allowanceId },
			},
		});
	});

	testWithAllClients('simulates an allowance spend', async (client) => {
		const result = await client.core.simulateTransaction({
			transaction: buildSpend(),
			include: { effects: true },
		});

		expect(result.$kind).toBe('Transaction');
	});

	testWithAllClients('spends from an allowance, debiting the funder', async (client) => {
		const before = await client.core.getBalance({ owner: funder.address, coinType: SUI });

		const transaction = await executeSpend(client);

		const withdrawal = transaction.transaction!.inputs.find((input) => 'FundsWithdrawal' in input);
		expect(
			withdrawal && 'FundsWithdrawal' in withdrawal
				? withdrawal.FundsWithdrawal.withdrawFrom
				: undefined,
		).toEqual({
			$kind: 'SenderAllowance',
			SenderAllowance: { funder: funder.address, allowance: allowanceId },
		});

		const after = await client.core.getBalance({ owner: funder.address, coinType: SUI });
		expect(BigInt(before.balance.addressBalance) - BigInt(after.balance.addressBalance)).toBe(
			SPEND_AMOUNT,
		);
	});
});
