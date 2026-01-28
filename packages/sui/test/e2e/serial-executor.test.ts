// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Ed25519Keypair } from '../../src/keypairs/ed25519/index.js';
import { SerialTransactionExecutor, Transaction } from '../../src/transactions/index.js';
import { setup, TestToolbox } from './utils/setup.js';

let toolbox: TestToolbox;
let executor: SerialTransactionExecutor;
beforeAll(async () => {
	toolbox = await setup();
	executor = new SerialTransactionExecutor({
		client: toolbox.grpcClient,
		signer: toolbox.keypair,
	});

	vi.spyOn(toolbox.grpcClient.core, 'getObjects');
	vi.spyOn(toolbox.grpcClient.core, 'listCoins');
});

afterEach(async () => {
	await executor.waitForLastTransaction();
});

afterAll(() => {
	vi.restoreAllMocks();
});

describe('SerialExecutor', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await executor.resetCache();
	});

	it('Executes multiple transactions using the same objects', async () => {
		const txb = new Transaction();
		const [coin] = txb.splitCoins(txb.gas, [1]);
		txb.transferObjects([coin], toolbox.address());
		expect(toolbox.grpcClient.core.listCoins).toHaveBeenCalledTimes(0);

		const result = await executor.executeTransaction(txb);
		const effects = (result.Transaction ?? result.FailedTransaction).effects!;

		const newCoinId = effects.changedObjects.find(
			(obj) => obj.objectId !== effects.gasObject?.objectId && obj.outputState === 'ObjectWrite',
		)?.objectId!;

		expect(toolbox.grpcClient.core.listCoins).toHaveBeenCalledTimes(1);

		const txb2 = new Transaction();
		txb2.transferObjects([newCoinId], toolbox.address());
		const txb3 = new Transaction();
		txb3.transferObjects([newCoinId], toolbox.address());
		const txb4 = new Transaction();
		txb4.transferObjects([newCoinId], toolbox.address());

		const results = await Promise.all([
			executor.executeTransaction(txb2),
			executor.executeTransaction(txb3),
			executor.executeTransaction(txb4),
		]);

		const digests = results.map((r) => (r.Transaction ?? r.FailedTransaction).digest);

		expect(digests[0]).not.toEqual(digests[1]);
		expect(digests[1]).not.toEqual(digests[2]);
		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(0);
		expect(toolbox.grpcClient.core.listCoins).toHaveBeenCalledTimes(1);
	});

	it('Resets cache on errors', async () => {
		const txb = new Transaction();
		const [coin] = txb.splitCoins(txb.gas, [1]);
		txb.transferObjects([coin], toolbox.address());

		const result = await executor.executeTransaction(txb);
		const resultTx = result.Transaction ?? result.FailedTransaction;
		const effects = resultTx.effects!;

		await toolbox.grpcClient.core.waitForTransaction({ digest: resultTx.digest });

		const newCoinId = effects.changedObjects.find(
			(obj) => obj.objectId !== effects.gasObject?.objectId && obj.outputState === 'ObjectWrite',
		)?.objectId!;

		expect(toolbox.grpcClient.core.listCoins).toHaveBeenCalledTimes(1);

		const txb2 = new Transaction();
		txb2.transferObjects([newCoinId], toolbox.address());
		const txb3 = new Transaction();
		txb3.transferObjects([newCoinId], new Ed25519Keypair().toSuiAddress());

		const txb2Result = await toolbox.grpcClient.signAndExecuteTransaction({
			signer: toolbox.keypair,
			transaction: txb2,
		});
		const txb2Tx = txb2Result.Transaction ?? txb2Result.FailedTransaction;

		await expect(() => executor.executeTransaction(txb3)).rejects.toThrowError();
		await toolbox.grpcClient.core.waitForTransaction({ digest: txb2Tx.digest });

		// Transaction should succeed after cache reset/error
		const result2 = await executor.executeTransaction(txb3);
		const result2Tx = result2.Transaction ?? result2.FailedTransaction;

		expect(result2Tx.digest).not.toEqual(resultTx.digest);
		expect(result2Tx.status.success).toEqual(true);
	});
});

describe('SerialExecutor with addressBalance mode', () => {
	let addressBalanceExecutor: SerialTransactionExecutor;

	beforeAll(async () => {
		// First deposit funds to address balance using send_funds
		const depositAmount = 500_000_000n; // 0.5 SUI
		const depositTx = new Transaction();
		const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);
		depositTx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
		});
		const depositResult = await toolbox.grpcClient.signAndExecuteTransaction({
			signer: toolbox.keypair,
			transaction: depositTx,
		});

		await toolbox.grpcClient.core.waitForTransaction({ result: depositResult });

		addressBalanceExecutor = new SerialTransactionExecutor({
			client: toolbox.grpcClient,
			signer: toolbox.keypair,
			gasMode: 'addressBalance',
		});
	});

	afterEach(async () => {
		await addressBalanceExecutor.waitForLastTransaction();
	});

	beforeEach(async () => {
		await addressBalanceExecutor.resetCache();
	});

	it('Executes transactions using address balance for gas', async () => {
		const receiver = new Ed25519Keypair();
		const txb = new Transaction();
		// Use withdrawal to get funds from address balance, then redeem to coin
		const withdrawalInput = txb.withdrawal({ amount: 1000n });
		const [coin] = txb.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [withdrawalInput],
		});
		txb.transferObjects([coin], receiver.toSuiAddress());

		const result = await addressBalanceExecutor.executeTransaction(txb);
		const resultTx = result.Transaction ?? result.FailedTransaction;

		expect(resultTx.status.success).toEqual(true);
	});

	it('Executes multiple transactions sequentially with address balance', async () => {
		const receiver = new Ed25519Keypair();
		const results = [];
		for (let i = 0; i < 3; i++) {
			const txb = new Transaction();
			const withdrawalInput = txb.withdrawal({ amount: 1000n });
			const [coin] = txb.moveCall({
				target: '0x2::coin::redeem_funds',
				typeArguments: ['0x2::sui::SUI'],
				arguments: [withdrawalInput],
			});
			txb.transferObjects([coin], receiver.toSuiAddress());
			results.push(await addressBalanceExecutor.executeTransaction(txb));
		}

		const digests = results.map((r) => (r.Transaction ?? r.FailedTransaction).digest);
		const uniqueDigests = new Set(digests);
		expect(uniqueDigests.size).toBe(3);

		results.forEach((r) => {
			expect((r.Transaction ?? r.FailedTransaction).status.success).toEqual(true);
		});
	});
});
