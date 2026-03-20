// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toBase64 } from '@mysten/bcs';
import { beforeAll, describe, expect } from 'vitest';

import { bcs } from '../../../../src/bcs/index.js';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../../src/transactions/index.js';
import {
	coinWithBalance,
	createBalance,
} from '../../../../src/transactions/intents/CoinWithBalance.js';
import type { ClientWithCoreApi } from '../../../../src/client/core.js';
import { normalizeSuiAddress, normalizeStructTag } from '../../../../src/utils/index.js';
import { createTestWithAllClients, setup, TestToolbox } from '../../utils/setup.js';

describe('coinWithBalance', () => {
	let toolbox: TestToolbox;
	let publishToolbox: TestToolbox;
	let packageId: string;
	let testType: string;
	let testTypeZero: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		[toolbox, publishToolbox] = await Promise.all([setup(), setup()]);
		packageId = await publishToolbox.getPackage('test_data', { normalized: false });
		testType = normalizeSuiAddress(packageId) + '::test::TEST';
		testTypeZero = normalizeSuiAddress(packageId) + '::test_zero::TEST_ZERO';

		// Get the TreasuryCap shared object to mint TEST coins
		const treasuryCapId = publishToolbox.getSharedObject('test_data', 'TreasuryCap<TEST>');
		if (!treasuryCapId) {
			throw new Error('TreasuryCap not found in pre-published package');
		}

		// Mint TEST coins to publishToolbox address for coin tests
		const mintTx = new Transaction();
		mintTx.moveCall({
			target: `${packageId}::test::mint`,
			arguments: [
				mintTx.object(treasuryCapId),
				mintTx.pure.u64(100), // enough for multiple test runs across all clients
				mintTx.pure.address(publishToolbox.address()),
			],
		});

		const result = await publishToolbox.grpcClient.signAndExecuteTransaction({
			transaction: mintTx,
			signer: publishToolbox.keypair,
		});
		await publishToolbox.grpcClient.waitForTransaction({ result });
	});

	testWithAllClients('works with sui', async (client) => {
		const tx = new Transaction();
		const receiver = new Ed25519Keypair();

		tx.transferObjects(
			[
				coinWithBalance({
					type: 'gas',
					balance: 12345n,
				}),
			],
			receiver.toSuiAddress(),
		);
		tx.setSender(publishToolbox.keypair.toSuiAddress());

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: ['CoinWithBalance'],
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					$Intent: {
						data: {
							balance: '12345',
							type: 'gas',
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					TransferObjects: {
						objects: [
							{
								Result: 0,
							},
						],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client,
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(12345).toBytes()),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					SplitCoins: {
						coin: {
							GasCoin: true,
						},
						amounts: [
							{
								Input: 1,
							},
						],
					},
				},
				{
					TransferObjects: {
						objects: [
							{
								NestedResult: [0, 0],
							},
						],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		const { digest } = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: publishToolbox.keypair,
		});

		const result = await toolbox.jsonRpcClient.waitForTransaction({
			digest,
			options: { showEffects: true, showBalanceChanges: true },
		});

		expect(result.effects?.status.status).toBe('success');
		expect(
			result.balanceChanges?.find(
				(change) =>
					typeof change.owner === 'object' &&
					'AddressOwner' in change.owner &&
					change.owner.AddressOwner === receiver.toSuiAddress(),
			),
		).toEqual({
			amount: '12345',
			coinType: '0x2::sui::SUI',
			owner: {
				AddressOwner: receiver.toSuiAddress(),
			},
		});
	});

	testWithAllClients('works with custom coin', async (client) => {
		const tx = new Transaction();
		const receiver = new Ed25519Keypair();

		tx.transferObjects(
			[
				coinWithBalance({
					type: testType,
					balance: 1n,
				}),
			],
			receiver.toSuiAddress(),
		);
		tx.setSender(publishToolbox.keypair.toSuiAddress());

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: ['CoinWithBalance'],
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					$Intent: {
						data: {
							balance: '1',
							type: testType,
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					TransferObjects: {
						objects: [
							{
								Result: 0,
							},
						],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client,
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
				{
					Object: {
						ImmOrOwnedObject: expect.anything(),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(1).toBytes()),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					SplitCoins: {
						coin: {
							Input: 1,
						},
						amounts: [
							{
								Input: 2,
							},
						],
					},
				},
				{
					TransferObjects: {
						objects: [{ NestedResult: [0, 0] }],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		const result = await client.core.signAndExecuteTransaction({
			transaction: tx,
			signer: publishToolbox.keypair,
			include: {
				effects: true,
				balanceChanges: true,
			},
		});

		await client.core.waitForTransaction({
			result,
		});

		expect(result.Transaction?.status.success).toBe(true);
		expect(
			result.Transaction!.balanceChanges?.find(
				(change) => change.address === receiver.toSuiAddress(),
			),
		).toEqual({
			amount: '1',
			coinType: testType,
			address: receiver.toSuiAddress(),
		});
	});

	testWithAllClients('works with zero balance coin', async (client) => {
		const tx = new Transaction();
		const receiver = new Ed25519Keypair();

		tx.transferObjects(
			[
				coinWithBalance({
					type: testTypeZero,
					balance: 0n,
				}),
				coinWithBalance({
					balance: 0n,
				}),
			],
			receiver.toSuiAddress(),
		);
		tx.setSender(publishToolbox.keypair.toSuiAddress());

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: ['CoinWithBalance'],
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					$Intent: {
						data: {
							balance: '0',
							type: testTypeZero,
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					$Intent: {
						data: {
							balance: '0',
							type: 'gas',
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					TransferObjects: {
						objects: [
							{
								Result: 0,
							},
							{
								Result: 1,
							},
						],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client: publishToolbox.jsonRpcClient,
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					MoveCall: {
						arguments: [],
						function: 'zero',
						module: 'coin',
						package: '0x0000000000000000000000000000000000000000000000000000000000000002',
						typeArguments: [testTypeZero],
					},
				},
				{
					MoveCall: {
						arguments: [],
						function: 'zero',
						module: 'coin',
						package: '0x0000000000000000000000000000000000000000000000000000000000000002',
						typeArguments: [
							'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
						],
					},
				},
				{
					TransferObjects: {
						objects: [{ Result: 0 }, { Result: 1 }],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		const result = await client.core.signAndExecuteTransaction({
			transaction: tx,
			signer: publishToolbox.keypair,
			include: {
				effects: true,
				balanceChanges: true,
				objectTypes: true,
			},
		});

		await client.core.waitForTransaction({
			result,
		});

		expect(result.Transaction?.status.success).toBe(true);
		const objectTypes = result.Transaction?.objectTypes ?? {};
		expect(
			result.Transaction?.effects.changedObjects?.filter((change) => {
				if (change.idOperation !== 'Created') return false;
				if (
					typeof change.outputOwner !== 'object' ||
					!change.outputOwner ||
					!('AddressOwner' in change.outputOwner)
				)
					return false;

				return (
					objectTypes[change.objectId] === normalizeStructTag(`0x2::coin::Coin<${testTypeZero}>`) &&
					change.outputOwner.AddressOwner === receiver.toSuiAddress()
				);
			}).length,
		).toEqual(1);
	});

	testWithAllClients('works with multiple coins', async (client) => {
		const tx = new Transaction();
		const receiver = new Ed25519Keypair();

		tx.transferObjects(
			[
				coinWithBalance({ type: testType, balance: 1n }),
				coinWithBalance({ type: testType, balance: 2n }),
				coinWithBalance({ type: 'gas', balance: 3n }),
				coinWithBalance({ type: 'gas', balance: 4n }),
				coinWithBalance({ type: testTypeZero, balance: 0n }),
			],
			receiver.toSuiAddress(),
		);

		tx.setSender(publishToolbox.keypair.toSuiAddress());

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: ['CoinWithBalance'],
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					$Intent: {
						data: {
							balance: '1',
							type: testType,
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					$Intent: {
						data: {
							balance: '2',
							type: testType,
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					$Intent: {
						data: {
							balance: '3',
							type: 'gas',
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					$Intent: {
						data: {
							balance: '4',
							type: 'gas',
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					$Intent: {
						data: {
							balance: '0',
							type: testTypeZero,
							outputKind: 'coin',
						},
						inputs: {},
						name: 'CoinWithBalance',
					},
				},
				{
					TransferObjects: {
						objects: [
							{
								Result: 0,
							},
							{
								Result: 1,
							},
							{
								Result: 2,
							},
							{
								Result: 3,
							},
							{
								Result: 4,
							},
						],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		expect(
			JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client: publishToolbox.jsonRpcClient,
				}),
			),
		).toEqual({
			expiration: null,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			inputs: [
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
				{
					Object: {
						ImmOrOwnedObject: expect.anything(),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(1).toBytes()),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(2).toBytes()),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(3).toBytes()),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(4).toBytes()),
					},
				},
			],
			sender: publishToolbox.keypair.toSuiAddress(),
			commands: [
				{
					SplitCoins: {
						coin: {
							Input: 1,
						},
						amounts: [
							{ Input: 2 },
							{ Input: 3 },
						],
					},
				},
				{
					SplitCoins: {
						coin: {
							GasCoin: true,
						},
						amounts: [
							{ Input: 4 },
							{ Input: 5 },
						],
					},
				},
				{
					MoveCall: {
						arguments: [],
						function: 'zero',
						module: 'coin',
						package: '0x0000000000000000000000000000000000000000000000000000000000000002',
						typeArguments: [testTypeZero],
					},
				},
				{
					TransferObjects: {
						objects: [
							{ NestedResult: [0, 0] },
							{ NestedResult: [0, 1] },
							{ NestedResult: [1, 0] },
							{ NestedResult: [1, 1] },
							{ Result: 2 },
						],
						address: {
							Input: 0,
						},
					},
				},
			],
			version: 2,
		});

		const result = await client.core.signAndExecuteTransaction({
			transaction: tx,
			signer: publishToolbox.keypair,
			include: {
				effects: true,
				balanceChanges: true,
				objectTypes: true,
			},
		});

		await client.core.waitForTransaction({
			result,
		});

		expect(result.Transaction?.status.success).toBe(true);
		expect(
			result.Transaction?.balanceChanges?.filter(
				(change) => change.address === receiver.toSuiAddress(),
			),
		).toEqual([
			{
				amount: '7',
				coinType: normalizeStructTag('0x2::sui::SUI'),
				address: receiver.toSuiAddress(),
			},
			{
				amount: '3',
				coinType: testType,
				address: receiver.toSuiAddress(),
			},
		]);
		const objectTypes = result.Transaction?.objectTypes ?? {};
		expect(
			result.Transaction?.effects.changedObjects?.filter((change) => {
				if (change.idOperation !== 'Created') return false;
				if (
					typeof change.outputOwner !== 'object' ||
					!change.outputOwner ||
					!('AddressOwner' in change.outputOwner)
				)
					return false;

				return (
					objectTypes[change.objectId] === normalizeStructTag(`0x2::coin::Coin<${testTypeZero}>`) &&
					change.outputOwner.AddressOwner === receiver.toSuiAddress()
				);
			}).length,
		).toEqual(1);
	});

	describe('with address balance', () => {
		testWithAllClients('uses address balance for SUI when available', async (client) => {
			const depositAmount = 100_000_000n;
			const depositTx = new Transaction();
			const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);
			depositTx.moveCall({
				target: '0x2::coin::send_funds',
				typeArguments: ['0x2::sui::SUI'],
				arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
			});

			const depositResult = await client.core.signAndExecuteTransaction({
				transaction: depositTx,
				signer: toolbox.keypair,
			});
			if (depositResult.$kind !== 'Transaction') throw new Error('Deposit failed');
			await client.core.waitForTransaction({ digest: depositResult.Transaction.digest });

			const receiver = new Ed25519Keypair();
			const requestAmount1 = 25_000_000n;
			const requestAmount2 = 25_000_000n;
			const totalAmount = requestAmount1 + requestAmount2;

			const tx = new Transaction();
			tx.transferObjects(
				[
					coinWithBalance({ type: 'gas', balance: requestAmount1 }),
					coinWithBalance({ type: 'gas', balance: requestAmount2 }),
				],
				receiver.toSuiAddress(),
			);
			tx.setSender(toolbox.address());

			expect(
				JSON.parse(
					await tx.toJSON({
						supportedIntents: ['CoinWithBalance'],
					}),
				),
			).toEqual({
				expiration: null,
				gasData: {
					budget: null,
					owner: null,
					payment: null,
					price: null,
				},
				inputs: [
					{
						Pure: {
							bytes: toBase64(fromHex(receiver.toSuiAddress())),
						},
					},
				],
				sender: toolbox.address(),
				commands: [
					{
						$Intent: {
							data: {
								balance: String(requestAmount1),
								type: 'gas',
								outputKind: 'coin',
							},
							inputs: {},
							name: 'CoinWithBalance',
						},
					},
					{
						$Intent: {
							data: {
								balance: String(requestAmount2),
								type: 'gas',
								outputKind: 'coin',
							},
							inputs: {},
							name: 'CoinWithBalance',
						},
					},
					{
						TransferObjects: {
							objects: [{ Result: 0 }, { Result: 1 }],
							address: { Input: 0 },
						},
					},
				],
				version: 2,
			});

			const resolved = JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client,
				}),
			);

			// Coin intents go through Path 2. Gas type → SplitCoins from GasCoin.
			expect(resolved.inputs).toEqual([
				{
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(requestAmount1).toBytes()),
					},
				},
				{
					Pure: {
						bytes: toBase64(bcs.u64().serialize(requestAmount2).toBytes()),
					},
				},
			]);

			expect(resolved.commands).toEqual([
				{
					SplitCoins: {
						coin: { GasCoin: true },
						amounts: [{ Input: 1 }, { Input: 2 }],
					},
				},
				{
					TransferObjects: {
						objects: [{ NestedResult: [0, 0] }, { NestedResult: [0, 1] }],
						address: { Input: 0 },
					},
				},
			]);

			const result = await client.core.signAndExecuteTransaction({
				transaction: tx,
				signer: toolbox.keypair,
				include: { balanceChanges: true },
			});

			await client.core.waitForTransaction({ result });

			expect(result.$kind).toBe('Transaction');
			if (result.$kind !== 'Transaction') throw new Error('Transaction failed');

			expect(result.Transaction.status.success).toBe(true);
			expect(
				result.Transaction.balanceChanges?.find(
					(change) => change.address === receiver.toSuiAddress(),
				)?.amount,
			).toBe(String(totalAmount));
		});

		testWithAllClients('uses address balance for custom coin when available', async (client) => {
			const coins = await client.core.listCoins({
				owner: publishToolbox.address(),
				coinType: testType,
			});
			expect(coins.objects.length).toBeGreaterThan(0);

			const depositAmount = 4n;
			const depositTx = new Transaction();
			const [coinToDeposit] = depositTx.splitCoins(depositTx.object(coins.objects[0].objectId), [
				depositAmount,
			]);
			depositTx.moveCall({
				target: '0x2::coin::send_funds',
				typeArguments: [testType],
				arguments: [coinToDeposit, depositTx.pure.address(publishToolbox.address())],
			});

			const depositResult = await client.core.signAndExecuteTransaction({
				transaction: depositTx,
				signer: publishToolbox.keypair,
			});
			if (depositResult.$kind !== 'Transaction') throw new Error('Deposit failed');
			await client.core.waitForTransaction({ digest: depositResult.Transaction.digest });

			const receiver = new Ed25519Keypair();
			const requestAmount1 = 1n;
			const requestAmount2 = 1n;
			const totalAmount = requestAmount1 + requestAmount2;

			const tx = new Transaction();
			tx.transferObjects(
				[
					coinWithBalance({ type: testType, balance: requestAmount1 }),
					coinWithBalance({ type: testType, balance: requestAmount2 }),
				],
				receiver.toSuiAddress(),
			);
			tx.setSender(publishToolbox.address());

			expect(
				JSON.parse(
					await tx.toJSON({
						supportedIntents: ['CoinWithBalance'],
					}),
				),
			).toEqual({
				expiration: null,
				gasData: {
					budget: null,
					owner: null,
					payment: null,
					price: null,
				},
				inputs: [
					{
						Pure: {
							bytes: toBase64(fromHex(receiver.toSuiAddress())),
						},
					},
				],
				sender: publishToolbox.address(),
				commands: [
					{
						$Intent: {
							data: {
								balance: String(requestAmount1),
								type: testType,
								outputKind: 'coin',
							},
							inputs: {},
							name: 'CoinWithBalance',
						},
					},
					{
						$Intent: {
							data: {
								balance: String(requestAmount2),
								type: testType,
								outputKind: 'coin',
							},
							inputs: {},
							name: 'CoinWithBalance',
						},
					},
					{
						TransferObjects: {
							objects: [{ Result: 0 }, { Result: 1 }],
							address: { Input: 0 },
						},
					},
				],
				version: 2,
			});

			const resolved = JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client,
				}),
			);

			// Coin intents go through Path 2: combined SplitCoins from coin objects
			expect(resolved.commands).toEqual([
				{
					SplitCoins: {
						coin: { Input: expect.any(Number) },
						amounts: [{ Input: expect.any(Number) }, { Input: expect.any(Number) }],
					},
				},
				{
					TransferObjects: {
						objects: [{ NestedResult: [0, 0] }, { NestedResult: [0, 1] }],
						address: { Input: 0 },
					},
				},
			]);

			const result = await client.core.signAndExecuteTransaction({
				transaction: tx,
				signer: publishToolbox.keypair,
				include: { balanceChanges: true },
			});

			await client.core.waitForTransaction({ result });

			expect(result.$kind).toBe('Transaction');
			if (result.$kind !== 'Transaction') throw new Error('Transaction failed');

			expect(result.Transaction.status.success).toBe(true);
			expect(
				result.Transaction.balanceChanges?.find(
					(change) => change.address === receiver.toSuiAddress(),
				)?.amount,
			).toBe(String(totalAmount));
		});

		testWithAllClients(
			'gas type uses GasCoin directly when address balance is insufficient',
			async (client) => {
				const depositAmount = 50_000_000n;
				const depositTx = new Transaction();
				const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);
				depositTx.moveCall({
					target: '0x2::coin::send_funds',
					typeArguments: ['0x2::sui::SUI'],
					arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
				});

				const depositResult = await client.core.signAndExecuteTransaction({
					transaction: depositTx,
					signer: toolbox.keypair,
				});
				if (depositResult.$kind !== 'Transaction') throw new Error('Deposit failed');
				await client.core.waitForTransaction({ digest: depositResult.Transaction.digest });

				const receiver = new Ed25519Keypair();
				const requestAmount1 = 500_000_000n;
				const requestAmount2 = 500_000_000n;
				const totalAmount = requestAmount1 + requestAmount2;

				const tx = new Transaction();
				tx.transferObjects(
					[
						coinWithBalance({ type: 'gas', balance: requestAmount1 }),
						coinWithBalance({ type: 'gas', balance: requestAmount2 }),
					],
					receiver.toSuiAddress(),
				);
				tx.setSender(toolbox.address());

				expect(
					JSON.parse(
						await tx.toJSON({
							supportedIntents: ['CoinWithBalance'],
						}),
					),
				).toEqual({
					expiration: null,
					gasData: {
						budget: null,
						owner: null,
						payment: null,
						price: null,
					},
					inputs: [
						{
							Pure: {
								bytes: toBase64(fromHex(receiver.toSuiAddress())),
							},
						},
					],
					sender: toolbox.address(),
					commands: [
						{
							$Intent: {
								data: {
									balance: String(requestAmount1),
									type: 'gas',
									outputKind: 'coin',
								},
								inputs: {},
								name: 'CoinWithBalance',
							},
						},
						{
							$Intent: {
								data: {
									balance: String(requestAmount2),
									type: 'gas',
									outputKind: 'coin',
								},
								inputs: {},
								name: 'CoinWithBalance',
							},
						},
						{
							TransferObjects: {
								objects: [{ Result: 0 }, { Result: 1 }],
								address: { Input: 0 },
							},
						},
					],
					version: 2,
				});

				const resolved = JSON.parse(
					await tx.toJSON({
						supportedIntents: [],
						client,
					}),
				);

				// Gas type uses GasCoin directly — no AB redeem or merge needed.
				// The gas coin reservation mechanism handles address balance.
				expect(resolved.inputs).toEqual([
					{
						Pure: {
							bytes: toBase64(fromHex(receiver.toSuiAddress())),
						},
					},
					{
						Pure: {
							bytes: toBase64(bcs.u64().serialize(requestAmount1).toBytes()),
						},
					},
					{
						Pure: {
							bytes: toBase64(bcs.u64().serialize(requestAmount2).toBytes()),
						},
					},
				]);

				expect(resolved.commands).toEqual([
					{
						SplitCoins: {
							coin: { GasCoin: true },
							amounts: [{ Input: 1 }, { Input: 2 }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [0, 0] }, { NestedResult: [0, 1] }],
							address: { Input: 0 },
						},
					},
				]);

				const result = await client.core.signAndExecuteTransaction({
					transaction: tx,
					signer: toolbox.keypair,
					include: { balanceChanges: true },
				});

				await client.core.waitForTransaction({ result });

				expect(result.$kind).toBe('Transaction');
				if (result.$kind !== 'Transaction') throw new Error('Transaction failed');

				expect(result.Transaction.status.success).toBe(true);
				expect(
					result.Transaction.balanceChanges?.find(
						(change) => change.address === receiver.toSuiAddress(),
					)?.amount,
				).toBe(String(totalAmount));
			},
		);

		testWithAllClients(
			'uses coins directly when coin balance is sufficient (ignores available address balance)',
			async (client) => {
				const coins = await client.core.listCoins({
					owner: publishToolbox.address(),
					coinType: testType,
				});
				expect(coins.objects.length).toBeGreaterThan(0);

				const depositAmount = 2n;
				const depositTx = new Transaction();
				const [coinToDeposit] = depositTx.splitCoins(depositTx.object(coins.objects[0].objectId), [
					depositAmount,
				]);
				depositTx.moveCall({
					target: '0x2::coin::send_funds',
					typeArguments: [testType],
					arguments: [coinToDeposit, depositTx.pure.address(publishToolbox.address())],
				});

				const depositResult = await client.core.signAndExecuteTransaction({
					transaction: depositTx,
					signer: publishToolbox.keypair,
				});
				if (depositResult.$kind !== 'Transaction') throw new Error('Deposit failed');
				await client.core.waitForTransaction({ digest: depositResult.Transaction.digest });

				const receiver = new Ed25519Keypair();
				const requestAmount1 = 10n;
				const requestAmount2 = 5n;
				const totalAmount = requestAmount1 + requestAmount2;

				const tx = new Transaction();
				tx.transferObjects(
					[
						coinWithBalance({ type: testType, balance: requestAmount1 }),
						coinWithBalance({ type: testType, balance: requestAmount2 }),
					],
					receiver.toSuiAddress(),
				);
				tx.setSender(publishToolbox.address());

				expect(
					JSON.parse(
						await tx.toJSON({
							supportedIntents: ['CoinWithBalance'],
						}),
					),
				).toEqual({
					expiration: null,
					gasData: {
						budget: null,
						owner: null,
						payment: null,
						price: null,
					},
					inputs: [
						{
							Pure: {
								bytes: toBase64(fromHex(receiver.toSuiAddress())),
							},
						},
					],
					sender: publishToolbox.address(),
					commands: [
						{
							$Intent: {
								data: {
									balance: String(requestAmount1),
									type: testType,
									outputKind: 'coin',
								},
								inputs: {},
								name: 'CoinWithBalance',
							},
						},
						{
							$Intent: {
								data: {
									balance: String(requestAmount2),
									type: testType,
									outputKind: 'coin',
								},
								inputs: {},
								name: 'CoinWithBalance',
							},
						},
						{
							TransferObjects: {
								objects: [{ Result: 0 }, { Result: 1 }],
								address: { Input: 0 },
							},
						},
					],
					version: 2,
				});

				const resolved = JSON.parse(
					await tx.toJSON({
						supportedIntents: [],
						client,
					}),
				);

				// Coins sufficient — combined SplitCoins, no FundsWithdrawal
				expect(resolved.commands).toEqual([
					{
						SplitCoins: {
							coin: { Input: expect.any(Number) },
							amounts: [{ Input: expect.any(Number) }, { Input: expect.any(Number) }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [0, 0] }, { NestedResult: [0, 1] }],
							address: { Input: 0 },
						},
					},
				]);

				const result = await client.core.signAndExecuteTransaction({
					transaction: tx,
					signer: publishToolbox.keypair,
					include: { balanceChanges: true },
				});

				await client.core.waitForTransaction({ result });

				expect(result.$kind).toBe('Transaction');
				if (result.$kind !== 'Transaction') throw new Error('Transaction failed');

				expect(result.Transaction.status.success).toBe(true);
				expect(
					result.Transaction.balanceChanges?.find(
						(change) => change.address === receiver.toSuiAddress(),
					)?.amount,
				).toBe(String(totalAmount));
			},
		);
	});

	describe('createBalance', () => {
		// Accounts with known, stable state for simulation-based tests.
		// Simulate doesn't mutate state, so all transports see the same account.
		let coinsOnlyKeypair: Ed25519Keypair; // TEST coins only, zero TEST address balance
		let coinsAndBalanceKeypair: Ed25519Keypair; // TEST coins + TEST address balance

		beforeAll(async () => {
			coinsOnlyKeypair = new Ed25519Keypair();
			coinsAndBalanceKeypair = new Ed25519Keypair();
			const treasuryCapId = publishToolbox.getSharedObject('test_data', 'TreasuryCap<TEST>');

			// Fund both with SUI + mint TEST coins
			const setupTx = new Transaction();
			setupTx.transferObjects(
				[setupTx.splitCoins(setupTx.gas, [2_000_000_000n])],
				coinsOnlyKeypair.toSuiAddress(),
			);
			setupTx.transferObjects(
				[setupTx.splitCoins(setupTx.gas, [2_000_000_000n])],
				coinsAndBalanceKeypair.toSuiAddress(),
			);
			setupTx.moveCall({
				target: `${packageId}::test::mint`,
				arguments: [
					setupTx.object(treasuryCapId!),
					setupTx.pure.u64(50),
					setupTx.pure.address(coinsOnlyKeypair.toSuiAddress()),
				],
			});
			setupTx.moveCall({
				target: `${packageId}::test::mint`,
				arguments: [
					setupTx.object(treasuryCapId!),
					setupTx.pure.u64(50),
					setupTx.pure.address(coinsAndBalanceKeypair.toSuiAddress()),
				],
			});
			const setupResult = await publishToolbox.grpcClient.signAndExecuteTransaction({
				transaction: setupTx,
				signer: publishToolbox.keypair,
			});
			await publishToolbox.grpcClient.waitForTransaction({ result: setupResult });

			// Deposit 5 TEST to coinsAndBalanceKeypair's address balance
			const coins = await publishToolbox.grpcClient.core.listCoins({
				owner: coinsAndBalanceKeypair.toSuiAddress(),
				coinType: testType,
			});
			const depositTx = new Transaction();
			const [coinToDeposit] = depositTx.splitCoins(depositTx.object(coins.objects[0].objectId), [
				5n,
			]);
			const [balToDeposit] = depositTx.moveCall({
				target: '0x2::coin::into_balance',
				typeArguments: [testType],
				arguments: [coinToDeposit],
			});
			depositTx.moveCall({
				target: '0x2::balance::send_funds',
				typeArguments: [testType],
				arguments: [balToDeposit, depositTx.pure.address(coinsAndBalanceKeypair.toSuiAddress())],
			});
			const depositResult = await publishToolbox.grpcClient.signAndExecuteTransaction({
				transaction: depositTx,
				signer: coinsAndBalanceKeypair,
			});
			await publishToolbox.grpcClient.waitForTransaction({ result: depositResult });
		});

		// Helper: resolve intent and simulate in one step
		async function resolveAndSimulate(tx: Transaction, client: ClientWithCoreApi) {
			const resolved = JSON.parse(await tx.toJSON({ supportedIntents: [], client }));
			const simResult = await client.core.simulateTransaction({
				transaction: tx,
				include: { effects: true },
			});
			return { resolved, simResult };
		}

		// --- Zero balance path ---
		testWithAllClients('balance::zero — createBalance with zero amount', async (client) => {
			const tx = new Transaction();
			const bal = tx.add(createBalance({ type: testTypeZero, balance: 0n }));
			tx.moveCall({
				target: '0x2::balance::destroy_zero',
				typeArguments: [testTypeZero],
				arguments: [bal],
			});
			tx.setSender(coinsOnlyKeypair.toSuiAddress());

			const { resolved, simResult } = await resolveAndSimulate(tx, client);

			expect(resolved.commands).toEqual([
				{
					MoveCall: {
						package: normalizeSuiAddress('0x2'),
						module: 'balance',
						function: 'zero',
						typeArguments: [testTypeZero],
						arguments: [],
					},
				},
				{
					MoveCall: {
						package: normalizeSuiAddress('0x2'),
						module: 'balance',
						function: 'destroy_zero',
						typeArguments: [testTypeZero],
						arguments: [{ Result: 0 }],
					},
				},
			]);

			expect(simResult.$kind).toBe('Transaction');
		});

		// --- Path 1: Direct Withdrawal (all balance intents, AB sufficient) ---
		testWithAllClients(
			'Path 1 — createBalance with custom coin, AB sufficient (direct withdrawal)',
			async (client) => {
				// coinsAndBalanceKeypair has 5 TEST in address balance.
				// Request 2 — AB is sufficient and all intents are balance → Path 1
				const tx = new Transaction();
				const bal = tx.add(createBalance({ type: testType, balance: 2n }));
				const [coin] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [testType],
					arguments: [bal],
				});
				tx.transferObjects([coin], new Ed25519Keypair().toSuiAddress());
				tx.setSender(coinsAndBalanceKeypair.toSuiAddress());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// Path 1: balance::redeem_funds directly, no SplitCoins
				expect(resolved.commands[0]).toEqual({
					MoveCall: {
						package: normalizeSuiAddress('0x2'),
						module: 'balance',
						function: 'redeem_funds',
						typeArguments: [testType],
						arguments: [{ Input: 1 }],
					},
				});

				// No SplitCoins — direct withdrawal
				const splitCmd = resolved.commands.find((c: any) => c.SplitCoins);
				expect(splitCmd).toBeUndefined();

				expect(simResult.$kind).toBe('Transaction');
			},
		);

		// --- Path 1: Direct Withdrawal with SUI/gas balance ---
		testWithAllClients(
			'Path 1 — createBalance with SUI address balance (direct withdrawal)',
			async (client) => {
				// Use coinsOnlyKeypair which has SUI coins — deposit some to address balance
				const depositTx = new Transaction();
				const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [100_000_000n]);
				depositTx.moveCall({
					target: '0x2::coin::send_funds',
					typeArguments: ['0x2::sui::SUI'],
					arguments: [coinToDeposit, depositTx.pure.address(coinsOnlyKeypair.toSuiAddress())],
				});
				const depositResult = await client.core.signAndExecuteTransaction({
					transaction: depositTx,
					signer: coinsOnlyKeypair,
				});
				if (depositResult.$kind !== 'Transaction') throw new Error('Deposit failed');
				await client.core.waitForTransaction({ digest: depositResult.Transaction.digest });

				const tx = new Transaction();
				const bal = tx.add(createBalance({ type: 'gas', balance: 10_000_000n }));
				const [coin] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: ['0x2::sui::SUI'],
					arguments: [bal],
				});
				tx.transferObjects([coin], new Ed25519Keypair().toSuiAddress());
				tx.setSender(coinsOnlyKeypair.toSuiAddress());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// Path 1: balance::redeem_funds
				expect(resolved.commands[0]).toEqual({
					MoveCall: {
						package: normalizeSuiAddress('0x2'),
						module: 'balance',
						function: 'redeem_funds',
						typeArguments: [normalizeStructTag('0x2::sui::SUI')],
						arguments: [{ Input: 1 }],
					},
				});

				expect(simResult.$kind).toBe('Transaction');
			},
		);

		// --- Path 2: Coins only (no AB) ---
		testWithAllClients(
			'Path 2 — createBalance with custom coin (coins only, no AB)',
			async (client) => {
				const tx = new Transaction();
				const bal = tx.add(createBalance({ type: testType, balance: 1n }));
				const [coin] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [testType],
					arguments: [bal],
				});
				tx.transferObjects([coin], new Ed25519Keypair().toSuiAddress());
				tx.setSender(coinsOnlyKeypair.toSuiAddress());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// Path 2: SplitCoins → into_balance (intent) → from_balance → transfer → into_balance + send_funds (remainder)
				// Inputs: [0: receiver, 1: coin_object, 2: u64(1), 3: sender_addr]
				expect(resolved.commands).toEqual([
					{
						SplitCoins: {
							coin: { Input: 1 },
							amounts: [{ Input: 2 }],
						},
					},
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'into_balance',
							typeArguments: [testType],
							arguments: [{ NestedResult: [0, 0] }],
						},
					},
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'from_balance',
							typeArguments: [testType],
							arguments: [{ NestedResult: [1, 0] }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [2, 0] }],
							address: { Input: 0 },
						},
					},
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'into_balance',
							typeArguments: [testType],
							arguments: [{ Input: 1 }],
						},
					},
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'balance',
							function: 'send_funds',
							typeArguments: [testType],
							arguments: [{ Result: 4 }, { Input: 3 }],
						},
					},
				]);

				expect(simResult.$kind).toBe('Transaction');
			},
		);

		// --- Path 2: Coins sufficient, AB available but unused ---
		testWithAllClients(
			'Path 2 — createBalance with custom coin, coins sufficient (AB untouched)',
			async (client) => {
				// coinsAndBalanceKeypair has 5 TEST in address balance + ~45 in coins.
				// Request 10 — coins sufficient, not all balance intents → Path 2, no AB needed
				const tx = new Transaction();
				const bal = tx.add(createBalance({ type: testType, balance: 10n }));
				const [coin] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [testType],
					arguments: [bal],
				});
				tx.transferObjects([coin], new Ed25519Keypair().toSuiAddress());
				tx.setSender(coinsAndBalanceKeypair.toSuiAddress());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// No FundsWithdrawal — coins are sufficient
				const fundsInputs = resolved.inputs.filter(
					(i: any) => typeof i === 'object' && i !== null && 'FundsWithdrawal' in i,
				);
				expect(fundsInputs.length).toBe(0);

				// SplitCoins from coin objects
				expect(resolved.commands[0]).toHaveProperty('SplitCoins');

				expect(simResult.$kind).toBe('Transaction');
			},
		);

		// --- Multiple createBalance from same pool ---
		testWithAllClients(
			'Path 2 — multiple createBalance intents, combined SplitCoins',
			async (client) => {
				const tx = new Transaction();
				const bal1 = tx.add(createBalance({ type: testType, balance: 1n }));
				const bal2 = tx.add(createBalance({ type: testType, balance: 2n }));
				const [coin1] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [testType],
					arguments: [bal1],
				});
				const [coin2] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [testType],
					arguments: [bal2],
				});
				tx.transferObjects([coin1, coin2], new Ed25519Keypair().toSuiAddress());
				tx.setSender(coinsOnlyKeypair.toSuiAddress());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// Inputs: [0: receiver, 1: coin_object, 2: u64(1), 3: u64(2), 4: sender_addr]
				// Single SplitCoins with both amounts
				expect(resolved.commands[0]).toEqual({
					SplitCoins: {
						coin: { Input: 1 },
						amounts: [{ Input: 2 }, { Input: 3 }],
					},
				});

				// 2 into_balance for intent conversions + 1 for remainder = 3
				const intoBalanceCmds = resolved.commands.filter(
					(c: any) => c.MoveCall?.function === 'into_balance',
				);
				expect(intoBalanceCmds.length).toBe(3);

				expect(simResult.$kind).toBe('Transaction');
			},
		);

		// --- Gas type: SplitCoins from GasCoin ---
		testWithAllClients(
			'Path 2 — createBalance with SUI/gas (GasCoin, no remainder)',
			async (client) => {
				const tx = new Transaction();
				const bal = tx.add(createBalance({ type: 'gas', balance: 500_000_000n }));
				const [coin] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: ['0x2::sui::SUI'],
					arguments: [bal],
				});
				tx.transferObjects([coin], new Ed25519Keypair().toSuiAddress());
				tx.setSender(toolbox.address());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// Inputs: [0: receiver, 1: u64(500_000_000)]
				// SplitCoins from GasCoin + into_balance
				expect(resolved.commands[0]).toEqual({
					SplitCoins: {
						coin: { GasCoin: true },
						amounts: [{ Input: 1 }],
					},
				});
				expect(resolved.commands[1]).toEqual({
					MoveCall: {
						package: normalizeSuiAddress('0x2'),
						module: 'coin',
						function: 'into_balance',
						typeArguments: [normalizeStructTag('0x2::sui::SUI')],
						arguments: [{ NestedResult: [0, 0] }],
					},
				});

				// No remainder for gas type
				const sendFundsCmd = resolved.commands.find(
					(c: any) => c.MoveCall?.function === 'send_funds',
				);
				expect(sendFundsCmd).toBeUndefined();

				expect(simResult.$kind).toBe('Transaction');
			},
		);

		// --- Mixed coinWithBalance + createBalance ---
		testWithAllClients(
			'Path 2 — mixed coinWithBalance + createBalance for same type',
			async (client) => {
				const tx = new Transaction();
				const coinResult = tx.add(coinWithBalance({ type: testType, balance: 1n }));
				const balResult = tx.add(createBalance({ type: testType, balance: 1n }));
				const [coinFromBal] = tx.moveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [testType],
					arguments: [balResult],
				});
				tx.transferObjects([coinResult, coinFromBal], new Ed25519Keypair().toSuiAddress());
				tx.setSender(coinsOnlyKeypair.toSuiAddress());

				const { resolved, simResult } = await resolveAndSimulate(tx, client);

				// Inputs: [0: receiver, 1: coin_object, 2: u64(1), 3: u64(1), 4: sender_addr]
				// Combined SplitCoins with both amounts
				expect(resolved.commands[0]).toEqual({
					SplitCoins: {
						coin: { Input: 1 },
						amounts: [{ Input: 2 }, { Input: 3 }],
					},
				});

				// into_balance for the createBalance intent
				expect(resolved.commands[1]).toEqual({
					MoveCall: {
						package: normalizeSuiAddress('0x2'),
						module: 'coin',
						function: 'into_balance',
						typeArguments: [testType],
						arguments: [{ NestedResult: [0, 1] }],
					},
				});

				expect(simResult.$kind).toBe('Transaction');
			},
		);
	});
});
