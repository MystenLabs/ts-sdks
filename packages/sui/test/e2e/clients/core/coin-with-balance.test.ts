// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toBase64 } from '@mysten/bcs';
import { beforeAll, describe, expect } from 'vitest';

import { bcs } from '../../../../src/bcs/index.js';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { coinWithBalance } from '../../../../src/transactions/intents/CoinWithBalance.js';
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
				mintTx.pure.u64(50), // enough for multiple test runs
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
							{
								Input: 2,
							},
						],
					},
				},
				{
					SplitCoins: {
						coin: {
							Input: 1,
						},
						amounts: [
							{
								Input: 3,
							},
						],
					},
				},
				{
					SplitCoins: {
						coin: {
							GasCoin: true,
						},
						amounts: [
							{
								Input: 4,
							},
						],
					},
				},
				{
					SplitCoins: {
						coin: {
							GasCoin: true,
						},
						amounts: [
							{
								Input: 5,
							},
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
							{ NestedResult: [1, 0] },
							{ NestedResult: [2, 0] },
							{ NestedResult: [3, 0] },
							{ Result: 4 },
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
		testWithAllClients(
			'uses address balance for SUI when available',
			async (client) => {
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

				expect(resolved.inputs).toEqual([
					{
						Pure: {
							bytes: toBase64(fromHex(receiver.toSuiAddress())),
						},
					},
					{
						FundsWithdrawal: {
							reservation: {
								$kind: 'MaxAmountU64',
								MaxAmountU64: String(requestAmount1),
							},
							typeArg: {
								$kind: 'Balance',
								Balance: normalizeStructTag('0x2::sui::SUI'),
							},
							withdrawFrom: {
								$kind: 'Sender',
								Sender: true,
							},
						},
					},
					{
						FundsWithdrawal: {
							reservation: {
								$kind: 'MaxAmountU64',
								MaxAmountU64: String(requestAmount2),
							},
							typeArg: {
								$kind: 'Balance',
								Balance: normalizeStructTag('0x2::sui::SUI'),
							},
							withdrawFrom: {
								$kind: 'Sender',
								Sender: true,
							},
						},
					},
				]);

				expect(resolved.commands).toEqual([
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'redeem_funds',
							typeArguments: [normalizeStructTag('0x2::sui::SUI')],
							arguments: [{ Input: 1 }],
						},
					},
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'redeem_funds',
							typeArguments: [normalizeStructTag('0x2::sui::SUI')],
							arguments: [{ Input: 2 }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [0, 0] }, { NestedResult: [1, 0] }],
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
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'uses address balance for custom coin when available',
			async (client) => {
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

				expect(resolved.inputs).toEqual([
					{
						Pure: {
							bytes: toBase64(fromHex(receiver.toSuiAddress())),
						},
					},
					{
						FundsWithdrawal: {
							reservation: {
								$kind: 'MaxAmountU64',
								MaxAmountU64: String(requestAmount1),
							},
							typeArg: {
								$kind: 'Balance',
								Balance: testType,
							},
							withdrawFrom: {
								$kind: 'Sender',
								Sender: true,
							},
						},
					},
					{
						FundsWithdrawal: {
							reservation: {
								$kind: 'MaxAmountU64',
								MaxAmountU64: String(requestAmount2),
							},
							typeArg: {
								$kind: 'Balance',
								Balance: testType,
							},
							withdrawFrom: {
								$kind: 'Sender',
								Sender: true,
							},
						},
					},
				]);

				expect(resolved.commands).toEqual([
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'redeem_funds',
							typeArguments: [testType],
							arguments: [{ Input: 1 }],
						},
					},
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'redeem_funds',
							typeArguments: [testType],
							arguments: [{ Input: 2 }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [0, 0] }, { NestedResult: [1, 0] }],
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
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'combines address balance and coins when neither is sufficient alone',
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

				expect(resolved.inputs).toEqual([
					{
						Pure: {
							bytes: toBase64(fromHex(receiver.toSuiAddress())),
						},
					},
					{
						FundsWithdrawal: {
							reservation: {
								$kind: 'MaxAmountU64',
								MaxAmountU64: expect.any(String),
							},
							typeArg: {
								$kind: 'Balance',
								Balance: normalizeStructTag('0x2::sui::SUI'),
							},
							withdrawFrom: {
								$kind: 'Sender',
								Sender: true,
							},
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
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'redeem_funds',
							typeArguments: [normalizeStructTag('0x2::sui::SUI')],
							arguments: [{ Input: 1 }],
						},
					},
					{
						MergeCoins: {
							destination: { GasCoin: true },
							sources: [{ Result: 0 }],
						},
					},
					{
						SplitCoins: {
							coin: { GasCoin: true },
							amounts: [{ Input: 2 }],
						},
					},
					{
						SplitCoins: {
							coin: { GasCoin: true },
							amounts: [{ Input: 3 }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [2, 0] }, { NestedResult: [3, 0] }],
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
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'combines address balance and coins for custom coin type',
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

				const objectInputs = resolved.inputs.filter(
					(input: unknown) => typeof input === 'object' && input !== null && 'Object' in input,
				);
				expect(objectInputs.length).toBeGreaterThan(0);

				const numCoins = objectInputs.length;
				const fundsWithdrawalIndex = 1 + numCoins;
				const splitAmount1Index = fundsWithdrawalIndex + 1;
				const splitAmount2Index = splitAmount1Index + 1;

				expect(resolved.inputs[0]).toEqual({
					Pure: {
						bytes: toBase64(fromHex(receiver.toSuiAddress())),
					},
				});

				for (let i = 1; i <= numCoins; i++) {
					expect(resolved.inputs[i]).toEqual({
						Object: {
							ImmOrOwnedObject: expect.anything(),
						},
					});
				}

				expect(resolved.inputs[fundsWithdrawalIndex]).toEqual({
					FundsWithdrawal: {
						reservation: {
							$kind: 'MaxAmountU64',
							MaxAmountU64: expect.any(String),
						},
						typeArg: {
							$kind: 'Balance',
							Balance: testType,
						},
						withdrawFrom: {
							$kind: 'Sender',
							Sender: true,
						},
					},
				});

				expect(resolved.inputs[splitAmount1Index]).toEqual({
					Pure: {
						bytes: toBase64(bcs.u64().serialize(requestAmount1).toBytes()),
					},
				});

				expect(resolved.inputs[splitAmount2Index]).toEqual({
					Pure: {
						bytes: toBase64(bcs.u64().serialize(requestAmount2).toBytes()),
					},
				});

				expect(resolved.commands).toEqual([
					{
						MoveCall: {
							package: normalizeSuiAddress('0x2'),
							module: 'coin',
							function: 'redeem_funds',
							typeArguments: [testType],
							arguments: [{ Input: fundsWithdrawalIndex }],
						},
					},
					{
						MergeCoins: {
							destination: { Input: 1 },
							sources: expect.arrayContaining([{ Result: 0 }]),
						},
					},
					{
						SplitCoins: {
							coin: { Input: 1 },
							amounts: [{ Input: splitAmount1Index }],
						},
					},
					{
						SplitCoins: {
							coin: { Input: 1 },
							amounts: [{ Input: splitAmount2Index }],
						},
					},
					{
						TransferObjects: {
							objects: [{ NestedResult: [2, 0] }, { NestedResult: [3, 0] }],
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
			{ skip: ['graphql'] },
		);
	});
});
