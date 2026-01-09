// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions/index.js';
import { setup, TestToolbox } from './utils/setup.js';

describe('Balance Withdrawal', () => {
	let toolbox: TestToolbox;

	beforeEach(async () => {
		toolbox = await setup();
	});

	it('deposits SUI to address balance and withdraws it', async () => {
		const depositAmount = 100_000_000n; // 0.1 SUI

		const depositTx = new Transaction();
		const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);

		depositTx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
		});

		const depositResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: depositTx,
			signer: toolbox.keypair,
			options: { showEffects: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: depositResult.digest });
		expect(depositResult.effects?.status.status).toEqual('success');

		const withdrawTx = new Transaction();

		const withdrawal = withdrawTx.withdrawal({
			amount: depositAmount,
			type: '0x2::sui::SUI',
		});

		const balance = withdrawTx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [withdrawal],
		});

		const coin = withdrawTx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [balance],
		});

		withdrawTx.transferObjects([coin], toolbox.address());

		const withdrawResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: withdrawTx,
			signer: toolbox.keypair,
			options: { showEffects: true, showBalanceChanges: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: withdrawResult.digest });
		expect(withdrawResult.effects?.status.status).toEqual('success');
	});

	it('uses address balance for gas payment and withdrawal', async () => {
		const depositAmount = 200_000_000n; // 0.2 SUI (enough for gas + withdrawal)
		const withdrawalAmount = 50_000_000n; // 0.05 SUI

		// Step 1: Deposit SUI to address balance
		const depositTx = new Transaction();
		const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);

		depositTx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
		});

		const depositResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: depositTx,
			signer: toolbox.keypair,
			options: { showEffects: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: depositResult.digest });
		expect(depositResult.effects?.status.status).toEqual('success');

		// Step 2: Get chain info for ValidDuring expiration
		const [genesisCheckpoint, gasPrice, systemState] = await Promise.all([
			toolbox.jsonRpcClient.getCheckpoint({ id: '0' }),
			toolbox.jsonRpcClient.getReferenceGasPrice(),
			toolbox.jsonRpcClient.getLatestSuiSystemState(),
		]);
		const chainDigest = genesisCheckpoint.digest; // Full 32-byte checkpoint digest
		const currentEpoch = BigInt(systemState.epoch);

		// Step 3: Create transaction that uses address balance for gas
		const tx = new Transaction();

		// Withdraw from address balance
		const withdrawal = tx.withdrawal({
			amount: withdrawalAmount,
			type: '0x2::sui::SUI',
		});

		const balance = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [withdrawal],
		});

		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [balance],
		});

		tx.transferObjects([coin], toolbox.address());

		// Configure for address balance gas payment
		tx.setSender(toolbox.address());
		tx.setGasPayment([]); // Empty payment = use address balance
		tx.setGasPrice(gasPrice);
		tx.setGasBudget(100_000_000n); // 0.1 SUI budget
		tx.setExpiration({
			ValidDuring: {
				minEpoch: String(currentEpoch),
				maxEpoch: String(currentEpoch + 1n),
				minTimestamp: null,
				maxTimestamp: null,
				chain: chainDigest,
				nonce: (Math.random() * 0x100000000) >>> 0,
			},
		});

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: { showEffects: true, showBalanceChanges: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });
		expect(result.effects?.status.status).toEqual('success');
	});

	it('automatically sets ValidDuring expiration for address balance gas', async () => {
		const depositAmount = 200_000_000n; // 0.2 SUI (enough for gas + withdrawal)
		const withdrawalAmount = 50_000_000n; // 0.05 SUI

		// Step 1: Deposit SUI to address balance
		const depositTx = new Transaction();
		const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);

		depositTx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
		});

		const depositResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: depositTx,
			signer: toolbox.keypair,
			options: { showEffects: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: depositResult.digest });
		expect(depositResult.effects?.status.status).toEqual('success');

		// Step 2: Create transaction that uses address balance for gas
		// Do NOT set expiration - let the resolver set it automatically
		const tx = new Transaction();

		const withdrawal = tx.withdrawal({
			amount: withdrawalAmount,
			type: '0x2::sui::SUI',
		});

		const balance = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [withdrawal],
		});

		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [balance],
		});

		tx.transferObjects([coin], toolbox.address());

		// Only set sender and empty gas payment - expiration should be auto-set
		tx.setSender(toolbox.address());
		tx.setGasPayment([]); // Empty payment = use address balance
		tx.setGasBudget(100_000_000n); // 0.1 SUI budget

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: { showEffects: true, showBalanceChanges: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });
		expect(result.effects?.status.status).toEqual('success');

		// Verify expiration was automatically set
		const data = tx.getData();
		expect(data.expiration?.$kind).toBe('ValidDuring');
	});

	// TODO: Enable once entireBalance is supported
	it.skip('withdraws entire balance from address accumulator', async () => {
		const depositAmount = 50_000_000n;

		const depositTx = new Transaction();
		const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);

		depositTx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
		});

		const depositResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: depositTx,
			signer: toolbox.keypair,
			options: { showEffects: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: depositResult.digest });
		expect(depositResult.effects?.status.status).toEqual('success');

		const withdrawTx = new Transaction();

		const withdrawal = withdrawTx.withdrawal({
			// @ts-expect-error entireBalance not yet supported
			entireBalance: true,
			type: '0x2::sui::SUI',
		});

		const balance = withdrawTx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [withdrawal],
		});

		const coin = withdrawTx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [balance],
		});

		withdrawTx.transferObjects([coin], toolbox.address());

		const withdrawResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: withdrawTx,
			signer: toolbox.keypair,
			options: { showEffects: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: withdrawResult.digest });
		expect(withdrawResult.effects?.status.status).toEqual('success');
	});
});
