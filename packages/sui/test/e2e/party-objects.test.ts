// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox } from './utils/setup';
import { coinWithBalance, Transaction } from '../../src/transactions';

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

		const { digest } = await toolbox.keypair.signAndExecuteTransaction({
			transaction: createPartyTxn,
			client: toolbox.jsonRpcClient,
		});

		const {
			transaction: { effects },
		} = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest,
			include: {
				effects: true,
			},
		});

		const partyCoin = effects!.changedObjects.filter((o) => o.idOperation === 'Created')[0]
			.objectId;

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

		const { digest: returnDigest } = await toolbox.keypair.signAndExecuteTransaction({
			transaction: returnTx,
			client: toolbox.jsonRpcClient,
		});

		const {
			transaction: { effects: returnEffects },
		} = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest: returnDigest,
			include: {
				effects: true,
			},
		});

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

		const { digest } = await toolbox.keypair.signAndExecuteTransaction({
			transaction: createPartyTxn,
			client: toolbox.jsonRpcClient,
		});

		const {
			transaction: { effects },
		} = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest,
			include: {
				effects: true,
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 3000));

		const partyCoin = effects!.changedObjects.filter((o) => o.idOperation === 'Created')[0];

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

		const { digest: returnDigest } = await toolbox.keypair.signAndExecuteTransaction({
			transaction: returnTx,
			client: toolbox.jsonRpcClient,
		});

		const {
			transaction: { effects: returnEffects },
		} = await toolbox.jsonRpcClient.core.waitForTransaction({
			digest: returnDigest,
			include: {
				effects: true,
			},
		});

		expect(returnEffects!.status).toEqual({
			error: null,
			success: true,
		});
	});
});
