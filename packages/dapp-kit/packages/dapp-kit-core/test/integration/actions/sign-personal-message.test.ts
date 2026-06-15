// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, afterEach, vi } from 'vitest';
import {
	GRPC_URLS,
	TEST_DEFAULT_NETWORK,
	TEST_NETWORKS,
	TestWalletInitializeResult,
} from '../../test-utils.js';
import { createMockWallets, MockWallet } from '../../mocks/mock-wallet.js';
import { createDAppKit, DAppKit } from '../../../src/index.js';
import { createInMemoryStorage } from '../../../src/utils/storage.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { getWallets } from '@mysten/wallet-standard';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { createMockAccount } from '../../mocks/mock-account.js';
import { ChainNotSupportedError, WalletAccountNotFoundError } from '../../../src/utils/errors.js';

const ACCOUNT_FEATURES = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
] as const;

describe('[Integration] signPersonalMessage action', () => {
	let dAppKit: DAppKit<typeof TEST_NETWORKS>;
	let wallets: MockWallet[];
	const cleanups: (() => void)[] = [];
	const signPersonalMessage = vi.fn();

	function registerWallets(...newWallets: MockWallet[]) {
		const unregister = getWallets().register(...newWallets);
		cleanups.push(unregister);
		return unregister;
	}

	function account(overrides = {}) {
		return createMockAccount({ features: ACCOUNT_FEATURES, ...overrides });
	}

	function setup(accounts: ReadonlyWalletAccount[] = [account(), account()]) {
		dAppKit = createDAppKit({
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
			},
			storage: createInMemoryStorage(),
			storageKey: 'test-storage-key',
			walletInitializers: [
				{
					id: 'Test Wallets',
					initialize(): TestWalletInitializeResult {
						wallets = createMockWallets({
							name: 'Mock Wallet',
							accounts,
							addedFeatures: {
								'sui:signPersonalMessage': { version: '1.0.0', signPersonalMessage },
							},
						});
						return { unregister: registerWallets(...wallets) };
					},
				},
			],
			slushWalletConfig: null,
		});
		return dAppKit.stores.$wallets.get();
	}

	afterEach(() => {
		while (cleanups.length) cleanups.pop()!();
		signPersonalMessage.mockReset();
	});

	test('Signs with the connected account on the current network by default', async () => {
		const [uiWallet] = setup();
		signPersonalMessage.mockResolvedValue({ bytes: 'MSG', signature: 'SIG' });

		await dAppKit.connectWallet({ wallet: uiWallet });
		const message = new Uint8Array([1, 2, 3]);
		await dAppKit.signPersonalMessage({ message });

		expect(signPersonalMessage).toHaveBeenCalledTimes(1);
		const [input] = signPersonalMessage.mock.calls[0];
		expect(input.account.address).toBe(uiWallet.accounts[0].address);
		expect(input.chain).toBe(`sui:${TEST_DEFAULT_NETWORK}`);
		expect(input.message).toBe(message);
	});

	test('Signs with an explicitly provided account belonging to the connected wallet', async () => {
		const [uiWallet] = setup();
		signPersonalMessage.mockResolvedValue({ bytes: 'MSG', signature: 'SIG' });

		await dAppKit.connectWallet({ wallet: uiWallet });
		await dAppKit.signPersonalMessage({
			message: new Uint8Array([1, 2, 3]),
			account: uiWallet.accounts[1],
		});

		const [input] = signPersonalMessage.mock.calls[0];
		expect(input.account.address).toBe(uiWallet.accounts[1].address);
		// The globally selected account is unchanged:
		expect(dAppKit.stores.$connection.get().account?.address).toBe(uiWallet.accounts[0].address);
	});

	test('Signs against an explicitly provided network without changing the active network', async () => {
		const [uiWallet] = setup();
		signPersonalMessage.mockResolvedValue({ bytes: 'MSG', signature: 'SIG' });

		await dAppKit.connectWallet({ wallet: uiWallet });
		await dAppKit.signPersonalMessage({ message: new Uint8Array([1, 2, 3]), network: 'testnet' });

		const [input] = signPersonalMessage.mock.calls[0];
		expect(input.chain).toBe('sui:testnet');
		// The globally selected network is unchanged:
		expect(dAppKit.stores.$currentNetwork.get()).toBe(TEST_DEFAULT_NETWORK);
	});

	test('Throws when the provided account does not belong to the connected wallet', async () => {
		const [uiWallet] = setup([account()]);
		const otherWallet = createMockWallets({ name: 'Other Wallet', accounts: [account()] });
		registerWallets(...otherWallet);

		await dAppKit.connectWallet({ wallet: uiWallet });

		const otherUiWallet = dAppKit.stores.$wallets.get().find((w) => w.name === 'Other Wallet')!;
		await expect(
			dAppKit.signPersonalMessage({
				message: new Uint8Array([1, 2, 3]),
				account: otherUiWallet.accounts[0],
			}),
		).rejects.toBeInstanceOf(WalletAccountNotFoundError);
	});

	test('Throws when the connected account does not support the requested network', async () => {
		const [uiWallet] = setup([account({ chains: ['sui:mainnet'] })]);

		await dAppKit.connectWallet({ wallet: uiWallet });

		await expect(
			dAppKit.signPersonalMessage({ message: new Uint8Array([1, 2, 3]), network: 'testnet' }),
		).rejects.toBeInstanceOf(ChainNotSupportedError);
	});
});
