// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Keypair } from '../../src/cryptography';
import { Transaction } from '../../src/transactions';
import { setup, TestToolbox } from './utils/setup';
import { ClientWithCoreApi, SuiClientTypes } from '../../src/client';

function getOwnerAddress(o: SuiClientTypes.ChangedObject): string | undefined {
	return (
		o.outputOwner?.AddressOwner ??
		o.outputOwner?.ObjectOwner ??
		o.outputOwner?.ConsensusAddressOwner?.owner
	);
}

describe('Transfer to Object', () => {
	let toolbox: TestToolbox;
	let packageId: string;
	let parentObjectId: SuiClientTypes.ChangedObject;
	let receiveObjectId: SuiClientTypes.ChangedObject;
	let sharedObjectId: string;

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('tto');
	});

	beforeEach(async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::tto::start`,
			typeArguments: [],
			arguments: [],
		});
		const x = await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
		const y = x.effects?.changedObjects
			.filter((o) => o.idOperation === 'Created')
			.map((o) => getOwnerAddress(o))!;
		receiveObjectId = x.effects?.changedObjects!.filter(
			(o) =>
				o.idOperation === 'Created' && !y.includes(o.objectId) && getOwnerAddress(o) !== undefined,
		)[0]!;
		parentObjectId = x.effects?.changedObjects!.filter(
			(o) =>
				o.idOperation === 'Created' && y.includes(o.objectId) && getOwnerAddress(o) !== undefined,
		)[0]!;
		const sharedObject = x.effects?.changedObjects!.filter(
			(o) => getOwnerAddress(o) === undefined,
		)[0]!;
		sharedObjectId = sharedObject.objectId;
	});

	it('Basic Receive: receive and then transfer', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::tto::receiver`,
			typeArguments: [],
			arguments: [tx.object(parentObjectId.objectId), tx.object(receiveObjectId.objectId)],
		});
		await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
	});

	it('Basic Receive: receive and then delete', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::tto::deleter`,
			typeArguments: [],
			arguments: [tx.object(parentObjectId.objectId), tx.object(receiveObjectId.objectId)],
		});
		await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
	});

	it('receive + return, then delete', async () => {
		const tx = new Transaction();
		const b = tx.moveCall({
			target: `${packageId}::tto::return_`,
			typeArguments: [],
			arguments: [tx.object(parentObjectId.objectId), tx.object(receiveObjectId.objectId)],
		});
		tx.moveCall({
			target: `${packageId}::tto::delete_`,
			typeArguments: [],
			arguments: [b],
		});
		await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
	});

	it('Basic Receive: &Receiving arg type', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::tto::invalid_call_immut_ref`,
			typeArguments: [],
			arguments: [tx.object(parentObjectId.objectId), tx.object(receiveObjectId.objectId)],
		});

		await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
	});

	it('Basic Receive: &mut Receiving arg type', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::tto::invalid_call_mut_ref`,
			typeArguments: [],
			arguments: [tx.object(parentObjectId.objectId), tx.object(receiveObjectId.objectId)],
		});
		await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
	});

	it.fails('Trying to pass shared object as receiving argument', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::tto::receiver`,
			typeArguments: [],
			arguments: [tx.object(parentObjectId.objectId), tx.object(sharedObjectId)],
		});
		await validateTransaction(toolbox.jsonRpcClient, toolbox.keypair, tx);
	});
});

async function validateTransaction(client: ClientWithCoreApi, signer: Keypair, tx: Transaction) {
	tx.setSenderIfNotSet(signer.getPublicKey().toSuiAddress());
	const localDigest = await tx.getDigest({ client });
	const result = await signer.signAndExecuteTransaction({
		client,
		transaction: tx,
	});
	expect(localDigest).toEqual(result.digest);
	expect(result.effects?.status.success).toEqual(true);

	await client.core.waitForTransaction({ digest: result.digest });
	return result;
}
