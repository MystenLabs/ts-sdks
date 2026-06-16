// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, afterEach, vi } from 'vitest';
import { allTasks } from 'nanostores';
import { getWallets } from '@mysten/wallet-standard';
import { SuiGrpcClient } from '@mysten/sui/grpc';

import { createDAppKit, DAppKit } from '../../../src/index.js';
import { createInMemoryStorage } from '../../../src/utils/storage.js';
import { AUTO_CONNECT_RESTORE_TIMEOUT } from '../../../src/core/initializers/autoconnect-wallet.js';
import { GRPC_URLS, TEST_DEFAULT_NETWORK, TEST_NETWORKS } from '../../test-utils.js';
import { createMockWallets, MockWallet } from '../../mocks/mock-wallet.js';
import { createMockAccount } from '../../mocks/mock-account.js';

describe('[Integration] autoConnectWallet initializer', () => {
	const storageKey = 'test-storage-key';
	let unregisterCallbacks: Array<() => void> = [];

	afterEach(() => {
		unregisterCallbacks.forEach((unregister) => unregister());
		unregisterCallbacks = [];
		vi.useRealTimers();
	});

	function registerWallets(...wallets: MockWallet[]) {
		const unregister = getWallets().register(...wallets);
		unregisterCallbacks.push(unregister);
		return unregister;
	}

	function createKit({
		storage,
		autoConnect = true,
	}: {
		storage: ReturnType<typeof createInMemoryStorage>;
		autoConnect?: boolean;
	}): DAppKit<typeof TEST_NETWORKS> {
		return createDAppKit({
			autoConnect,
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
			},
			storage,
			storageKey,
			slushWalletConfig: null,
		});
	}

	// Mirrors the format produced by `saveAccountToStorage`.
	function savedSessionValue(walletId: string, address: string, intents: string[] = []) {
		return [walletId.replace(':', '_'), address, intents.join(',')].join(':');
	}

	function createSavedWallet() {
		const account = createMockAccount();
		const [wallet] = createMockWallets({
			id: 'saved-wallet',
			name: 'Saved Wallet',
			accounts: [account],
		});
		return { wallet, account };
	}

	test('Settles to disconnected without ever reconnecting when there is no persisted session', async () => {
		const storage = createInMemoryStorage();
		const dAppKit = createKit({ storage });

		const statusesSeen: string[] = [];
		dAppKit.stores.$connection.subscribe((connection) => statusesSeen.push(connection.status));

		await allTasks();

		expect(dAppKit.stores.$connection.get()).toMatchObject({
			status: 'disconnected',
			isReconnecting: false,
			account: null,
		});
		expect(statusesSeen).not.toContain('reconnecting');
	});

	test('Advertises reconnecting before the saved wallet registers, then restores the session', async () => {
		const { wallet, account } = createSavedWallet();
		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage });

		const statusesSeen: string[] = [];
		dAppKit.stores.$connection.subscribe((connection) => statusesSeen.push(connection.status));

		// The saved wallet hasn't registered yet, but a persisted session exists, so
		// the connection should immediately advertise that it is restoring.
		await allTasks();
		expect(dAppKit.stores.$connection.get()).toMatchObject({
			status: 'reconnecting',
			wallet: null,
			account: null,
			isReconnecting: true,
			isDisconnected: false,
		});

		// Once the saved wallet finally registers, the session should restore.
		registerWallets(wallet);
		await allTasks();

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('connected');
		expect(connection.isReconnecting).toBe(false);
		expect(connection.account?.address).toBe(account.address);
		expect(statusesSeen).toContain('reconnecting');
	});

	test('Restores the session when the saved wallet is already registered', async () => {
		const { wallet, account } = createSavedWallet();
		registerWallets(wallet);

		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage });
		dAppKit.stores.$connection.subscribe(() => {});

		await allTasks();

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('connected');
		expect(connection.account?.address).toBe(account.address);
	});

	test('Settles back to disconnected after a timeout if the saved wallet never registers', async () => {
		vi.useFakeTimers();

		const { account } = createSavedWallet();
		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage });
		dAppKit.stores.$connection.subscribe(() => {});

		// We have a persisted session but the wallet never registers, so we stay in
		// the reconnecting state until the restore window elapses.
		await allTasks();
		expect(dAppKit.stores.$connection.get().status).toBe('reconnecting');

		vi.advanceTimersByTime(AUTO_CONNECT_RESTORE_TIMEOUT);

		expect(dAppKit.stores.$connection.get()).toMatchObject({
			status: 'disconnected',
			isReconnecting: false,
			account: null,
		});
	});

	test('Restores a slow-registering wallet that appears after the restore window elapses', async () => {
		vi.useFakeTimers();

		const { wallet, account } = createSavedWallet();
		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage });
		dAppKit.stores.$connection.subscribe(() => {});

		await allTasks();
		expect(dAppKit.stores.$connection.get().status).toBe('reconnecting');

		// The restore window elapses before the wallet registers, so we stop
		// advertising "reconnecting"...
		vi.advanceTimersByTime(AUTO_CONNECT_RESTORE_TIMEOUT);
		expect(dAppKit.stores.$connection.get().status).toBe('disconnected');

		// ...but a slow-registering wallet can still restore the session afterwards.
		registerWallets(wallet);
		await allTasks();

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('connected');
		expect(connection.account?.address).toBe(account.address);
	});

	test('Does not attempt to reconnect when autoConnect is disabled', async () => {
		const { wallet, account } = createSavedWallet();
		registerWallets(wallet);

		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage, autoConnect: false });

		const statusesSeen: string[] = [];
		dAppKit.stores.$connection.subscribe((connection) => statusesSeen.push(connection.status));

		await allTasks();

		expect(dAppKit.stores.$connection.get().status).toBe('disconnected');
		expect(statusesSeen).not.toContain('reconnecting');
	});
});
