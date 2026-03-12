// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import { toBase64 } from '@mysten/sui/utils';

import { DevWallet } from '../src/wallet/dev-wallet.js';
import { InMemorySignerAdapter } from '../src/adapters/in-memory-adapter.js';
import type { DevWalletPanel } from '../src/ui/dev-wallet-panel.js';
import type { DevWalletSigning } from '../src/ui/dev-wallet-signing.js';
import type { DevWalletSigningModal } from '../src/ui/dev-wallet-signing-modal.js';
import type { DevWalletAccounts } from '../src/ui/dev-wallet-accounts.js';
import type { DevWalletBalances } from '../src/ui/dev-wallet-balances.js';
import type { DevWalletNewAccount } from '../src/ui/dev-wallet-new-account.js';

const NETWORK = 'devnet';

// --- Helpers ---

function createMockWalletAccount(keypair: Ed25519Keypair): ReadonlyWalletAccount {
	return new ReadonlyWalletAccount({
		address: keypair.getPublicKey().toSuiAddress(),
		publicKey: keypair.getPublicKey().toSuiBytes(),
		chains: [...SUI_CHAINS],
		features: ['sui:signTransaction', 'sui:signAndExecuteTransaction', 'sui:signPersonalMessage'],
	});
}

async function waitForUpdate(el: { updateComplete: Promise<boolean> }): Promise<void> {
	await el.updateComplete;
	// Allow microtasks + Lit reactive cycle to settle
	await new Promise((resolve) => setTimeout(resolve, 50));
	await el.updateComplete;
}

// --- Import all components before tests ---

beforeAll(async () => {
	await import('../src/ui/dev-wallet-panel.js');
	await import('../src/ui/dev-wallet-signing-modal.js');
	await import('../src/ui/dev-wallet-signing.js');
	await import('../src/ui/dev-wallet-accounts.js');
	await import('../src/ui/dev-wallet-account-selector.js');
	await import('../src/ui/dev-wallet-balances.js');
	await import('../src/ui/dev-wallet-network-badge.js');
	await import('../src/ui/dev-wallet-new-account.js');
	await import('../src/ui/dev-wallet-tab-bar.js');
});

// --- Signing Component ---

