// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from 'vitest';
import { SlushWallet } from './index.js';

function session(features?: string[], chains?: string[]) {
	const payload = {
		exp: 9999999999,
		iat: 1,
		iss: 'wallet',
		aud: 'dapp',
		payload: {
			accounts: [
				{
					address: '0xx',
					publicKey: 'AQID',
					...(features === undefined ? {} : { features }),
					...(chains === undefined ? {} : { chains }),
				},
			],
		},
	};
	return `e30.${btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}.signature`;
}
function wallet(features?: string[], chains?: string[]) {
	vi.stubGlobal('localStorage', { getItem: () => session(features, chains) });
	return new SlushWallet({
		name: 'test',
		metadata: { id: 'slush', walletName: 'Slush', icon: 'data:image/png;base64,', enabled: true },
	});
}
afterEach(() => vi.unstubAllGlobals());
it('preserves an explicitly unheld account through JWT decoding and wallet account construction', () => {
	const [account] = wallet([]).accounts;
	expect(account.features).toEqual([]);
	expect(account.publicKey).toEqual(new Uint8Array([1, 2, 3]));
});
it('preserves the advertised feature subset', () => {
	expect(wallet(['sui:signPersonalMessage']).accounts[0].features).toEqual([
		'sui:signPersonalMessage',
	]);
});
it('keeps existing sessions compatible when no feature field was supplied', () => {
	expect(wallet().accounts[0].features).toContain('sui:signTransaction');
});

it('only advertises features implemented by the wallet', () => {
	const instance = wallet(['sui:signAndExecuteTransactionBlock', 'sui:signTransaction']);
	expect(instance.accounts[0].features.every((feature) => feature in instance.features)).toBe(true);
});

it('refreshes accounts when another tab replaces or clears the session', () => {
	let stored: string | null = session(['sui:signTransaction']);
	const browser = new EventTarget();
	vi.stubGlobal('window', browser);
	vi.stubGlobal('localStorage', { getItem: () => stored });
	const instance = new SlushWallet({
		name: 'test',
		metadata: { id: 'slush', walletName: 'Slush', icon: 'data:image/png;base64,', enabled: true },
	});
	const change = vi.fn();
	instance.features['standard:events'].on('change', change);
	stored = session([]);
	browser.dispatchEvent(
		Object.assign(new Event('storage'), { key: 'slush:session', storageArea: localStorage }),
	);
	expect(instance.accounts[0].features).toEqual([]);
	expect(change).toHaveBeenCalledTimes(1);
	stored = null;
	browser.dispatchEvent(
		Object.assign(new Event('storage'), { key: null, storageArea: localStorage }),
	);
	expect(instance.accounts).toEqual([]);
});

it('preserves the checked chain subset in hosted accounts', () => {
	expect(wallet(['sui:signTransaction'], ['sui:devnet']).accounts[0].chains).toEqual([
		'sui:devnet',
	]);
});
it('does not widen an explicit empty chain list or advertise unknown chains', () => {
	expect(wallet([], []).accounts[0].chains).toEqual([]);
	expect(wallet([], ['other:chain', 'sui:testnet']).accounts[0].chains).toEqual(['sui:testnet']);
});
it('preserves legacy sessions with no chain restriction', () => {
	expect(wallet().accounts[0].chains).toEqual([
		'sui:devnet',
		'sui:testnet',
		'sui:localnet',
		'sui:mainnet',
	]);
});
