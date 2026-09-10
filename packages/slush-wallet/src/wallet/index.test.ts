// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from 'vitest';
import { SlushWallet } from './index.js';

function session(features?: string[]) {
	const payload = {
		exp: 9999999999,
		iat: 1,
		iss: 'wallet',
		aud: 'dapp',
		payload: {
			accounts: [
				{ address: '0xx', publicKey: 'AQID', ...(features === undefined ? {} : { features }) },
			],
		},
	};
	return `e30.${btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}.signature`;
}
function wallet(features?: string[]) {
	vi.stubGlobal('localStorage', { getItem: () => session(features) });
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