describe('dev-wallet-signing component', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it('shows "No pending requests" when request is null', async () => {
		const el = document.createElement('dev-wallet-signing') as DevWalletSigning;
		container.appendChild(el);
		await waitForUpdate(el);

		const noRequest = el.shadowRoot!.querySelector('[part="empty-state"]');
		expect(noRequest).not.toBeNull();
		expect(noRequest!.textContent).toContain('No pending requests');
	});

	it('renders request details when a request is provided', async () => {
		const keypair = new Ed25519Keypair();
		const account = createMockWalletAccount(keypair);

		const el = document.createElement('dev-wallet-signing') as DevWalletSigning;
		el.request = {
			id: 'test-1',
			type: 'sign-personal-message',
			account,
			chain: 'sui:devnet',
			data: new TextEncoder().encode('Hello test'),
		};
		container.appendChild(el);
		await waitForUpdate(el);

		// Should show "Approval Required" title
		const title = el.shadowRoot!.querySelector('.signing-title');
		expect(title?.textContent).toContain('Approval Required');

		// Should show the request type label
		const typeLabel = el.shadowRoot!.querySelector('[part="request-type"]');
		expect(typeLabel?.textContent).toContain('Sign Message');

		// Personal messages are chain-agnostic — chain row should be hidden
		const details = el.shadowRoot!.querySelectorAll('.request-detail');
		expect(details.length).toBe(1); // Only account, no chain

		// Should show the message data preview
		const dataPreview = el.shadowRoot!.querySelector('.request-data');
		expect(dataPreview?.textContent).toContain('Hello test');
	});

	it.each([
		['sign-transaction', 'Sign Transaction'],
		['sign-and-execute-transaction', 'Sign & Execute Transaction'],
	] as const)('renders request type label for %s', async (type, expectedLabel) => {
		const keypair = new Ed25519Keypair();
		const account = createMockWalletAccount(keypair);

		const el = document.createElement('dev-wallet-signing') as DevWalletSigning;
		el.request = {
			id: 'test-type',
			type,
			account,
			chain: 'sui:devnet',
			data: '{"kind":"TransactionData"}',
		};
		container.appendChild(el);
		await waitForUpdate(el);

		const typeLabel = el.shadowRoot!.querySelector('[part="request-type"]');
		expect(typeLabel?.textContent).toContain(expectedLabel);
	});

	it('dispatches "approve" event when Approve button is clicked', async () => {
		const keypair = new Ed25519Keypair();
		const account = createMockWalletAccount(keypair);

		const el = document.createElement('dev-wallet-signing') as DevWalletSigning;
		el.request = {
			id: 'test-4',
			type: 'sign-personal-message',
			account,
			chain: 'sui:unknown',
			data: new TextEncoder().encode('test'),
		};
		container.appendChild(el);
		await waitForUpdate(el);

		const listener = vi.fn();
		el.addEventListener('approve', listener);

		const approveBtn = el.shadowRoot!.querySelector('[part="approve-button"]') as HTMLButtonElement;
		expect(approveBtn).not.toBeNull();
		approveBtn.click();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('dispatches "reject" event when Reject button is clicked', async () => {
		const keypair = new Ed25519Keypair();
		const account = createMockWalletAccount(keypair);

		const el = document.createElement('dev-wallet-signing') as DevWalletSigning;
		el.request = {
			id: 'test-5',
			type: 'sign-personal-message',
			account,
			chain: 'sui:unknown',
			data: new TextEncoder().encode('test'),
		};
		container.appendChild(el);
		await waitForUpdate(el);

		const listener = vi.fn();
		el.addEventListener('reject', listener);

		const rejectBtn = el.shadowRoot!.querySelector('[part="reject-button"]') as HTMLButtonElement;
		expect(rejectBtn).not.toBeNull();
		rejectBtn.click();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('truncates the account address in display', async () => {
		const keypair = new Ed25519Keypair();
		const account = createMockWalletAccount(keypair);

		const el = document.createElement('dev-wallet-signing') as DevWalletSigning;
		el.request = {
			id: 'test-6',
			type: 'sign-personal-message',
			account,
			chain: 'sui:unknown',
			data: new TextEncoder().encode('x'),
		};
		container.appendChild(el);
		await waitForUpdate(el);

		const details = el.shadowRoot!.querySelectorAll('.request-detail');
		const accountValue = details[0]?.querySelector('.detail-value')?.textContent;
		// Address should be truncated with "..."
		expect(accountValue).toContain('...');
		expect(accountValue!.length).toBeLessThan(account.address.length);
	});
});

// --- Accounts Component ---

describe('dev-wallet-accounts component', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it('shows empty state when no accounts', async () => {
		const el = document.createElement('dev-wallet-accounts') as DevWalletAccounts;
		el.accounts = [];
		container.appendChild(el);
		await waitForUpdate(el);

		const empty = el.shadowRoot!.querySelector('[part="empty-state"]');
		expect(empty).not.toBeNull();
		expect(empty!.textContent).toContain('No accounts yet');
	});

	it('renders account list items', async () => {
		const kp1 = new Ed25519Keypair();
		const kp2 = new Ed25519Keypair();

		const el = document.createElement('dev-wallet-accounts') as DevWalletAccounts;
		el.accounts = [createMockWalletAccount(kp1), createMockWalletAccount(kp2)];
		el.activeAddress = kp1.getPublicKey().toSuiAddress();
		container.appendChild(el);
		await waitForUpdate(el);

		const items = el.shadowRoot!.querySelectorAll('.account-item');
		expect(items).toHaveLength(2);

		// First account should be active
		expect(items[0].classList.contains('active')).toBe(true);
		expect(items[1].classList.contains('active')).toBe(false);
	});

	it('dispatches "account-selected" event when account is clicked', async () => {
		const kp1 = new Ed25519Keypair();
		const kp2 = new Ed25519Keypair();

		const el = document.createElement('dev-wallet-accounts') as DevWalletAccounts;
		const accounts = [createMockWalletAccount(kp1), createMockWalletAccount(kp2)];
		el.accounts = accounts;
		el.activeAddress = kp1.getPublicKey().toSuiAddress();
		container.appendChild(el);
		await waitForUpdate(el);

		const listener = vi.fn();
		el.addEventListener('account-selected', listener);

		const items = el.shadowRoot!.querySelectorAll('.account-item') as NodeListOf<HTMLButtonElement>;
		items[1].click();

		expect(listener).toHaveBeenCalledTimes(1);
		const event = listener.mock.calls[0][0] as CustomEvent;
		expect(event.detail.account.address).toBe(kp2.getPublicKey().toSuiAddress());
	});

	it('shows "+ Add" button when adapter has createAccount', async () => {
		const adapter = new InMemorySignerAdapter();

		const el = document.createElement('dev-wallet-accounts') as DevWalletAccounts;
		el.accounts = [];
		el.adapters = [adapter];
		container.appendChild(el);
		await waitForUpdate(el);

		const addBtn = el.shadowRoot!.querySelector('[part="add-button"]');
		expect(addBtn).not.toBeNull();
		expect(addBtn!.textContent).toContain('+ Add');
	});

	it('hides "+ Add" button when adapter is null', async () => {
		const el = document.createElement('dev-wallet-accounts') as DevWalletAccounts;
		el.accounts = [];
		el.adapters = [];
		container.appendChild(el);
		await waitForUpdate(el);

		const addBtn = el.shadowRoot!.querySelector('[part="add-button"]');
		expect(addBtn).toBeNull();
	});

	it('renders account avatars with sequential numbers', async () => {
		const kp1 = new Ed25519Keypair();
		const kp2 = new Ed25519Keypair();
		const kp3 = new Ed25519Keypair();

		const el = document.createElement('dev-wallet-accounts') as DevWalletAccounts;
		el.accounts = [
			createMockWalletAccount(kp1),
			createMockWalletAccount(kp2),
			createMockWalletAccount(kp3),
		];
		container.appendChild(el);
		await waitForUpdate(el);

		const avatars = el.shadowRoot!.querySelectorAll('.account-avatar');
		expect(avatars).toHaveLength(3);
		expect(avatars[0].textContent?.trim()).toBe('1');
		expect(avatars[1].textContent?.trim()).toBe('2');
		expect(avatars[2].textContent?.trim()).toBe('3');
	});
});

// --- New Account Dialog ---

describe('dev-wallet-new-account component', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it('renders nothing when open is false', async () => {
		const el = document.createElement('dev-wallet-new-account') as DevWalletNewAccount;
		el.open = false;
		container.appendChild(el);
		await waitForUpdate(el);

		const overlay = el.shadowRoot!.querySelector('.overlay');
		expect(overlay).toBeNull();
	});

	it('renders dialog when open is true', async () => {
		const el = document.createElement('dev-wallet-new-account') as DevWalletNewAccount;
		el.open = true;
		el.adapters = [new InMemorySignerAdapter()];
		container.appendChild(el);
		await waitForUpdate(el);

		const dialog = el.shadowRoot!.querySelector('dialog');
		expect(dialog).not.toBeNull();

		const title = el.shadowRoot!.querySelector('.dialog-title');
		expect(title?.textContent).toContain('Add Account');

		const input = el.shadowRoot!.querySelector('[part="label-input"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.placeholder).toBe('e.g. Test Account');
	});

	it('dispatches "close" event when Cancel button is clicked', async () => {
		const el = document.createElement('dev-wallet-new-account') as DevWalletNewAccount;
		el.open = true;
		el.adapters = [new InMemorySignerAdapter()];
		container.appendChild(el);
		await waitForUpdate(el);

		const listener = vi.fn();
		el.addEventListener('close', listener);

		const cancelBtn = el.shadowRoot!.querySelector('[part="cancel-button"]') as HTMLButtonElement;
		cancelBtn.click();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('creates an account and dispatches "account-created" event', async () => {
		const adapter = new InMemorySignerAdapter();
		const el = document.createElement('dev-wallet-new-account') as DevWalletNewAccount;
		el.open = true;
		el.adapters = [adapter];
		container.appendChild(el);
		await waitForUpdate(el);

		const createdListener = vi.fn();
		const closeListener = vi.fn();
		el.addEventListener('account-created', createdListener);
		el.addEventListener('close', closeListener);

		// Click the Create button
		const createBtn = el.shadowRoot!.querySelector('[part="create-button"]') as HTMLButtonElement;
		createBtn.click();

		// Wait for async account creation
		await waitForUpdate(el);
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(createdListener).toHaveBeenCalledTimes(1);
		expect(closeListener).toHaveBeenCalledTimes(1);
		expect(adapter.getAccounts()).toHaveLength(1);
	});

	it('dispatches "close" when dialog cancel event fires', async () => {
		const el = document.createElement('dev-wallet-new-account') as DevWalletNewAccount;
		el.open = true;
		el.adapters = [new InMemorySignerAdapter()];
		container.appendChild(el);
		await waitForUpdate(el);

		const listener = vi.fn();
		el.addEventListener('close', listener);

		// Simulate the native dialog cancel event (triggered by Escape or backdrop click)
		const dialog = el.shadowRoot!.querySelector('dialog') as HTMLDialogElement;
		dialog.dispatchEvent(new Event('cancel'));

		expect(listener).toHaveBeenCalledTimes(1);
	});
});

// --- Balances Component ---

describe('dev-wallet-balances component', () => {
	let container: HTMLElement;
	const testAddress = '0x' + 'ab'.repeat(32);

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it('renders nothing when address or client is missing', async () => {
		const el = document.createElement('dev-wallet-balances') as DevWalletBalances;
		container.appendChild(el);
		await waitForUpdate(el);

		const header = el.shadowRoot!.querySelector('.section-header');
		expect(header).toBeNull();
	});

	it('shows loading state while fetching', async () => {
		const el = document.createElement('dev-wallet-balances') as DevWalletBalances;
		el.address = testAddress;
		el.client = {
			core: {
				listBalances: () =>
					new Promise((resolve) =>
						setTimeout(() => resolve({ balances: [], hasNextPage: false, cursor: null }), 5000),
					),
			},
		} as any;
		container.appendChild(el);
		await waitForUpdate(el);

		const loading = el.shadowRoot!.querySelector('[part="loading"]');
		expect(loading).not.toBeNull();
		expect(loading!.textContent).toContain('Loading...');
	});

	it('fetches and displays SUI balance', async () => {
		const el = document.createElement('dev-wallet-balances') as DevWalletBalances;
		el.address = testAddress;
		el.client = {
			core: {
				listBalances: () =>
					Promise.resolve({
						balances: [{ coinType: '0x2::sui::SUI', balance: '1500000000' }],
						hasNextPage: false,
						cursor: null,
					}),
				getCoinMetadata: () =>
					Promise.resolve({
						coinMetadata: {
							decimals: 9,
							symbol: 'SUI',
							name: 'Sui',
							description: '',
							id: null,
							iconUrl: null,
						},
					}),
			},
		} as any;
		container.appendChild(el);

		await vi.waitFor(
			async () => {
				await el.updateComplete;
				const items = el.shadowRoot!.querySelectorAll('.balance-item');
				expect(items.length).toBeGreaterThan(0);
			},
			{ timeout: 5_000 },
		);

		const symbol = el.shadowRoot!.querySelector('.balance-symbol');
		expect(symbol?.textContent).toBe('SUI');

		const amount = el.shadowRoot!.querySelector('.balance-amount');
		expect(amount?.textContent).toBeTruthy();
		const balanceText = amount!.textContent!.trim();
		expect(parseFloat(balanceText)).toBe(1.5);
	});

	it('shows error state when fetch fails', async () => {
		const el = document.createElement('dev-wallet-balances') as DevWalletBalances;
		el.address = testAddress;
		el.client = {
			core: {
				listBalances: () => Promise.reject(new Error('Network error')),
			},
		} as any;
		container.appendChild(el);

		await vi.waitFor(
			async () => {
				await el.updateComplete;
				const error = el.shadowRoot!.querySelector('[part="error-message"]');
				expect(error).not.toBeNull();
			},
			{ timeout: 5_000 },
		);

		const error = el.shadowRoot!.querySelector('[part="error-message"]');
		expect(error!.textContent).toContain('Failed to load balances');
	});

	it('shows empty state when account has no balances', async () => {
		const el = document.createElement('dev-wallet-balances') as DevWalletBalances;
		el.address = testAddress;
		el.client = {
			core: {
				listBalances: () => Promise.resolve({ balances: [], hasNextPage: false, cursor: null }),
			},
		} as any;
		container.appendChild(el);

		await vi.waitFor(
			async () => {
				await el.updateComplete;
				const empty = el.shadowRoot!.querySelector('[part="empty-state"]');
				expect(empty).not.toBeNull();
				expect(empty!.textContent).toContain('No balances');
			},
			{ timeout: 5_000 },
		);
	});
});

// --- Panel Component ---

describe('dev-wallet-panel component', { timeout: 60_000 }, () => {
	let container: HTMLElement;
	let wallet: DevWallet;
	let adapter: InMemorySignerAdapter;
	let keypair: Ed25519Keypair;

	beforeAll(async () => {
		keypair = new Ed25519Keypair();
		adapter = new InMemorySignerAdapter();
		await adapter.initialize();
		await adapter.importAccount({ signer: keypair, label: 'Test Account' });

		wallet = new DevWallet({
			adapters: [adapter],
			networks: { [NETWORK]: getJsonRpcFullnodeUrl(NETWORK) },
		});
	});

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it('renders a trigger button', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		const trigger = el.shadowRoot!.querySelector('[part="trigger"]');
		expect(trigger).not.toBeNull();

		// Should have the wallet SVG icon
		const svg = trigger!.querySelector('svg');
		expect(svg).not.toBeNull();
	});

	it('opens sidebar when trigger is clicked', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// Sidebar should not be visible initially
		expect(el.shadowRoot!.querySelector('[part="sidebar"]')).toBeNull();

		// Click the trigger
		const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLButtonElement;
		trigger.click();
		await waitForUpdate(el);

		// Sidebar should now be visible
		const sidebar = el.shadowRoot!.querySelector('[part="sidebar"]');
		expect(sidebar).not.toBeNull();
	});

	it('closes sidebar when close button is clicked', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// Open the sidebar
		const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLButtonElement;
		trigger.click();
		await waitForUpdate(el);

		expect(el.shadowRoot!.querySelector('[part="sidebar"]')).not.toBeNull();

		// Click the close button
		const closeBtn = el.shadowRoot!.querySelector('[part="close-button"]') as HTMLButtonElement;
		closeBtn.click();
		await waitForUpdate(el);

		expect(el.shadowRoot!.querySelector('[part="sidebar"]')).toBeNull();
	});

	it('displays wallet name in sidebar header', async () => {
		const namedWallet = new DevWallet({
			adapters: [adapter],
			networks: { [NETWORK]: getJsonRpcFullnodeUrl(NETWORK) },
			name: 'My Test Wallet',
		});

		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = namedWallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// Open the sidebar
		const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLButtonElement;
		trigger.click();
		await waitForUpdate(el);

		const title = el.shadowRoot!.querySelector('.sidebar-title');
		expect(title?.textContent).toContain('My Test Wallet');
	});

	it('shows account selector inside sidebar', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// Open the sidebar
		const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLButtonElement;
		trigger.click();
		await waitForUpdate(el);

		const accountSelector = el.shadowRoot!.querySelector('dev-wallet-account-selector');
		expect(accountSelector).not.toBeNull();
	});

	it('shows signing modal when a signing request is pending', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// No modal initially
		expect(el.shadowRoot!.querySelector('dev-wallet-signing-modal')).toBeNull();

		// Create a signing request
		const message = new TextEncoder().encode('modal test');
		const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
			message,
			account: wallet.accounts[0],
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		await waitForUpdate(el);

		// Signing modal should appear
		const modal = el.shadowRoot!.querySelector('dev-wallet-signing-modal');
		expect(modal).not.toBeNull();

		// Clean up
		await wallet.approveRequest();
		await resultPromise;
	});

	it('toggles sidebar open and closed with repeated trigger clicks', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLButtonElement;

		// Click 1: open
		trigger.click();
		await waitForUpdate(el);
		expect(el.shadowRoot!.querySelector('[part="sidebar"]')).not.toBeNull();

		// Click 2: close
		trigger.click();
		await waitForUpdate(el);
		expect(el.shadowRoot!.querySelector('[part="sidebar"]')).toBeNull();

		// Click 3: open again
		trigger.click();
		await waitForUpdate(el);
		expect(el.shadowRoot!.querySelector('[part="sidebar"]')).not.toBeNull();
	});
});

