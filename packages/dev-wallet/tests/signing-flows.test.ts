// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment happy-dom

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

import { DevWallet } from '../src/wallet/dev-wallet.js';
import type { DevWalletConfig } from '../src/wallet/dev-wallet.js';
import { InMemorySignerAdapter } from '../src/adapters/in-memory-adapter.js';

const NETWORK = 'devnet';

function createDevnetClient(): SuiJsonRpcClient {
	return new SuiJsonRpcClient({
		network: NETWORK,
		url: getJsonRpcFullnodeUrl(NETWORK),
	});
}

async function fundAddress(address: string): Promise<void> {
	await requestSuiFromFaucetV2({
		host: getFaucetHost(NETWORK),
		recipient: address,
	});
}

async function createFundedWallet(
	overrides?: Partial<DevWalletConfig>,
): Promise<{ wallet: DevWallet; keypair: Ed25519Keypair; adapter: InMemorySignerAdapter }> {
	const keypair = new Ed25519Keypair();
	const adapter = new InMemorySignerAdapter();
	await adapter.initialize();
	await adapter.importAccount({ signer: keypair, label: 'Test Account' });

	await fundAddress(keypair.getPublicKey().toSuiAddress());

	// Wait for the faucet funds to be available
	const client = createDevnetClient();
	await waitForBalance(client, keypair.getPublicKey().toSuiAddress());

	const wallet = new DevWallet({
		adapters: [adapter],
		networks: { [NETWORK]: getJsonRpcFullnodeUrl(NETWORK) },
		autoConnect: true,
		...overrides,
	});

	return { wallet, keypair, adapter };
}

async function waitForBalance(
	client: SuiJsonRpcClient,
	address: string,
	timeoutMs = 30_000,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const balance = await client.getBalance({ owner: address });
		if (BigInt(balance.totalBalance) > 0n) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 2_000));
	}
	throw new Error(`Timed out waiting for balance on ${address}`);
}

