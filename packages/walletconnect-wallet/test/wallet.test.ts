// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { setImmediate } from 'node:timers/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UniversalConnector } from '@reown/appkit-universal-connector';
import { WalletConnectWallet } from '../src/wallet/index.js';

vi.mock('@reown/appkit-universal-connector', () => ({
	UniversalConnector: {
		init: vi.fn(),
	},
}));

const initMock = vi.mocked(UniversalConnector.init);

const address = `0x${'1'.padStart(64, '0')}`;
const pubkey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

type TestSession = {
	namespaces: { sui: Record<string, never> };
	sessionProperties?: Record<string, string>;
};

function makeConnector({
	sessionProperties,
	requestResult,
}: {
	sessionProperties?: Record<string, string>;
	requestResult?: unknown;
} = {}) {
	return {
		provider: {
			session: {
				namespaces: { sui: {} },
				sessionProperties,
			} as TestSession | undefined,
		},
		connect: vi.fn(async () => {}),
		disconnect: vi.fn(async () => {}),
		request: vi.fn(async () => requestResult),
	};
}

function createWallet() {
	return new WalletConnectWallet({
		metadata: {
			id: 'walletconnect',
			walletName: 'Wallet Connect',
			icon: 'data:image/svg+xml;base64,PHN2Zy8+',
			enabled: true,
		},
		projectId: 'test-project-id',
		getClient: () => {
			throw new Error('getClient should not be called in these tests');
		},
	});
}

const connect = (wallet: WalletConnectWallet, input?: { silent?: boolean }) =>
	wallet.features['standard:connect'].connect(input);

describe('WalletConnectWallet connect', () => {
	beforeEach(() => {
		initMock.mockReset();
	});

	it.each([true, false])(
		'waits for initialization and restores the saved account (silent: %s)',
		async (silent) => {
			const initialization = Promise.withResolvers<UniversalConnector>();
			initMock.mockReturnValue(initialization.promise);
			const connector = makeConnector({
				sessionProperties: {
					sui_getAccounts: JSON.stringify([{ address, pubkey }]),
				},
			});

			const wallet = createWallet();
			const connectPromise = connect(wallet, { silent });
			const settled = vi.fn();
			// Attach both handlers immediately so a regression cannot leak a rejection.
			void connectPromise.then(settled, settled);
			await setImmediate();
			const settledBeforeInitialization = settled.mock.calls.length;
			initialization.resolve(connector as unknown as UniversalConnector);

			expect(settledBeforeInitialization).toBe(0);
			expect(initMock).toHaveBeenCalledTimes(1);
			expect(connector.connect).not.toHaveBeenCalled();
			expect(connector.request).not.toHaveBeenCalled();

			const { accounts } = await connectPromise;
			expect(accounts).toHaveLength(1);
			expect(accounts[0].address).toBe(address);
			expect(wallet.accounts).toHaveLength(1);
		},
	);

	it('returns no accounts for a silent reconnect when there is no existing session', async () => {
		const connector = makeConnector();
		connector.provider.session = undefined;
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);

		const wallet = createWallet();
		const { accounts } = await connect(wallet, { silent: true });

		expect(accounts).toEqual([]);
		// A silent reconnect must not open a new WalletConnect connection.
		expect(connector.connect).not.toHaveBeenCalled();
		expect(connector.request).not.toHaveBeenCalled();
	});

	it('looks up accounts for an existing session without cached account metadata', async () => {
		const connector = makeConnector({
			requestResult: [{ address, pubkey }],
		});
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);

		const wallet = createWallet();
		const { accounts } = await connect(wallet, { silent: true });

		expect(connector.request).toHaveBeenCalledWith({ method: 'sui_getAccounts' }, 'sui:mainnet');
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
	});

	it('returns no accounts instead of throwing when the account lookup returns nothing', async () => {
		const connector = makeConnector({ requestResult: undefined });
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);

		const wallet = createWallet();
		const { accounts } = await connect(wallet, { silent: true });

		expect(accounts).toEqual([]);
	});

	it('connects explicitly when there is no existing session', async () => {
		const connector = makeConnector({
			sessionProperties: {
				sui_getAccounts: JSON.stringify([{ address, pubkey }]),
			},
		});
		connector.provider.session = undefined;
		connector.connect.mockImplementation(async () => {
			connector.provider.session = {
				namespaces: { sui: {} },
				sessionProperties: {
					sui_getAccounts: JSON.stringify([{ address, pubkey }]),
				},
			};
		});
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);

		const wallet = createWallet();
		const { accounts } = await connect(wallet);

		expect(connector.connect).toHaveBeenCalledTimes(1);
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
	});

	it('does not start a new connection if the session disappears during silent reconnect', async () => {
		const connector = makeConnector();
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);
		const wallet = createWallet();
		await setImmediate();
		const session = connector.provider.session;
		Object.defineProperty(connector.provider, 'session', {
			get: vi.fn().mockReturnValueOnce(session).mockReturnValue(undefined),
		});

		await expect(connect(wallet, { silent: true })).resolves.toEqual({ accounts: [] });
		expect(connector.connect).not.toHaveBeenCalled();
		expect(connector.request).not.toHaveBeenCalled();
	});

	it('surfaces account lookup failures without starting a new connection', async () => {
		const connector = makeConnector();
		connector.request.mockRejectedValue(new Error('account lookup failed'));
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);

		const wallet = createWallet();
		await expect(connect(wallet, { silent: true })).rejects.toThrow('account lookup failed');
		expect(connector.connect).not.toHaveBeenCalled();
	});

	it('handles initialization failures when the wallet is never connected', async () => {
		initMock.mockRejectedValue(new Error('init failed'));
		createWallet();

		// Vitest reports any unhandled rejection after initialization settles.
		await setImmediate();
		expect(initMock).toHaveBeenCalledTimes(1);
	});

	it('surfaces initialization failures to connect callers', async () => {
		initMock.mockRejectedValue(new Error('init failed'));

		const wallet = createWallet();
		await expect(connect(wallet, { silent: true })).rejects.toThrow('init failed');
	});
});
