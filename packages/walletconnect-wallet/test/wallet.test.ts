// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { setImmediate } from 'node:timers/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UniversalConnector } from '@reown/appkit-universal-connector';
import { toBase64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { WalletAccount } from '@mysten/wallet-standard';
import { WalletConnectWallet, type GetClient } from '../src/wallet/index.js';

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

function createWallet(
	getClient: GetClient = () => {
		throw new Error('getClient should not be called in these tests');
	},
) {
	return new WalletConnectWallet({
		metadata: {
			id: 'walletconnect',
			walletName: 'Wallet Connect',
			icon: 'data:image/svg+xml;base64,PHN2Zy8+',
			enabled: true,
		},
		projectId: 'test-project-id',
		getClient,
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

	it('connects after a successful initialization retry', async () => {
		const connector = makeConnector({
			sessionProperties: {
				sui_getAccounts: JSON.stringify([{ address, pubkey }]),
			},
		});
		initMock
			.mockRejectedValueOnce(new Error('init failed'))
			.mockResolvedValueOnce(connector as unknown as UniversalConnector);

		const wallet = createWallet();
		await expect(connect(wallet, { silent: true })).rejects.toThrow('init failed');
		await wallet.init();

		const { accounts } = await connect(wallet, { silent: true });
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
		expect(wallet.accounts).toEqual(accounts);
		expect(initMock).toHaveBeenCalledTimes(2);
		expect(connector.connect).not.toHaveBeenCalled();
		expect(connector.request).not.toHaveBeenCalled();
	});

	it('waits for reinitialization before connecting even after an earlier successful initialization', async () => {
		const connector = makeConnector({
			sessionProperties: {
				sui_getAccounts: JSON.stringify([{ address, pubkey }]),
			},
		});
		const initialization = Promise.withResolvers<UniversalConnector>();
		initMock
			.mockResolvedValueOnce(connector as unknown as UniversalConnector)
			.mockReturnValueOnce(initialization.promise);
		const wallet = createWallet();
		await connect(wallet, { silent: true });

		const retryPromise = wallet.init();
		const connectPromise = connect(wallet, { silent: true });
		const settled = vi.fn();
		void connectPromise.then(settled, settled);
		await setImmediate();
		const settledBeforeInitialization = settled.mock.calls.length;
		initialization.resolve(connector as unknown as UniversalConnector);

		expect(settledBeforeInitialization).toBe(0);
		await retryPromise;
		const { accounts } = await connectPromise;
		expect(accounts).toHaveLength(1);
		expect(accounts[0].address).toBe(address);
		expect(initMock).toHaveBeenCalledTimes(2);
	});
});

describe('WalletConnectWallet dApp metadata', () => {
	beforeEach(() => {
		initMock.mockReset();
		initMock.mockResolvedValue(makeConnector() as unknown as UniversalConnector);
	});

	it('passes the provided dApp metadata to WalletConnect', async () => {
		const dAppMetadata = {
			name: 'My dApp',
			description: 'My dApp description',
			url: 'https://my-dapp.example',
			icons: ['https://my-dapp.example/icon.png'],
		};

		const wallet = new WalletConnectWallet({
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
			dAppMetadata,
		});
		await wallet.init();

		expect(initMock).toHaveBeenLastCalledWith(expect.objectContaining({ metadata: dAppMetadata }));
	});

	it('falls back to default metadata when none is provided', async () => {
		const wallet = createWallet();
		await wallet.init();

		expect(initMock).toHaveBeenLastCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					name: 'Wallet Connect',
					url: 'https://walletconnect.org',
				}),
			}),
		);
	});
});