describe('DevWallet signing flows against devnet', { timeout: 120_000 }, () => {
	let devnetAvailable = true;
	let wallet: DevWallet;
	let keypair: Ed25519Keypair;
	let adapter: InMemorySignerAdapter;
	beforeAll(async () => {
		try {
			const result = await createFundedWallet();
			wallet = result.wallet;
			keypair = result.keypair;
			adapter = result.adapter;
		} catch {
			devnetAvailable = false;
		}
	});

	beforeEach(({ skip }) => {
		if (!devnetAvailable) skip();
	});

	afterAll(() => {
		adapter?.destroy();
	});

	describe('personal message signing', () => {
		it('signs a personal message after manual approval', async () => {
			const message = new TextEncoder().encode('Hello from devnet signing flow test!');
			const account = wallet.accounts[0];

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account,
			});

			expect(wallet.pendingRequest).not.toBeNull();
			expect(wallet.pendingRequest!.type).toBe('sign-personal-message');

			await wallet.approveRequest();

			const result = await resultPromise;

			expect(result.bytes).toBe(toBase64(message));
			expect(result.signature).toBeTruthy();
			expect(typeof result.signature).toBe('string');

			// Verify signature matches what the keypair would produce directly
			const expected = await keypair.signPersonalMessage(message);
			expect(result.signature).toBe(expected.signature);
		});

		it('rejects a personal message signing request', async () => {
			const message = new TextEncoder().encode('This should be rejected');
			const account = wallet.accounts[0];

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account,
			});

			expect(wallet.pendingRequest).not.toBeNull();

			wallet.rejectRequest('User declined');

			await expect(resultPromise).rejects.toThrow('User declined');
			expect(wallet.pendingRequest).toBeNull();
		});
	});

	describe('transaction signing', () => {
		it('signs a transaction after manual approval', async () => {
			const account = wallet.accounts[0];

			const tx = new Transaction();
			tx.setSender(account.address);
			const [coin] = tx.splitCoins(tx.gas, [1_000_000]);
			tx.transferObjects([coin], account.address);

			const resultPromise = wallet.features['sui:signTransaction'].signTransaction({
				transaction: tx,
				account,
				chain: `sui:${NETWORK}`,
			});

			await vi.waitFor(
				() => {
					expect(wallet.pendingRequest).not.toBeNull();
				},
				{ timeout: 30_000 },
			);

			expect(wallet.pendingRequest!.type).toBe('sign-transaction');
			expect(wallet.pendingRequest!.chain).toBe(`sui:${NETWORK}`);

			await wallet.approveRequest();

			const result = await resultPromise;

			expect(result.bytes).toBeTruthy();
			expect(result.signature).toBeTruthy();
		});

		it('rejects a transaction signing request', async () => {
			const account = wallet.accounts[0];

			const tx = new Transaction();
			tx.setSender(account.address);
			const [coin] = tx.splitCoins(tx.gas, [1_000]);
			tx.transferObjects([coin], account.address);

			const resultPromise = wallet.features['sui:signTransaction'].signTransaction({
				transaction: tx,
				account,
				chain: `sui:${NETWORK}`,
			});

			await vi.waitFor(
				() => {
					expect(wallet.pendingRequest).not.toBeNull();
				},
				{ timeout: 30_000 },
			);

			wallet.rejectRequest('Not today');

			await expect(resultPromise).rejects.toThrow('Not today');
			expect(wallet.pendingRequest).toBeNull();
		});
	});

	describe('sign-and-execute transaction', () => {
		it('signs and executes a transaction on devnet', async () => {
			const account = wallet.accounts[0];

			const tx = new Transaction();
			tx.setSender(account.address);
			const [coin] = tx.splitCoins(tx.gas, [1_000_000]);
			tx.transferObjects([coin], account.address);

			const resultPromise = wallet.features[
				'sui:signAndExecuteTransaction'
			].signAndExecuteTransaction({
				transaction: tx,
				account,
				chain: `sui:${NETWORK}`,
			});

			await vi.waitFor(
				() => {
					expect(wallet.pendingRequest).not.toBeNull();
				},
				{ timeout: 30_000 },
			);

			expect(wallet.pendingRequest!.type).toBe('sign-and-execute-transaction');

			await wallet.approveRequest();

			const result = await resultPromise;

			expect(result.bytes).toBeTruthy();
			expect(result.signature).toBeTruthy();
			expect(result.digest).toBeTruthy();
			expect(result.effects).toBeTruthy();

			const client = createDevnetClient();
			const txBlock = await client.waitForTransaction({
				digest: result.digest,
				timeout: 30_000,
			});
			expect(txBlock).toBeTruthy();
		});
	});

	describe('auto-approval policy', () => {
		it('auto-approves requests when autoApprove is true', async () => {
			const autoWallet = new DevWallet({
				adapters: [adapter],
				networks: { [NETWORK]: getJsonRpcFullnodeUrl(NETWORK) },
				autoApprove: true,
			});

			const account = autoWallet.accounts[0];

			const tx = new Transaction();
			tx.setSender(account.address);
			const [coin] = tx.splitCoins(tx.gas, [1_000]);
			tx.transferObjects([coin], account.address);

			const result = await autoWallet.features[
				'sui:signAndExecuteTransaction'
			].signAndExecuteTransaction({
				transaction: tx,
				account,
				chain: `sui:${NETWORK}`,
			});

			expect(result.digest).toBeTruthy();
			expect(result.effects).toBeTruthy();
			expect(autoWallet.pendingRequest).toBeNull();
		});

		it('selectively auto-approves with a policy function', async () => {
			const autoWallet = new DevWallet({
				adapters: [adapter],
				networks: { [NETWORK]: getJsonRpcFullnodeUrl(NETWORK) },
				autoApprove: (request) => request.type === 'sign-personal-message',
			});

			const account = autoWallet.accounts[0];

			const msgResult = await autoWallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('Auto!'),
				account,
			});
			expect(msgResult.signature).toBeTruthy();
			expect(autoWallet.pendingRequest).toBeNull();

			// sign-transaction is not in the policy, so it should queue for manual approval
			const tx = new Transaction();
			tx.setSender(account.address);
			const [coin] = tx.splitCoins(tx.gas, [1_000]);
			tx.transferObjects([coin], account.address);

			const txPromise = autoWallet.features['sui:signTransaction'].signTransaction({
				transaction: tx,
				account,
				chain: `sui:${NETWORK}`,
			});

			await vi.waitFor(
				() => {
					expect(autoWallet.pendingRequest).not.toBeNull();
				},
				{ timeout: 30_000 },
			);

			expect(autoWallet.pendingRequest!.type).toBe('sign-transaction');

			autoWallet.rejectRequest();
			await txPromise.catch(() => {});
		});
	});

	describe('request change subscription', () => {
		it('notifies listeners when requests are enqueued and resolved', async () => {
			const listener = vi.fn();
			const unsubscribe = wallet.onRequestChange(listener);

			const message = new TextEncoder().encode('Subscription test');
			const account = wallet.accounts[0];

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account,
			});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'sign-personal-message' }),
			);

			await wallet.approveRequest();
			await resultPromise;

			expect(listener).toHaveBeenCalledTimes(2);
			expect(listener).toHaveBeenLastCalledWith(null);

			unsubscribe();
		});
	});

	describe('multi-account signing', () => {
		it('signs with the correct account when multiple accounts exist', async () => {
			const keypair2 = new Ed25519Keypair();
			await adapter.importAccount({ signer: keypair2, label: 'Second Account' });
			await fundAddress(keypair2.getPublicKey().toSuiAddress());
			const client = createDevnetClient();
			await waitForBalance(client, keypair2.getPublicKey().toSuiAddress());

			await wallet.features['standard:connect'].connect();

			expect(wallet.accounts).toHaveLength(2);

			const secondAccount = wallet.accounts[1];
			const message = new TextEncoder().encode('Signed by second account');

			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account: secondAccount,
			});

			await wallet.approveRequest();
			const result = await resultPromise;

			const expected = await keypair2.signPersonalMessage(message);
			expect(result.signature).toBe(expected.signature);

			await adapter.removeAccount(keypair2.getPublicKey().toSuiAddress());
		});
	});

	describe('UI integration', () => {
		it('mounts and unmounts the wallet panel', async () => {
			const container = document.createElement('div');
			document.body.appendChild(container);

			const { mountDevWallet } = await import('../src/ui/mount.js');
			const unmount = mountDevWallet(wallet, { container });

			const panel = container.querySelector('dev-wallet-panel');
			expect(panel).not.toBeNull();

			unmount();

			const panelAfter = container.querySelector('dev-wallet-panel');
			expect(panelAfter).toBeNull();

			container.remove();
		});

		it('shows signing modal (not sidebar) when request arrives', async () => {
			await import('../src/ui/dev-wallet-panel.js');

			const container = document.createElement('div');
			document.body.appendChild(container);

			const panel = document.createElement('dev-wallet-panel') as any;
			panel.wallet = wallet;
			container.appendChild(panel);

			await panel.updateComplete;

			const sidebarBefore = panel.shadowRoot?.querySelector('.sidebar');
			expect(sidebarBefore).toBeNull();

			const message = new TextEncoder().encode('UI test');
			const account = wallet.accounts[0];
			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));
			await panel.updateComplete;

			const sidebarAfter = panel.shadowRoot?.querySelector('.sidebar');
			expect(sidebarAfter).toBeNull();

			const signingModal = panel.shadowRoot?.querySelector('dev-wallet-signing-modal');
			expect(signingModal).not.toBeNull();

			await wallet.approveRequest();
			await resultPromise;

			panel.remove();
			container.remove();
		});
	});
});
