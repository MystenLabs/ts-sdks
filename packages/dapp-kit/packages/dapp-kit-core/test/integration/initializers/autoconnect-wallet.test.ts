// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, afterEach } from 'vitest';
import { allTasks } from 'nanostores';
import { getWallets } from '@mysten/wallet-standard';
import { SuiGrpcClient } from '@mysten/sui/grpc';

import { createDAppKit, DAppKit } from '../../../src/index.js';
import { createInMemoryStorage } from '../../../src/utils/storage.js';
import type { WalletInitializer } from '../../../src/wallets/index.js';
import { GRPC_URLS, TEST_DEFAULT_NETWORK, TEST_NETWORKS } from '../../test-utils.js';
import { createMockWallets, MockWallet } from '../../mocks/mock-wallet.js';
import { createMockAccount } from '../../mocks/mock-account.js';

describe('[Integration] autoConnectWallet initializer', () => {
	const storageKey = 'test-storage-key';
	let cleanups: Array<() => void> = [];

	afterEach(() => {
		// Release any pending initializer gates and unregister wallets so a hung
		// initializer in one test can't leak into the next.
		cleanups.forEach((cleanup) => cleanup());
		cleanups = [];
	});

	// Lets a macrotask elapse so queued microtasks (storage reads, restore tasks)
	// drain, without waiting on `allTasks()` (which would block on a pending gate).
	function tick() {
		return new Promise((resolve) => setTimeout(resolve, 0));
	}

	function createKit({
		storage,
		autoConnect = true,
		walletInitializers = [],
		// Default to 0 so tests are bounded purely by initializer completion (fast and
		// deterministic). The grace-floor tests pass an explicit value.
		autoConnectTimeout = 0,
	}: {
		storage: ReturnType<typeof createInMemoryStorage>;
		autoConnect?: boolean;
		walletInitializers?: WalletInitializer[];
		autoConnectTimeout?: number;
	}): DAppKit<typeof TEST_NETWORKS> {
		return createDAppKit({
			autoConnect,
			autoConnectTimeout,
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
			},
			storage,
			storageKey,
			slushWalletConfig: null,
			walletInitializers,
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

	function registerWallets(...wallets: MockWallet[]) {
		const unregister = getWallets().register(...wallets);
		cleanups.push(unregister);
		return unregister;
	}

	/**
	 * Builds a wallet initializer whose registration is deferred until `release()` is
	 * called, modelling an asynchronously-registering wallet (e.g. Slush). Pass a
	 * `wallet` to register on release, or omit it to model an initializer that
	 * finishes without ever registering the saved wallet.
	 */
	function deferredInitializer({ wallet }: { wallet?: MockWallet } = {}) {
		let release!: () => void;
		let reject!: (error: Error) => void;
		const gate = new Promise<void>((resolve, rejectGate) => {
			release = resolve;
			reject = rejectGate;
		});
		// Ensure the gate is always settled so `afterEach` can't leave it dangling.
		cleanups.push(() => release());

		const initializer: WalletInitializer = {
			id: 'deferred-test-initializer',
			async initialize() {
				await gate;
				const unregister = wallet ? registerWallets(wallet) : () => {};
				return { unregister };
			},
		};

		return { initializer, release, fail: () => reject(new Error('initializer failed')) };
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

	test('Stays reconnecting while an async wallet registers, then restores the session', async () => {
		const { wallet, account } = createSavedWallet();
		const { initializer, release } = deferredInitializer({ wallet });

		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage, walletInitializers: [initializer] });

		const statusesSeen: string[] = [];
		dAppKit.stores.$connection.subscribe((connection) => statusesSeen.push(connection.status));

		// The saved wallet's initializer hasn't registered it yet, but a persisted
		// session exists, so the connection should advertise that it is restoring.
		await tick();
		expect(dAppKit.stores.$connection.get()).toMatchObject({
			status: 'reconnecting',
			wallet: null,
			account: null,
			isReconnecting: true,
			isDisconnected: false,
		});

		// Once the wallet finishes registering, the session restores.
		release();
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

	test('Settles to disconnected once all initializers finish without the saved wallet', async () => {
		const { account } = createSavedWallet();
		// The initializer settles without ever registering the saved wallet, modelling
		// a wallet that was uninstalled or is otherwise unavailable.
		const { initializer, release } = deferredInitializer();

		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage, walletInitializers: [initializer] });
		dAppKit.stores.$connection.subscribe(() => {});

		// While the initializer is still pending, we keep advertising reconnecting...
		await tick();
		expect(dAppKit.stores.$connection.get().status).toBe('reconnecting');

		// ...and settle deterministically once it finishes, with no wall-clock timeout.
		release();
		await allTasks();

		expect(dAppKit.stores.$connection.get()).toMatchObject({
			status: 'disconnected',
			isReconnecting: false,
			account: null,
		});
	});

	test('Settles to disconnected when a wallet initializer fails', async () => {
		const { account } = createSavedWallet();
		const { initializer, fail } = deferredInitializer();

		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage, walletInitializers: [initializer] });
		dAppKit.stores.$connection.subscribe(() => {});

		await tick();
		expect(dAppKit.stores.$connection.get().status).toBe('reconnecting');

		fail();
		await allTasks();

		expect(dAppKit.stores.$connection.get().status).toBe('disconnected');
	});

	test('Does not give up on a wallet that registers within the grace period', async () => {
		const { wallet, account } = createSavedWallet();
		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		// No initializers, so the only thing keeping us reconnecting is the grace
		// period — this models a late-registering browser extension.
		const dAppKit = createKit({ storage, autoConnectTimeout: 200 });

		const statusesSeen: string[] = [];
		dAppKit.stores.$connection.subscribe((connection) => statusesSeen.push(connection.status));

		await tick();
		expect(dAppKit.stores.$connection.get().status).toBe('reconnecting');

		// The wallet registers within the grace window, so the session restores and we
		// never falsely report a logged-out state.
		registerWallets(wallet);
		await allTasks();

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('connected');
		expect(connection.account?.address).toBe(account.address);

		// Crucially, once we start reconnecting we never flip to a (false) logged-out
		// state before connecting — the grace period held the restore open.
		const firstReconnecting = statusesSeen.indexOf('reconnecting');
		expect(firstReconnecting).toBeGreaterThanOrEqual(0);
		expect(statusesSeen.slice(firstReconnecting)).not.toContain('disconnected');
	});

	test('Settles to disconnected after the grace period when no wallet registers', async () => {
		const { account } = createSavedWallet();
		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage, autoConnectTimeout: 50 });
		dAppKit.stores.$connection.subscribe(() => {});

		await tick();
		expect(dAppKit.stores.$connection.get().status).toBe('reconnecting');

		// Once the grace period elapses with no matching wallet, we settle.
		await new Promise((resolve) => setTimeout(resolve, 80));
		await allTasks();

		expect(dAppKit.stores.$connection.get()).toMatchObject({
			status: 'disconnected',
			isReconnecting: false,
			account: null,
		});
	});

	test('Restores a very-late wallet that registers after the grace period elapses', async () => {
		const { wallet, account } = createSavedWallet();
		const storage = createInMemoryStorage();
		await storage.setItem(storageKey, savedSessionValue('saved-wallet', account.address));

		const dAppKit = createKit({ storage, autoConnectTimeout: 30 });
		dAppKit.stores.$connection.subscribe(() => {});

		// Grace period elapses with no wallet → we settle the signal to disconnected...
		await new Promise((resolve) => setTimeout(resolve, 60));
		await allTasks();
		expect(dAppKit.stores.$connection.get().status).toBe('disconnected');

		// ...but we keep listening, so a wallet that shows up later still restores.
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
