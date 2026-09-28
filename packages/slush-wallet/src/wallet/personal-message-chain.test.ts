// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from 'vitest';
import { createJwtSession, WalletPostMessageChannel } from '@mysten/window-wallet-core';
import { SlushWallet } from './index.js';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@mysten/window-wallet-core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@mysten/window-wallet-core')>()),
	DappPostMessageChannel: class {
		send = send;
	},
}));
const key = new Uint8Array(32).fill(1);
afterEach(() => {
	vi.unstubAllGlobals();
	send.mockReset();
});
async function wallet(chains?: string[]) {
	const session = await createJwtSession(
		{
			accounts: [
				{ address: '0xx', publicKey: 'AQID', features: ['sui:signPersonalMessage'], chains },
			],
		},
		{ secretKey: key, expirationTime: '1h', issuer: 'wallet', audience: 'https://dapp.example' },
	);
	vi.stubGlobal('localStorage', { getItem: () => session });
	vi.stubGlobal('window', { opener: {}, addEventListener: vi.fn() });
	send.mockImplementation(async (payload) => {
		const channel = WalletPostMessageChannel.fromPayload({
			version: '1',
			requestId: '00000000-0000-4000-8000-000000000001',
			appUrl: 'https://dapp.example',
			appName: 'dapp',
			payload,
		});
		await channel.verifyJwtSession(key);
		return { bytes: 'AQID', signature: 'signature' };
	});
	return new SlushWallet({
		name: 'test',
		metadata: { id: 'slush', walletName: 'Slush', icon: 'data:image/png;base64,', enabled: true },
	});
}
it('signs a chain-less personal message on the restricted account chain', async () => {
	const instance = await wallet(['sui:testnet']);
	await expect(
		instance.features['sui:signPersonalMessage'].signPersonalMessage({
			account: instance.accounts[0],
			message: new Uint8Array([1]),
		}),
	).resolves.toEqual({ bytes: 'AQID', signature: 'signature' });
	expect(send).toHaveBeenCalledWith(expect.objectContaining({ chain: 'sui:testnet' }));
});
it('keeps an explicit unsupported chain and rejects it through session verification', async () => {
	const instance = await wallet(['sui:testnet']);
	await expect(
		instance.features['sui:signPersonalMessage'].signPersonalMessage({
			account: instance.accounts[0],
			message: new Uint8Array([1]),
			chain: 'sui:mainnet',
		}),
	).rejects.toThrow('chain');
	expect(send).toHaveBeenCalledWith(expect.objectContaining({ chain: 'sui:mainnet' }));
});
it('preserves the mainnet default for legacy accounts', async () => {
	const instance = await wallet();
	await instance.features['sui:signPersonalMessage'].signPersonalMessage({
		account: instance.accounts[0],
		message: new Uint8Array([1]),
	});
	expect(send).toHaveBeenCalledWith(expect.objectContaining({ chain: 'sui:mainnet' }));
});
it('refuses an account with no supported chains before opening a request', async () => {
	const instance = await wallet([]);
	await expect(
		instance.features['sui:signPersonalMessage'].signPersonalMessage({
			account: instance.accounts[0],
			message: new Uint8Array([1]),
		}),
	).rejects.toThrow('chain');
	expect(send).not.toHaveBeenCalled();
});
