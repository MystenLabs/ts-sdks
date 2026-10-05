// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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
			},
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

	it('waits for initialization before a silent reconnect and restores the saved account', async () => {
		let finishInit!: (connector: unknown) => void;
		initMock.mockImplementation(
			() =>
				new Promise((resolve) => {
					finishInit = resolve as (connector: unknown) => void;
				}) as never,
		);

		const wallet = createWallet();
		const connectPromise = connect(wallet, { silent: true });

		// Initialization completes only after the silent reconnect was requested.
		finishInit(
			makeConnector({
				sessionProperties: {
					sui_getAccounts: JSON.stringify([{ address, pubkey }]),
				},
			}),
		);

		const { accounts } = await connectPromise;
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
		expect(wallet.accounts).toHaveLength(1);
	});

	it('returns no accounts for a silent reconnect when there is no existing session', async () => {
		const connector = makeConnector();
		connector.provider.session = undefined as never;
		initMock.mockResolvedValue(connector as never);

		const wallet = createWallet();
		const { accounts } = await connect(wallet, { silent: true });

		expect(accounts).toEqual([]);
		// A silent reconnect must not open a new WalletConnect connection.
		expect(connector.connect).not.toHaveBeenCalled();
	});

	it('looks up accounts for an existing session without cached account metadata', async () => {
		const connector = makeConnector({
			requestResult: [{ address, pubkey }],
		});
		initMock.mockResolvedValue(connector as never);

		const wallet = createWallet();
		const { accounts } = await connect(wallet, { silent: true });

		expect(connector.request).toHaveBeenCalledWith({ method: 'sui_getAccounts' }, 'sui:mainnet');
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
	});

	it('returns no accounts instead of throwing when the account lookup returns nothing', async () => {
		const connector = makeConnector({ requestResult: undefined });
		initMock.mockResolvedValue(connector as never);

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
		connector.provider.session = undefined as never;
		connector.connect.mockImplementation(async () => {
			connector.provider.session = {
				namespaces: { sui: {} },
				sessionProperties: {
					sui_getAccounts: JSON.stringify([{ address, pubkey }]),
				},
			} as never;
		});
		initMock.mockResolvedValue(connector as never);

		const wallet = createWallet();
		const { accounts } = await connect(wallet);

		expect(connector.connect).toHaveBeenCalledTimes(1);
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
	});

	it('surfaces initialization failures to connect callers', async () => {
		initMock.mockRejectedValue(new Error('init failed') as never);

		const wallet = createWallet();
		await expect(connect(wallet, { silent: true })).rejects.toThrow('init failed');
	});
});
