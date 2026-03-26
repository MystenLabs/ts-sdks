import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { Account } from '../../src/contracts/pas/account.js';
import { DemoUsdTestHelpers } from './demoUsd.js';
import { setupToolbox, TestToolbox } from './setup.js';

describe('e2e tests with shared PAS package (all tests run in the same PAS package)', () => {
	let toolbox: TestToolbox;
	let demoUsd: DemoUsdTestHelpers;

	// Each execution should use its own runner to avoid shared state of PAS package.
	beforeAll(async () => {
		toolbox = await setupToolbox();
		demoUsd = new DemoUsdTestHelpers(toolbox);
		await demoUsd.createPolicy();
	});

	it('Should not be able to unlock restricted funds (e.g. DEMO_USD).', async () => {
		const keypair = Ed25519Keypair.generate();
		const address = keypair.getPublicKey().toSuiAddress();

		await toolbox.createAccountForAddress(address);
		const accountId = toolbox.client.pas.deriveAccountAddress(address);
		await demoUsd.mintFromFaucetInto(100, accountId);

		const tx = new Transaction();
		tx.add(
			toolbox.client.pas.call.unlockBalance({
				from: address,
				amount: 100 * 1_000_000,
				assetType: demoUsd.demoUsdAssetType,
			}),
		);

		await expect(
			toolbox.client.core.signAndExecuteTransaction({
				signer: keypair,
				transaction: tx,
				include: {
					effects: true,
				},
			}),
		).rejects.toThrowError('No required approvals found for action');
	});

	it('derivations work as expected for accounts', async () => {
		const accountObjectId = toolbox.client.pas.deriveAccountAddress(toolbox.address());
		await toolbox.createAccountForAddress(toolbox.address());

		const { object: accountObject } = await toolbox.client.core.getObject({
			objectId: accountObjectId,
			include: { content: true },
		});

		expect(accountObject).toBeDefined();

		const parsed = Account.parse(accountObject.content!);
		expect(normalizeSuiAddress(parsed.owner)).toBe(normalizeSuiAddress(toolbox.address()));
		expect(accountObject.type).toBe(
			`${toolbox.client.pas.getPackageConfig().packageId}::account::Account`,
		);
	});

	it('derivations work as expected for policies', async () => {
		const policyObjectId = toolbox.client.pas.derivePolicyAddress(demoUsd.demoUsdAssetType);

		const { object: policyObject } = await toolbox.client.core.getObject({
			objectId: policyObjectId,
			include: { content: true },
		});

		expect(policyObject).toBeDefined();
		expect(policyObject.type).toBe(
			`${toolbox.client.pas.getPackageConfig().packageId}::policy::Policy<0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${demoUsd.pub.originalId}::demo_usd::DEMO_USD>>`,
		);
	});
});
