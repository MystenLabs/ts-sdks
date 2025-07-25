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
		createPartyTxn.setSender(await toolbox.address());

		const party = createPartyTxn.moveCall({
			target: '0x2::party::single_owner',
			arguments: [createPartyTxn.pure.address(await toolbox.address())],
		});

		createPartyTxn.moveCall({
			target: '0x2::transfer::public_party_transfer',
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [coinWithBalance({ balance: 1 }), party],
		});

		const { digest } = await toolbox.client.signAndExecuteTransaction({
			transaction: await createPartyTxn.build({
				client: toolbox.client,
			}),
			signer: toolbox.keypair,
			options: {
				showEffects: true,
			},
		});

		const { effects } = await toolbox.client.waitForTransaction({
			digest,
			options: {
				showEffects: true,
			},
		});

		const partyCoin = effects!.created![0].reference.objectId;

		const returnTx = new Transaction();
		returnTx.setSender(await toolbox.address());

		returnTx.moveCall({
			target: '0x2::transfer::public_transfer',
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [returnTx.object(partyCoin), returnTx.pure.address(await toolbox.address())],
		});

		const { digest: returnDigest } = await toolbox.client.signAndExecuteTransaction({
			transaction: await returnTx.build({ client: toolbox.client }),
			signer: toolbox.keypair,
		});

		const { effects: returnEffects } = await toolbox.client.waitForTransaction({
			digest: returnDigest,
			options: {
				showEffects: true,
			},
		});

		expect(returnEffects!.status.status).toBe('success');
	});

	it('should correctly handle party objects only used in ptb commands', async () => {
		const createPartyTxn = new Transaction();
		createPartyTxn.setSender(await toolbox.address());

		const party = createPartyTxn.moveCall({
			target: '0x2::party::single_owner',
			arguments: [createPartyTxn.pure.address(await toolbox.address())],
		});

		createPartyTxn.moveCall({
			target: '0x2::transfer::public_party_transfer',
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [coinWithBalance({ balance: 1 }), party],
		});

		const { digest } = await toolbox.client.signAndExecuteTransaction({
			transaction: await createPartyTxn.build({
				client: toolbox.client,
			}),
			signer: toolbox.keypair,
			options: {
				showEffects: true,
			},
		});

		const { effects } = await toolbox.client.waitForTransaction({
			digest,
			options: {
				showEffects: true,
			},
		});

		const partyCoin = effects!.created![0].reference;

		const returnTx = new Transaction();
		returnTx.setSender(await toolbox.address());
		returnTx.transferObjects(
			[
				returnTx.sharedObjectRef({
					objectId: partyCoin.objectId,
					mutable: true,
					initialSharedVersion: partyCoin.version,
				}),
			],
			toolbox.keypair.getPublicKey().toSuiAddress(),
		);

		const { digest: returnDigest } = await toolbox.client.signAndExecuteTransaction({
			transaction: await returnTx.build({ client: toolbox.client }),
			signer: toolbox.keypair,
		});

		const { effects: returnEffects } = await toolbox.client.waitForTransaction({
			digest: returnDigest,
			options: {
				showEffects: true,
			},
		});

		expect(returnEffects!.status.status).toBe('success');
	});
});
