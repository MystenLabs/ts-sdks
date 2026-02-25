// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ManagedAccount, SignerAdapter } from '../src/types.js';
import { DevWallet } from '../src/wallet/dev-wallet.js';
import { DevWalletProvider, useDevWalletInstance } from '../src/react/context.js';
import { useDevWallet } from '../src/react/useDevWallet.js';

function createMockAdapter(accounts: ManagedAccount[] = []): SignerAdapter {
	const listeners = new Set<(accounts: ManagedAccount[]) => void>();

	return {
		id: 'mock',
		name: 'Mock Adapter',
		initialize: vi.fn().mockResolvedValue(undefined),
		getAccounts: vi.fn(() => [...accounts]),
		getAccount: vi.fn((address: string) => accounts.find((a) => a.address === address)),
		createAccount: vi.fn().mockResolvedValue({
			address: '0x' + '1'.repeat(64),
			label: 'New Account',
			signer: {} as any,
			walletAccount: {} as any,
		}),
		removeAccount: vi.fn(),
		onAccountsChanged: vi.fn((callback: (accounts: ManagedAccount[]) => void) => {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		}),
		destroy: vi.fn(),
	};
}

describe('DevWalletProvider / useDevWalletInstance', () => {
	it('provides wallet via context', () => {
		const adapter = createMockAdapter();
		const wallet = new DevWallet({ adapters: [adapter], clients: {} });

		const wrapper = ({ children }: { children: React.ReactNode }) =>
			createElement(DevWalletProvider, { wallet }, children);

		const { result } = renderHook(() => useDevWalletInstance(), { wrapper });

		expect(result.current).toBe(wallet);
	});

	it('returns provided wallet instance over context', () => {
		const adapter1 = createMockAdapter();
		const adapter2 = createMockAdapter();
		const contextWallet = new DevWallet({ adapters: [adapter1], clients: {} });
		const directWallet = new DevWallet({ adapters: [adapter2], clients: {} });

		const wrapper = ({ children }: { children: React.ReactNode }) =>
			createElement(DevWalletProvider, { wallet: contextWallet }, children);

		const { result } = renderHook(() => useDevWalletInstance(directWallet), { wrapper });

		expect(result.current).toBe(directWallet);
	});

	it('throws when no context and no wallet provided', () => {
		expect(() => {
			renderHook(() => useDevWalletInstance());
		}).toThrow('Could not find DevWalletContext');
	});
});

describe('useDevWallet', () => {
	it('returns null initially, then wallet after setup', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: { testnet: {} },
				mountUI: false,
			}),
		);

		// May be null initially (async setup)
		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		expect(result.current.wallet).toBeInstanceOf(DevWallet);
		expect(result.current.error).toBeNull();
	});

	it('initializes the adapter by default', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		expect(adapter.initialize).toHaveBeenCalledTimes(1);
	});

	it('skips initialization when autoInitialize is false', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				autoInitialize: false,
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		expect(adapter.initialize).not.toHaveBeenCalled();
	});

	it('creates initial account when requested', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				createInitialAccount: true,
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		expect(adapter.createAccount).toHaveBeenCalledTimes(1);
	});

	it('does not create account when not requested', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				createInitialAccount: false,
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		expect(adapter.createAccount).not.toHaveBeenCalled();
	});

	it('uses custom name', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				name: 'My Test Wallet',
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		expect(result.current.wallet!.name).toBe('My Test Wallet');
	});

	it('cleans up on unmount (unregisters and removes UI)', async () => {
		const adapter = createMockAdapter();

		const { result, unmount } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				mountUI: true,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		// UI panel should be present
		expect(document.querySelector('dev-wallet-panel')).not.toBeNull();

		act(() => {
			unmount();
		});

		// After unmount, the panel should be removed from the DOM
		expect(document.querySelector('dev-wallet-panel')).toBeNull();
	});

	it('mounts UI panel when mountUI is true', async () => {
		const adapter = createMockAdapter();

		const { result, unmount } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				mountUI: true,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		// The panel element should be appended to the document
		const panel = document.querySelector('dev-wallet-panel');
		expect(panel).not.toBeNull();

		act(() => {
			unmount();
		});

		// After unmount, panel should be removed
		const panelAfter = document.querySelector('dev-wallet-panel');
		expect(panelAfter).toBeNull();
	});

	it('does not mount UI when mountUI is false', async () => {
		const adapter = createMockAdapter();

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.wallet).not.toBeNull();
		});

		const panel = document.querySelector('dev-wallet-panel');
		expect(panel).toBeNull();
	});

	it('surfaces initialization errors', async () => {
		const adapter = createMockAdapter();
		(adapter.initialize as any).mockRejectedValue(new Error('IndexedDB quota exceeded'));

		const { result } = renderHook(() =>
			useDevWallet({
				adapters: [adapter],
				clients: {},
				mountUI: false,
			}),
		);

		await vi.waitFor(() => {
			expect(result.current.error).not.toBeNull();
		});

		expect(result.current.error!.message).toBe('IndexedDB quota exceeded');
		expect(result.current.wallet).toBeNull();
	});
});
