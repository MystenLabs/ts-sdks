// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox } from './utils/setup.js';
import { coinWithBalance, Transaction } from '../../src/transactions/index.js';
import { SuiClientTypes } from '../../src/client/index.js';

describe('Party Objects', () => {
	let toolbox: TestToolbox;
	beforeAll(async () => {
		toolbox = await setup();

		// Creates bear package
		await toolbox.mintNft();
	});

	it('should correctly handle party objects', async () => {
		const createPartyTxn = new Transaction();
		createPartyTxn.setSender(toolbox.address());

		const party = createPartyTxn.moveCall({
			target: '0x2::party::single_owner',
			arguments: [createPartyTxn.pure.address(toolbox.address())],
		});

		createPartyTxn.moveCall({
			target: '0x2::transfer::public_party_transfer',
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [coinWithBalance({ balance: 1 }), party],
		});

		const result = await toolbox.keypair.signAndExecuteTransaction({
			transaction: createPartyTxn,
			client: toolbox.jsonRpcClient,
		});

		const waitResult = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest: result.Transaction!.digest,
			include: {
				effects: true,
			},
		});
		const effects = waitResult.Transaction!.effects;

		const partyCoin = effects!.changedObjects.filter(
			(o: SuiClientTypes.ChangedObject) => o.idOperation === 'Created',
		)[0].objectId;

		const returnTx = new Transaction();
		returnTx.setSender(toolbox.address());

		returnTx.moveCall({
			target: '0x2::transfer::public_transfer',
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [returnTx.object(partyCoin), returnTx.pure.address(toolbox.address())],
		});

		await returnTx.build({
			client: toolbox.jsonRpcClient,
		});

		const returnResult = await toolbox.keypair.signAndExecuteTransaction({
			transaction: returnTx,
			client: toolbox.jsonRpcClient,
		});

		const returnWaitResult = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest: returnResult.Transaction!.digest,
			include: {
				effects: true,
			},
		});
		const returnEffects = returnWaitResult.Transaction!.effects;

		expect(returnEffects!.status).toEqual({
			error: null,
			success: true,
		});
	});

	it('should correctly handle party objects only used in ptb commands', async () => {
		const createPartyTxn = new Transaction();
		createPartyTxn.setSender(toolbox.address());

		const party = createPartyTxn.moveCall({
			target: '0x2::party::single_owner',
			arguments: [createPartyTxn.pure.address(toolbox.address())],
		});

		createPartyTxn.moveCall({
			target: '0x2::transfer::public_party_transfer',
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [coinWithBalance({ balance: 1 }), party],
		});

		const result = await toolbox.keypair.signAndExecuteTransaction({
			transaction: createPartyTxn,
			client: toolbox.jsonRpcClient,
		});

		const waitResult = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest: result.Transaction!.digest,
			include: {
				effects: true,
			},
		});
		const effects = waitResult.Transaction!.effects;

		await new Promise((resolve) => setTimeout(resolve, 3000));

		const partyCoin = effects!.changedObjects.filter(
			(o: SuiClientTypes.ChangedObject) => o.idOperation === 'Created',
		)[0];

		const returnTx = new Transaction();
		returnTx.setSender(toolbox.address());
		returnTx.transferObjects(
			[
				returnTx.sharedObjectRef({
					objectId: partyCoin.objectId,
					mutable: true,
					initialSharedVersion: partyCoin.outputVersion!,
				}),
			],
			toolbox.keypair.getPublicKey().toSuiAddress(),
		);

		const returnResult = await toolbox.keypair.signAndExecuteTransaction({
			transaction: returnTx,
			client: toolbox.jsonRpcClient,
		});

		const returnWaitResult = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest: returnResult.Transaction!.digest,
			include: {
				effects: true,
			},
		});
		const returnEffects = returnWaitResult.Transaction!.effects;

		expect(returnEffects!.status).toEqual({
			error: null,
			success: true,
		});
	});
});
