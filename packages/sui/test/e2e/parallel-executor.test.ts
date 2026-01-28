// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, afterAll, beforeAll, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { GrpcCoreClient } from '../../src/grpc/index.js';
import { Ed25519Keypair } from '../../src/keypairs/ed25519/index.js';
import { ParallelTransactionExecutor, Transaction } from '../../src/transactions/index.js';
import { setup, TestToolbox } from './utils/setup.js';

let toolbox: TestToolbox;
let executor: ParallelTransactionExecutor;

describe('ParallelTransactionExecutor', () => {
	beforeAll(async () => {
		toolbox = await setup();

		// Creates bear package
		await toolbox.mintNft();

		executor = new ParallelTransactionExecutor({
			client: toolbox.grpcClient,
			signer: toolbox.keypair,
			maxPoolSize: 3,
			coinBatchSize: 2,
		});

		vi.spyOn(toolbox.grpcClient.core, 'getObjects');
		vi.spyOn(toolbox.grpcClient.core, 'listCoins');
		vi.spyOn(toolbox.grpcClient.core, 'executeTransaction');
	});

	afterEach(async () => {
		await executor.waitForLastTransaction();
	});

	beforeEach(async () => {
		await executor.resetCache();
		vi.clearAllMocks();
	});

	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('Executes multiple transactions in parallel', async () => {
		let concurrentRequests = 0;
		let maxConcurrentRequests = 0;
		let totalTransactions = 0;

		(toolbox.grpcClient.core.executeTransaction as Mock).mockImplementation(async function (
			this: GrpcCoreClient,
			input,
		) {
			totalTransactions++;
			concurrentRequests++;
			maxConcurrentRequests = Math.max(maxConcurrentRequests, concurrentRequests);
			const promise = GrpcCoreClient.prototype.executeTransaction.call(this, input);

			return promise.finally(() => {
				concurrentRequests--;
			});
		});

		const txbs = [];

		for (let i = 0; i < 10; i++) {
			const txb = new Transaction();
			txb.transferObjects([await toolbox.mintNft()], toolbox.address());
			txbs.push(txb);
		}

		const results = await Promise.all(txbs.map((txb) => executor.executeTransaction(txb)));

		expect(maxConcurrentRequests).toBe(3);
		// 10 + initial coin split + 1 refill to reach concurrency limit
		expect(totalTransactions).toBe(12);

		const digests = new Set(results.map((r) => (r.Transaction ?? r.FailedTransaction).digest));
		expect(digests.size).toBe(results.length);
	});

	it('handles gas coin transfers', async () => {
		const receiver = new Ed25519Keypair();

		const txbs = Array.from({ length: 10 }, () => {
			const txb = new Transaction();
			txb.transferObjects([txb.gas], receiver.toSuiAddress());
			return txb;
		});

		const results = await Promise.all(txbs.map((txb) => executor.executeTransaction(txb)));

		const digests = new Set(results.map((r) => (r.Transaction ?? r.FailedTransaction).digest));
		expect(digests.size).toBe(results.length);

		const returnFunds = new Transaction();
		returnFunds.transferObjects([returnFunds.gas], toolbox.address());

		await toolbox.grpcClient.signAndExecuteTransaction({
			transaction: returnFunds,
			signer: receiver,
		});
	});

	it('handles errors', async () => {
		const txbs = Array.from({ length: 10 }, (_, i) => {
			const txb = new Transaction();

			if (i % 2 === 0) {
				txb.transferObjects([txb.splitCoins(txb.gas, [1])[0]], toolbox.address());
			} else {
				// Use an object argument so normalizeInputs tries to resolve the function and fails quickly
				txb.moveCall({
					target: '0x123::foo::bar',
					arguments: [txb.object('0x6')],
				});
			}

			return txb;
		});

		const results = await Promise.allSettled(txbs.map((txb) => executor.executeTransaction(txb)));

		const failed = results.filter((result) => result.status === 'rejected');
		const succeeded = new Set(
			results
				.filter((result) => result.status === 'fulfilled')
				.map((r) => {
					if (r.status !== 'fulfilled') return null;
					return (r.value.Transaction ?? r.value.FailedTransaction).digest;
				}),
		);

		expect(failed.length).toBe(5);
		expect(succeeded.size).toBe(5);
	});

	it('handles transactions that use the same objects', async () => {
		const newCoins = await Promise.all(
			new Array(3).fill(null).map(async () => {
				const txb = new Transaction();
				const [coin] = txb.splitCoins(txb.gas, [1]);
				txb.transferObjects([coin], toolbox.address());
				const result = await executor.executeTransaction(txb);

				const effects = (result.Transaction ?? result.FailedTransaction).effects!;
				const newCoinId = effects.changedObjects.find(
					(obj) =>
						obj.objectId !== effects.gasObject?.objectId && obj.outputState === 'ObjectWrite',
				)?.objectId!;

				return newCoinId;
			}),
		);

		const txbs = newCoins.flatMap((newCoinId) => {
			const txb2 = new Transaction();
			txb2.transferObjects([newCoinId], toolbox.address());
			const txb3 = new Transaction();
			txb3.transferObjects([newCoinId], toolbox.address());
			const txb4 = new Transaction();
			txb4.transferObjects([newCoinId], toolbox.address());

			return [txb2, txb3, txb4];
		});

		const results = await Promise.all(txbs.map((txb) => executor.executeTransaction(txb)));

		const digests = new Set(results.map((r) => (r.Transaction ?? r.FailedTransaction).digest));
		expect(digests.size).toBe(9);
	});

	it('removes coins from pool when they drop below the minimum', async () => {
		executor = new ParallelTransactionExecutor({
			client: toolbox.grpcClient,
			signer: toolbox.keypair,
			maxPoolSize: 1,
			coinBatchSize: 1,
			// if initial and minimum are equal, the first usage will drop the coin below the threshold
			minimumCoinBalance: 50_000_000n,
			initialCoinBalance: 50_000_000n,
		});

		const tx1 = new Transaction();
		tx1.transferObjects([await toolbox.mintNft()], toolbox.address());
		const r1 = await executor.executeTransaction(tx1);

		expect((r1.Transaction ?? r1.FailedTransaction).status.success).toEqual(true);
		// 1 tx to fill the gas pool + the executed transaction
		expect(toolbox.grpcClient.core.executeTransaction).toHaveBeenCalledTimes(2);

		const tx2 = new Transaction();
		tx2.transferObjects([await toolbox.mintNft()], toolbox.address());
		const r2 = await executor.executeTransaction(tx2);

		expect((r2.Transaction ?? r2.FailedTransaction).status.success).toEqual(true);
		// 2 txs to refill the gas pool + 2 executed transactions
		expect(toolbox.grpcClient.core.executeTransaction).toHaveBeenCalledTimes(4);
	});
});

