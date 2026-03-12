import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { DemoUsdTestHelpers } from './demoUsd.ts';
import {
	executeTransaction,
	setupToolbox,
	simulateFailingTransaction,
	type TestToolbox,
} from './setup.ts';

async function expectBalances(
	toolbox: TestToolbox,
	expected: { account: string; asset: string; amount: number }[],
) {
	const balances = await Promise.all(
		expected.map(({ account, asset }) => toolbox.getBalance(account, asset)),
	);
	for (const [idx, { amount }] of expected.entries()) {
		expect(Number(balances[idx].balance.balance)).toBe(amount * 1_000_000);
	}
}

describe.concurrent(
	'e2e tests with isolated PAS Package (each test runs in its own PAS package)',
	() => {
		it('unlocks non-managed funds (e.g. SUI), but only through the unrestricted unlock flow', async () => {
			const toolbox = await setupToolbox();
			const accountId = toolbox.client.pas.deriveAccountAddress(toolbox.address());

			const suiTypeName = normalizeStructTag('0x2::sui::SUI').toString();

			const { balance } = await toolbox.getBalance(accountId, suiTypeName);
			expect(Number(balance.balance)).toBe(0);

			// Transfer 1 SUI to the account.
			const fundTransferTx = new Transaction();
			const sui = fundTransferTx.splitCoins(fundTransferTx.gas, [
				fundTransferTx.pure.u64(1_000_000_000),
			]);

			const into_balance = fundTransferTx.moveCall({
				target: '0x2::coin::into_balance',
				arguments: [sui],
				typeArguments: [suiTypeName],
			});
			fundTransferTx.moveCall({
				target: '0x2::balance::send_funds',
				arguments: [into_balance, fundTransferTx.pure.address(accountId)],
				typeArguments: [suiTypeName],
			});
			await toolbox.executeTransaction(fundTransferTx);

			// Create the account for the address.
			await toolbox.createAccountForAddress(toolbox.address());

			const { balance: accountBalanceAfterTransfer } = await toolbox.getBalance(
				accountId,
				suiTypeName,
			);
			expect(Number(accountBalanceAfterTransfer.balance)).toBe(1_000_000_000);

			// try to do an unlock but it should fail because `policy` for Sui does not exist.
			const tx = new Transaction();
			tx.add(
				toolbox.client.pas.call.unlockBalance({
					from: toolbox.address(),
					amount: 1_000_000_000,
					assetType: suiTypeName,
				}),
			);
			// Should fail because SUI is not a managed asset
			await expect(toolbox.executeTransaction(tx)).rejects.toThrowError(
				'Policy does not exist for asset type ',
			);

			// Now let's unlock funds properly.
			const unlockTx = new Transaction();
			const withdrawal = unlockTx.add(
				toolbox.client.pas.call.unlockUnrestrictedBalance({
					from: toolbox.address(),
					amount: 1_000_000_000,
					assetType: suiTypeName,
				}),
			);
			unlockTx.moveCall({
				target: '0x2::balance::send_funds',
				arguments: [withdrawal, unlockTx.pure.address(toolbox.address())],
				typeArguments: [suiTypeName],
			});

			await toolbox.executeTransaction(unlockTx);

			const { balance: accountBalanceAfterUnlock } = await toolbox.getBalance(
				accountId,
				suiTypeName,
			);
			expect(Number(accountBalanceAfterUnlock.balance)).toBe(0);
		});

		it('Should be able to transfer between accounts, going through the policy of the issuer;', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const from = toolbox.address();
			const to = normalizeSuiAddress('0x2');

			const fromAccountId = toolbox.client.pas.deriveAccountAddress(from);
			const toAccountId = toolbox.client.pas.deriveAccountAddress(to);

			await toolbox.createAccountForAddress(from);
			await toolbox.createAccountForAddress(to);

			await demoUsd.mintFromFaucetInto(100, fromAccountId);

			const [{ balance: fromBalanceBefore }, { balance: toBalanceBefore }] = await Promise.all([
				toolbox.getBalance(fromAccountId, demoUsd.demoUsdAssetType),
				toolbox.getBalance(toAccountId, demoUsd.demoUsdAssetType),
			]);

			expect(Number(fromBalanceBefore.balance)).toBe(100 * 1_000_000);
			expect(Number(toBalanceBefore.balance)).toBe(0);

			const tx = new Transaction();
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from,
					to,
					amount: 100 * 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			await toolbox.executeTransaction(tx);

			const [{ balance: fromBalanceAfter }, { balance: toBalanceAfter }] = await Promise.all([
				toolbox.getBalance(fromAccountId, demoUsd.demoUsdAssetType),
				toolbox.getBalance(toAccountId, demoUsd.demoUsdAssetType),
			]);

			expect(Number(fromBalanceAfter.balance)).toBe(0);
			expect(Number(toBalanceAfter.balance)).toBe(100 * 1_000_000);
		});

		it('Should be able to create the recipient account if it does not exist ahead of time', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const from = toolbox.address();
			const to = normalizeSuiAddress('0x2');

			const fromAccountId = toolbox.client.pas.deriveAccountAddress(from);
			const toAccountId = toolbox.client.pas.deriveAccountAddress(to);

			await demoUsd.mintFromFaucetInto(100, fromAccountId);
			await toolbox.createAccountForAddress(from);

			await expect(
				toolbox.client.core.getObject({
					objectId: toAccountId,
				}),
			).rejects.toThrowError('not found');

			const transaction = new Transaction();
			transaction.add(
				toolbox.client.pas.call.sendBalance({
					from,
					to,
					amount: 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			await toolbox.executeTransaction(transaction);

			// Object should now exist after the first transfer.
			const responseAfter = await toolbox.client.core.getObject({
				objectId: toAccountId,
			});

			expect(responseAfter.object).toBeDefined();
		});

		it('Should deduplicate account creation when multiple intents reference the same non-existent accounts', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			// Sender is the test keypair (required for Auth), receiver is fresh.
			const sender = toolbox.address();
			const receiver = normalizeSuiAddress('0xB2');

			const senderAccountId = toolbox.client.pas.deriveAccountAddress(sender);
			const receiverAccountId = toolbox.client.pas.deriveAccountAddress(receiver);

			// Verify neither account exists.
			await expect(
				toolbox.client.core.getObject({ objectId: senderAccountId }),
			).rejects.toThrowError('not found');
			await expect(
				toolbox.client.core.getObject({ objectId: receiverAccountId }),
			).rejects.toThrowError('not found');

			// Mint funds directly into the sender account's address (balance::send_funds
			// works even before the account object exists).
			await demoUsd.mintFromFaucetInto(200, senderAccountId);

			// Build a single PTB that:
			//   1. Implicitly creates the sender account (via accountForAddress)
			//   2. Has an intermediate non-PAS moveCall (a no-op)
			//   3. Transfers 50 DEMO_USD from sender -> receiver (receiver account created implicitly)
			//   4. Has another intermediate non-PAS moveCall
			//   5. Transfers another 50 DEMO_USD from sender -> receiver (same accounts, no re-creation)
			const tx = new Transaction();

			// (1) accountForAddress for sender -- forces implicit creation
			tx.add(toolbox.client.pas.call.accountForAddress(sender));

			// (2) Intermediate command: a harmless moveCall (merge empty split back into gas)
			const split1 = tx.splitCoins(tx.gas, [tx.pure.u64(0)]);
			tx.mergeCoins(tx.gas, [split1]);

			// (3) First transfer: sender -> receiver (receiver account does not exist)
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from: sender,
					to: receiver,
					amount: 50 * 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			// (4) Another intermediate command
			const split2 = tx.splitCoins(tx.gas, [tx.pure.u64(0)]);
			tx.mergeCoins(tx.gas, [split2]);

			// (5) Second transfer: sender -> receiver (both accounts already created in this PTB)
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from: sender,
					to: receiver,
					amount: 50 * 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			await toolbox.executeTransaction(tx);

			// Verify both accounts now exist.
			const [senderObj, receiverObj] = await Promise.all([
				toolbox.client.core.getObject({ objectId: senderAccountId }),
				toolbox.client.core.getObject({ objectId: receiverAccountId }),
			]);
			expect(senderObj.object).toBeDefined();
			expect(receiverObj.object).toBeDefined();

			// Verify balances: sender started with 200, transferred 50+50 = 100.
			const [{ balance: senderBalance }, { balance: receiverBalance }] = await Promise.all([
				toolbox.getBalance(senderAccountId, demoUsd.demoUsdAssetType),
				toolbox.getBalance(receiverAccountId, demoUsd.demoUsdAssetType),
			]);

			expect(Number(senderBalance.balance)).toBe(100 * 1_000_000);
			expect(Number(receiverBalance.balance)).toBe(100 * 1_000_000);
		});

		it('v1 approval rejects transfers over 10K', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const from = toolbox.address();
			const to = normalizeSuiAddress('0x3');
			const fromAccountId = toolbox.client.pas.deriveAccountAddress(from);

			await toolbox.createAccountForAddress(from);
			await toolbox.createAccountForAddress(to);
			await demoUsd.mintFromFaucetInto(15_000, fromAccountId);

			const tx = new Transaction();
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from,
					to,
					amount: 15_000 * 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			const resp = await simulateFailingTransaction(toolbox, tx);
			expect(resp.FailedTransaction).toBeDefined();
			expect(resp.FailedTransaction!.effects.status.error!.message).toContain(
				'Any amount over 10K is not allowed in this demo.',
			);
		});

		it('self-transfer is rejected (same account cannot be borrowed mutably twice)', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const addr = toolbox.address();
			const accountId = toolbox.client.pas.deriveAccountAddress(addr);

			await toolbox.createAccountForAddress(addr);
			await demoUsd.mintFromFaucetInto(10, accountId);

			const tx = new Transaction();
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from: addr,
					to: addr,
					amount: 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			const resp = await simulateFailingTransaction(toolbox, tx);
			expect(resp.FailedTransaction).toBeDefined();
			// Same account passed as both &mut sender and &mut receiver -- Move rejects
			// this before the approval function even runs.
			expect(resp.FailedTransaction!.effects.status.error!.message).toContain(
				'InvalidReferenceArgument',
			);
		});

		it('Should fail to transfer between accounts, if there are not enough funds in the source account', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const from = toolbox.address();
			const to = normalizeSuiAddress('0x2');

			await toolbox.createAccountForAddress(from);
			await toolbox.createAccountForAddress(to);

			const transaction = new Transaction();
			transaction.add(
				toolbox.client.pas.call.sendBalance({
					from,
					to,
					amount: 100 * 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			await expect(executeTransaction(toolbox, transaction)).rejects.toThrowError(
				'InsufficientFundsForWithdraw',
			);
		});

		it('use_v2 upgrades approval logic and the resolver picks up the new template', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const from = toolbox.address();
			const to = normalizeSuiAddress('0x3');
			const fromAccountId = toolbox.client.pas.deriveAccountAddress(from);

			await toolbox.createAccountForAddress(from);
			await toolbox.createAccountForAddress(to);
			await demoUsd.mintFromFaucetInto(15_000, fromAccountId);

			await demoUsd.upgradeToV2();

			const tx = new Transaction();
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from,
					to,
					amount: 15_000 * 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);
			await toolbox.executeTransaction(tx);

			const { balance } = await toolbox.getBalance(
				toolbox.client.pas.deriveAccountAddress(to),
				demoUsd.demoUsdAssetType,
			);
			expect(Number(balance.balance)).toBe(15_000 * 1_000_000);
		});

		it('transfers two different asset types (v1 and v2 approval) in a single PTB', async () => {
			const toolbox = await setupToolbox();
			const asset1 = new DemoUsdTestHelpers(toolbox, 'demo_usd_1');
			const asset2 = new DemoUsdTestHelpers(toolbox, 'demo_usd_2');
			await asset1.createPolicy();
			await asset2.createPolicy();

			// Upgrade asset2 to v2 so the two assets use completely different approval code paths.
			await asset2.upgradeToV2();

			const sender = toolbox.address();
			const receiver = normalizeSuiAddress('0xB3');
			const senderAccountId = toolbox.client.pas.deriveAccountAddress(sender);
			const receiverAccountId = toolbox.client.pas.deriveAccountAddress(receiver);

			await asset1.mintFromFaucetInto(500, senderAccountId);
			await asset2.mintFromFaucetInto(800, senderAccountId);

			// --- First PTB: transfers both asset types, implicitly creates receiver account ---
			const tx1 = new Transaction();
			tx1.add(
				toolbox.client.pas.call.sendBalance({
					from: sender,
					to: receiver,
					amount: 120 * 1_000_000,
					assetType: asset1.demoUsdAssetType,
				}),
			);
			tx1.add(
				toolbox.client.pas.call.sendBalance({
					from: sender,
					to: receiver,
					amount: 350 * 1_000_000,
					assetType: asset2.demoUsdAssetType,
				}),
			);
			await toolbox.executeTransaction(tx1);

			const receiverObj = await toolbox.client.core.getObject({ objectId: receiverAccountId });
			expect(receiverObj.object).toBeDefined();
			await expectBalances(toolbox, [
				{ account: senderAccountId, asset: asset1.demoUsdAssetType, amount: 380 },
				{ account: senderAccountId, asset: asset2.demoUsdAssetType, amount: 450 },
				{ account: receiverAccountId, asset: asset1.demoUsdAssetType, amount: 120 },
				{ account: receiverAccountId, asset: asset2.demoUsdAssetType, amount: 350 },
			]);

			// --- Second PTB: both accounts already exist, different amounts ---
			const tx2 = new Transaction();
			tx2.add(
				toolbox.client.pas.call.sendBalance({
					from: sender,
					to: receiver,
					amount: 80 * 1_000_000,
					assetType: asset1.demoUsdAssetType,
				}),
			);
			tx2.add(
				toolbox.client.pas.call.sendBalance({
					from: sender,
					to: receiver,
					amount: 150 * 1_000_000,
					assetType: asset2.demoUsdAssetType,
				}),
			);
			await toolbox.executeTransaction(tx2);

			await expectBalances(toolbox, [
				{ account: senderAccountId, asset: asset1.demoUsdAssetType, amount: 300 },
				{ account: senderAccountId, asset: asset2.demoUsdAssetType, amount: 300 },
				{ account: receiverAccountId, asset: asset1.demoUsdAssetType, amount: 200 },
				{ account: receiverAccountId, asset: asset2.demoUsdAssetType, amount: 500 },
			]);
		});

		it('v2 approval rejects transfers to 0x2', async () => {
			const toolbox = await setupToolbox();
			const demoUsd = new DemoUsdTestHelpers(toolbox);
			await demoUsd.createPolicy();

			const from = toolbox.address();
			const to = normalizeSuiAddress('0x2');
			const fromAccountId = toolbox.client.pas.deriveAccountAddress(from);

			await toolbox.createAccountForAddress(from);
			await toolbox.createAccountForAddress(to);
			await demoUsd.mintFromFaucetInto(10, fromAccountId);

			await demoUsd.upgradeToV2();

			const tx = new Transaction();
			tx.add(
				toolbox.client.pas.call.sendBalance({
					from,
					to,
					amount: 1_000_000,
					assetType: demoUsd.demoUsdAssetType,
				}),
			);

			const resp = await simulateFailingTransaction(toolbox, tx);
			expect(resp.FailedTransaction).toBeDefined();
			expect(resp.FailedTransaction!.effects.status.error!.message).toContain(
				'Transfers to the address 0x2 are not allowed in this demo.',
			);
		});
	},
);