describe('WalletConnectWallet transaction signing', () => {
	const gasCoinId = `0x${'2'.padStart(64, '0')}`;
	const digest = '11111111111111111111111111111111';
	const account = { address } as WalletAccount;

	// Fully specified (sender omitted on purpose) so it builds without network calls.
	function makeTransaction() {
		const tx = new Transaction();
		tx.setGasPrice(1000);
		tx.setGasBudget(10_000_000);
		tx.setGasPayment([{ objectId: gasCoinId, version: '1', digest }]);
		const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1)]);
		tx.transferObjects([coin], tx.pure.address(address));
		return tx;
	}

	async function expectedBytes() {
		const tx = makeTransaction();
		tx.setSender(address);
		return toBase64(await tx.build());
	}

	function createSigningWallet(client: Partial<ClientWithCoreApi> = {}) {
		const getClient = vi.fn(() => client as ClientWithCoreApi);
		return { wallet: createWallet(getClient), getClient };
	}

	beforeEach(() => {
		initMock.mockReset();
	});

	it('sends base64 BCS bytes with the sender set for sui_signTransaction', async () => {
		const connector = makeConnector({
			requestResult: { transactionBytes: 'signed-bytes', signature: 'sig' },
		});
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);
		const { wallet, getClient } = createSigningWallet();
		await wallet.init();

		const result = await wallet.features['sui:signTransaction'].signTransaction({
			transaction: makeTransaction(),
			account,
			chain: 'sui:testnet',
		});

		const [request, chain] = connector.request.mock.calls[0] as unknown as [
			{ method: string; params: { transaction: string; address: string } },
			string,
		];
		expect(request.method).toBe('sui_signTransaction');
		expect(request.params.transaction).toBe(await expectedBytes());
		expect(request.params.address).toBe(address);
		expect(chain).toBe('sui:testnet');
		expect(getClient).toHaveBeenCalledWith('testnet');
		expect(result).toEqual({ bytes: 'signed-bytes', signature: 'sig' });
	});

	it('keeps an existing sender instead of overwriting it', async () => {
		const sponsoredSender = `0x${'3'.padStart(64, '0')}`;
		const connector = makeConnector({
			requestResult: { transactionBytes: 'signed-bytes', signature: 'sig' },
		});
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);
		const { wallet } = createSigningWallet();
		await wallet.init();
		const tx = makeTransaction();
		tx.setSender(sponsoredSender);

		await wallet.features['sui:signTransaction'].signTransaction({
			transaction: tx,
			account,
			chain: 'sui:testnet',
		});

		const expected = makeTransaction();
		expected.setSender(sponsoredSender);
		const [request] = connector.request.mock.calls[0] as unknown as [
			{ params: { transaction: string } },
		];
		expect(request.params.transaction).toBe(toBase64(await expected.build()));
	});

	it('passes the client and sets the sender before toJSON so intents can resolve', async () => {
		const connector = makeConnector({
			requestResult: { transactionBytes: 'signed-bytes', signature: 'sig' },
		});
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);
		const client = {} as ClientWithCoreApi;
		const { wallet } = createSigningWallet(client);
		await wallet.init();
		const tx = makeTransaction();
		let senderAtSerialization: string | null | undefined;
		const toJSON = vi.fn((options?: { client?: ClientWithCoreApi }) => {
			senderAtSerialization = tx.getData().sender;
			return tx.toJSON(options);
		});

		// Mirrors a plain `Transaction`, which also exposes `setSenderIfNotSet`.
		const transaction = {
			toJSON,
			setSenderIfNotSet: (sender: string) => tx.setSenderIfNotSet(sender),
		};

		await wallet.features['sui:signTransaction'].signTransaction({
			transaction,
			account,
			chain: 'sui:testnet',
		});

		expect(toJSON).toHaveBeenCalledWith({ client });
		expect(senderAtSerialization).toBe(address);
	});

	it('sends base64 BCS bytes for sui_signAndExecuteTransaction', async () => {
		const connector = makeConnector({ requestResult: { digest: 'tx-digest' } });
		initMock.mockResolvedValue(connector as unknown as UniversalConnector);
		const waitForTransaction = vi.fn(async () => ({
			Transaction: { signatures: ['sig'], effects: { bcs: new Uint8Array([1, 2, 3]) } },
		}));
		const { wallet, getClient } = createSigningWallet({
			core: { waitForTransaction } as unknown as ClientWithCoreApi['core'],
		});
		await wallet.init();

		const result = await wallet.features['sui:signAndExecuteTransaction'].signAndExecuteTransaction(
			{
				transaction: makeTransaction(),
				account,
				chain: 'sui:testnet',
			},
		);

		const [request] = connector.request.mock.calls[0] as unknown as [
			{ method: string; params: { transaction: string; address: string } },
		];
		const bytes = await expectedBytes();
		expect(request.method).toBe('sui_signAndExecuteTransaction');
		expect(request.params.transaction).toBe(bytes);
		expect(getClient).toHaveBeenCalledWith('testnet');
		expect(waitForTransaction).toHaveBeenCalledWith({
			digest: 'tx-digest',
			include: { effects: true },
		});
		expect(result).toEqual({
			digest: 'tx-digest',
			signature: 'sig',
			bytes,
			effects: toBase64(new Uint8Array([1, 2, 3])),
		});
	});
});