describe('ParallelTransactionExecutor with addressBalance mode', () => {
	let addressBalanceExecutor: ParallelTransactionExecutor;

	beforeAll(async () => {
		// Wait for any pending transactions from previous tests
		await executor.waitForLastTransaction();

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

		addressBalanceExecutor = new ParallelTransactionExecutor({
			client: toolbox.grpcClient,
			signer: toolbox.keypair,
			gasMode: 'addressBalance',
			maxPoolSize: 3,
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

	it('Executes multiple transactions in parallel with address balance', async () => {
		const receiver = new Ed25519Keypair();
		const txbs = [];

		for (let i = 0; i < 5; i++) {
			const txb = new Transaction();
			const withdrawalInput = txb.withdrawal({ amount: 1000n });
			const [coin] = txb.moveCall({
				target: '0x2::coin::redeem_funds',
				typeArguments: ['0x2::sui::SUI'],
				arguments: [withdrawalInput],
			});
			txb.transferObjects([coin], receiver.toSuiAddress());
			txbs.push(txb);
		}

		const results = await Promise.all(
			txbs.map((txb) => addressBalanceExecutor.executeTransaction(txb)),
		);

		const digests = new Set(results.map((r) => (r.Transaction ?? r.FailedTransaction).digest));
		expect(digests.size).toBe(results.length);

		results.forEach((r) => {
			expect((r.Transaction ?? r.FailedTransaction).status.success).toEqual(true);
		});
	});
});