// --- Full UI Signing Flow ---

describe('full UI signing flow', { timeout: 120_000 }, () => {
	let container: HTMLElement;
	let wallet: DevWallet;
	let adapter: InMemorySignerAdapter;
	let keypair: Ed25519Keypair;

	beforeAll(async () => {
		keypair = new Ed25519Keypair();
		adapter = new InMemorySignerAdapter();
		await adapter.initialize();
		await adapter.importAccount({ signer: keypair, label: 'Flow Test Account' });

		wallet = new DevWallet({
			adapters: [adapter],
			networks: { [NETWORK]: getJsonRpcFullnodeUrl(NETWORK) },
		});
	});

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it('signs a personal message via UI approve button click', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// 1. dApp sends a signing request
		const message = new TextEncoder().encode('Approve via UI button');
		const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
			message,
			account: wallet.accounts[0],
		});

		// 2. Wait for the panel to auto-open and render signing modal
		await new Promise((resolve) => setTimeout(resolve, 100));
		await waitForUpdate(el);

		const modal = el.shadowRoot!.querySelector('dev-wallet-signing-modal') as DevWalletSigningModal;
		expect(modal).not.toBeNull();
		await waitForUpdate(modal);

		const signing = modal.shadowRoot!.querySelector('dev-wallet-signing') as DevWalletSigning;
		expect(signing).not.toBeNull();
		await waitForUpdate(signing);

		// 3. Verify request details are displayed
		const typeLabel = signing.shadowRoot!.querySelector('[part="request-type"]');
		expect(typeLabel?.textContent).toContain('Sign Message');

		const dataPreview = signing.shadowRoot!.querySelector('.request-data');
		expect(dataPreview?.textContent).toContain('Approve via UI button');

		// 4. Click the Approve button in the signing component
		const approveBtn = signing.shadowRoot!.querySelector(
			'[part="approve-button"]',
		) as HTMLButtonElement;
		expect(approveBtn).not.toBeNull();
		approveBtn.click();

		// 5. The request should resolve with a valid signature
		const result = await resultPromise;
		expect(result.bytes).toBe(toBase64(message));
		expect(result.signature).toBeTruthy();

		// 6. Verify the signature is correct
		const expected = await keypair.signPersonalMessage(message);
		expect(result.signature).toBe(expected.signature);

		// 7. Pending request should be cleared
		expect(wallet.pendingRequest).toBeNull();
	});

	it('rejects a personal message via UI reject button click', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// 1. dApp sends a signing request
		const message = new TextEncoder().encode('Reject via UI button');
		const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
			message,
			account: wallet.accounts[0],
		});

		// 2. Wait for the modal to appear
		await new Promise((resolve) => setTimeout(resolve, 100));
		await waitForUpdate(el);

		const modal = el.shadowRoot!.querySelector('dev-wallet-signing-modal') as DevWalletSigningModal;
		expect(modal).not.toBeNull();
		await waitForUpdate(modal);

		const signing = modal.shadowRoot!.querySelector('dev-wallet-signing') as DevWalletSigning;
		expect(signing).not.toBeNull();
		await waitForUpdate(signing);

		// 3. Click the Reject button
		const rejectBtn = signing.shadowRoot!.querySelector(
			'[part="reject-button"]',
		) as HTMLButtonElement;
		expect(rejectBtn).not.toBeNull();
		rejectBtn.click();

		// 4. The request should be rejected
		await expect(resultPromise).rejects.toThrow('Request rejected by user.');
		expect(wallet.pendingRequest).toBeNull();
	});

	it('signing modal disappears after approval', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// Send signing request
		const message = new TextEncoder().encode('disappear test');
		const resultPromise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
			message,
			account: wallet.accounts[0],
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		await waitForUpdate(el);

		// Signing modal should be present
		expect(el.shadowRoot!.querySelector('dev-wallet-signing-modal')).not.toBeNull();

		// Approve via wallet API
		await wallet.approveRequest();
		await resultPromise;

		// Wait for the panel to re-render
		await new Promise((resolve) => setTimeout(resolve, 100));
		await waitForUpdate(el);

		// Signing modal should be gone (no pending request)
		expect(el.shadowRoot!.querySelector('dev-wallet-signing-modal')).toBeNull();
	});

	it('handles consecutive signing requests through UI', async () => {
		const el = document.createElement('dev-wallet-panel') as DevWalletPanel;
		(el as any).wallet = wallet;
		container.appendChild(el);
		await waitForUpdate(el);

		// First request
		const msg1 = new TextEncoder().encode('First request');
		const result1Promise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
			message: msg1,
			account: wallet.accounts[0],
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		await waitForUpdate(el);

		let modal = el.shadowRoot!.querySelector('dev-wallet-signing-modal') as DevWalletSigningModal;
		await waitForUpdate(modal);
		let signing = modal.shadowRoot!.querySelector('dev-wallet-signing') as DevWalletSigning;
		await waitForUpdate(signing);
		let approveBtn = signing.shadowRoot!.querySelector(
			'[part="approve-button"]',
		) as HTMLButtonElement;
		approveBtn.click();

		const result1 = await result1Promise;
		expect(result1.bytes).toBe(toBase64(msg1));

		// Second request
		const msg2 = new TextEncoder().encode('Second request');
		const result2Promise = wallet.features['sui:signPersonalMessage'].signPersonalMessage({
			message: msg2,
			account: wallet.accounts[0],
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		await waitForUpdate(el);

		modal = el.shadowRoot!.querySelector('dev-wallet-signing-modal') as DevWalletSigningModal;
		await waitForUpdate(modal);
		signing = modal.shadowRoot!.querySelector('dev-wallet-signing') as DevWalletSigning;
		await waitForUpdate(signing);

		const dataPreview = signing.shadowRoot!.querySelector('.request-data');
		expect(dataPreview?.textContent).toContain('Second request');

		approveBtn = signing.shadowRoot!.querySelector('[part="approve-button"]') as HTMLButtonElement;
		approveBtn.click();

		const result2 = await result2Promise;
		expect(result2.bytes).toBe(toBase64(msg2));
	});
});
