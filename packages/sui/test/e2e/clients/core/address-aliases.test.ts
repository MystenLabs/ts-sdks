// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { verifyPersonalMessageSignature } from '../../../../src/verify/index.js';
import { createTestWithAllClients, setup, TestToolbox } from '../../utils/setup.js';

describe('Core API - Address aliases', () => {
	let toolbox: TestToolbox;
	let owner: { keypair: Ed25519Keypair; address: string };
	let alias: { keypair: Ed25519Keypair; address: string };
	// An account whose alias set no longer contains itself.
	let retired: { keypair: Ed25519Keypair; address: string };

	const testWithAllClients = createTestWithAllClients(() => toolbox);
	const personalMessage = 'signed by an alias';
	const message = new TextEncoder().encode(personalMessage);

	async function execute(tx: Transaction, signer = owner.keypair) {
		const result = await toolbox.grpcClient.core.signAndExecuteTransaction({
			transaction: tx,
			signer,
		});
		if (result.$kind !== 'Transaction') {
			throw new Error(`Transaction failed: ${result.FailedTransaction.status.error?.message}`);
		}
		await toolbox.waitForTransaction({ digest: result.Transaction.digest });
	}

	beforeAll(async () => {
		toolbox = await setup();
		[owner, alias, retired] = await Promise.all([
			toolbox.getSigner({ coins: [1_000_000_000n] }),
			toolbox.getSigner({}),
			toolbox.getSigner({ coins: [1_000_000_000n] }),
		]);

		// Enabling creates the alias set, so changing it is a separate transaction.
		async function setAliases(account: typeof owner, aliases: string[]) {
			const enable = new Transaction();
			enable.moveCall({ target: '0x2::address_alias::enable', arguments: [enable.object('0xa')] });
			await execute(enable, account.keypair);

			const { addressAliases } = await toolbox.grpcClient.core.getAddressAliases({
				address: account.address,
			});
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::address_alias::replace_all',
				arguments: [tx.object(addressAliases.objectId), tx.pure.vector('address', aliases)],
			});
			await execute(tx, account.keypair);
		}

		await Promise.all([
			setAliases(owner, [owner.address, alias.address]),
			setAliases(retired, [alias.address]),
		]);
	});

	it('getAddressAliases returns the same data from all clients', async () => {
		await toolbox.expectAllClientsReturnSameData((client) =>
			client.core.getAddressAliases({ address: owner.address }),
		);
		const { addressAliases } = await toolbox.grpcClient.core.getAddressAliases({
			address: owner.address,
		});
		expect(addressAliases.enabled).toBe(true);
		expect([...addressAliases.aliases].sort()).toEqual([owner.address, alias.address].sort());
	});

	testWithAllClients('verifies an alias signature for the owner', async (client) => {
		const { signature } = await alias.keypair.signPersonalMessage(message);

		const publicKey = await verifyPersonalMessageSignature(message, signature, {
			client,
			address: owner.address,
		});
		expect(publicKey.toSuiAddress()).toBe(alias.address);

		await expect(
			verifyPersonalMessageSignature(message, signature, {
				client,
				address: owner.address,
				checkAddressAliases: false,
			}),
		).rejects.toThrow('Signature is not valid for the provided message');
	});

	testWithAllClients('core.verifySignature accepts an alias signer', async (client) => {
		const { signature } = await alias.keypair.signPersonalMessage(message);

		expect(
			await client.core.verifySignature({ personalMessage, signature, address: owner.address }),
		).toEqual({ valid: true });
		expect(
			await client.core.verifySignature({
				personalMessage,
				signature,
				address: owner.address,
				checkAddressAliases: false,
			}),
		).toMatchObject({ valid: false });
		// Without an address, any valid signature passes.
		expect(await client.core.verifySignature({ personalMessage: message, signature })).toEqual({
			valid: true,
		});
	});

	testWithAllClients('core.verifySignature reports invalid signatures', async (client) => {
		const { signature } = await alias.keypair.signPersonalMessage(message);
		const wrongAddress = Ed25519Keypair.generate().toSuiAddress();

		const cases = [
			{ personalMessage: 'a different message', signature, address: alias.address },
			{ personalMessage: 'a different message', signature },
			{ personalMessage, signature, address: wrongAddress },
			{ personalMessage, signature: 'AAAA', address: owner.address },
			{ personalMessage, signature: 'AAAA' },
			{ personalMessage, signature: 'not base64!' },
		];
		for (const options of cases) {
			expect(await client.core.verifySignature(options)).toMatchObject({ valid: false });
		}
	});

	testWithAllClients('an account removed from its own alias set cannot sign', async (client) => {
		const { signature } = await retired.keypair.signPersonalMessage(message);

		expect(
			await client.core.verifySignature({ personalMessage, signature, address: retired.address }),
		).toMatchObject({ valid: false });
		expect(
			await client.core.verifySignature({
				personalMessage,
				signature,
				address: retired.address,
				checkAddressAliases: false,
			}),
		).toEqual({ valid: true });
	});
});
