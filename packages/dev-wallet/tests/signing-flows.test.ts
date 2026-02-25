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

	const client = createDevnetClient();
	await fundAddress(keypair.getPublicKey().toSuiAddress());

	// Wait for the faucet funds to be available
	await waitForBalance(client, keypair.getPublicKey().toSuiAddress());

	const wallet = new DevWallet({
		adapters: [adapter],
		clients: { [NETWORK]: client },
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
	let cleanup: (() => void) | null = null;

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
		cleanup?.();
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

			// Request should be pending
			expect(wallet.pendingRequest).not.toBeNull();
			expect(wallet.pendingRequest!.type).toBe('sign-personal-message');

			// Approve it
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

			// Wait for the transaction to be serialized and enqueued
			await vi.waitFor(
				() => {
					expect(wallet.pendingRequest).not.toBeNull();
				},
				{ timeout: 30_000 },
			);

			expect(wallet.pendingRequest!.type).toBe('sign-transaction');
			expect(wallet.pendingRequest!.chain).toBe(`sui:${NETWORK}`);

			// Approve it
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

			// Approve it — this will sign AND submit to devnet
			await wallet.approveRequest();

			const result = await resultPromise;

			expect(result.bytes).toBeTruthy();
			expect(result.signature).toBeTruthy();
			expect(result.digest).toBeTruthy();
			expect(result.effects).toBeTruthy();

			// Verify the digest is a valid transaction digest on devnet
			const client = createDevnetClient();
			const txBlock = await client.waitForTransaction({
				digest: result.digest,
				timeout: 30_000,
			});
			expect(txBlock).toBeTruthy();
		});
	});

	describe('auto-approval policy', () => {
		it('auto-approves all requests when autoApprove is true', async () => {
			const autoWallet = new DevWallet({
				adapters: [adapter],
				clients: { [NETWORK]: createDevnetClient() },
				autoApprove: true,
			});

			const message = new TextEncoder().encode('Auto-approved message');
			const account = autoWallet.accounts[0];

			const result = await autoWallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account,
			});

			// Should resolve immediately without needing manual approval
			expect(result.bytes).toBe(toBase64(message));
			expect(result.signature).toBeTruthy();
			expect(autoWallet.pendingRequest).toBeNull();
		});

		it('auto-approves sign-and-execute on devnet when autoApprove is true', async () => {
			const autoWallet = new DevWallet({
				adapters: [adapter],
				clients: { [NETWORK]: createDevnetClient() },
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
				clients: { [NETWORK]: createDevnetClient() },
				autoApprove: (request) => request.type === 'sign-personal-message',
			});

			const account = autoWallet.accounts[0];

			// Personal message should auto-approve
			const msgResult = await autoWallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('Auto!'),
				account,
			});
			expect(msgResult.signature).toBeTruthy();
			expect(autoWallet.pendingRequest).toBeNull();

			// Transaction should NOT auto-approve (requires manual)
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

			// Clean up — reject the pending request
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

			// Should have been called once when the request was enqueued
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'sign-personal-message' }),
			);

			await wallet.approveRequest();
			await resultPromise;

			// Should have been called again when the request was resolved
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

			// Refresh wallet's view of accounts
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

			// Verify it was signed by keypair2
			const expected = await keypair2.signPersonalMessage(message);
			expect(result.signature).toBe(expected.signature);

			// Clean up: remove the second account
			await adapter.removeAccount(keypair2.getPublicKey().toSuiAddress());
		});
	});

	describe('UI integration', () => {
		it('mounts and unmounts the wallet panel', async () => {
			const container = document.createElement('div');
			document.body.appendChild(container);

			const unmount = await wallet.mountUI(container);

			const panel = container.querySelector('dev-wallet-panel');
			expect(panel).not.toBeNull();

			unmount();

			const panelAfter = container.querySelector('dev-wallet-panel');
			expect(panelAfter).toBeNull();

			container.remove();
		});

		it('shows signing modal (not sidebar) when request arrives', async () => {
			// Import the panel component
			await import('../src/ui/dev-wallet-panel.js');

			const container = document.createElement('div');
			document.body.appendChild(container);

			const panel = document.createElement('dev-wallet-panel') as any;
			panel.wallet = wallet;
			container.appendChild(panel);

			// Wait for Lit element to render
			await panel.updateComplete;

			// Sidebar should not be open initially
			const sidebarBefore = panel.shadowRoot?.querySelector('.sidebar');
			expect(sidebarBefore).toBeNull();

			// Trigger a signing request
			const message = new TextEncoder().encode('UI test');
			const account = wallet.accounts[0];
			const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message,
				account,
			});

			// Wait for the panel to react to the request change
			await new Promise((resolve) => setTimeout(resolve, 100));
			await panel.updateComplete;

			// Sidebar should stay hidden while signing modal is showing
			const sidebarAfter = panel.shadowRoot?.querySelector('.sidebar');
			expect(sidebarAfter).toBeNull();

			// The signing modal should be rendered
			const signingModal = panel.shadowRoot?.querySelector('dev-wallet-signing-modal');
			expect(signingModal).not.toBeNull();

			// Clean up: approve the request
			await wallet.approveRequest();
			await resultPromise;

			panel.remove();
			container.remove();
		});
	});
});
