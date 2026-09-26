// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from 'vitest';
import { createJwtSession, WalletPostMessageChannel } from '@mysten/window-wallet-core';

const key = new Uint8Array(32).fill(1);
afterEach(() => vi.unstubAllGlobals());
async function request(
	type: 'sign-transaction' | 'sign-and-execute-transaction' | 'sign-personal-message',
	features?: string[],
	chains?: string[],
) {
	vi.stubGlobal('window', { opener: {} });
	const session = await createJwtSession(
		{ accounts: [{ address: '0xx', publicKey: 'AQID', features, chains }] },
		{ secretKey: key, expirationTime: '1h', issuer: 'wallet', audience: 'https://dapp.example' },
	);
	return WalletPostMessageChannel.fromPayload({
		version: '1',
		requestId: '00000000-0000-4000-8000-000000000001',
		appUrl: 'https://dapp.example',
		appName: 'dapp',
		payload: {
			type,
			transaction: '{}',
			message: 'AQID',
			address: '0xx',
			chain: 'sui:devnet',
			session,
		},
	});
}
it.each(['sign-transaction', 'sign-and-execute-transaction', 'sign-personal-message'] as const)(
	'rejects direct %s requests excluded by the signed session',
	async (type) => {
		await expect((await request(type, [])).verifyJwtSession(key)).rejects.toThrow('not authorized');
	},
);
it('allows the explicitly included request and legacy sessions', async () => {
	await expect(
		(await request('sign-personal-message', ['sui:signPersonalMessage'])).verifyJwtSession(key),
	).resolves.toBeTruthy();
	await expect((await request('sign-transaction')).verifyJwtSession(key)).resolves.toBeTruthy();
});

it('does not widen a restricted session to a different request type', async () => {
	await expect(
		(await request('sign-transaction', ['sui:signPersonalMessage'])).verifyJwtSession(key),
	).rejects.toThrow('not authorized');
	await expect(
		(await request('sign-transaction', ['sui:signTransactionBlock'])).verifyJwtSession(key),
	).resolves.toBeTruthy();
});

it.each(['sign-transaction', 'sign-and-execute-transaction', 'sign-personal-message'] as const)(
	'rejects %s on chains excluded by the signed session',
	async (type) => {
		await expect(
			(await request(type, undefined, ['sui:testnet'])).verifyJwtSession(key),
		).rejects.toThrow('chain');
		await expect((await request(type, undefined, [])).verifyJwtSession(key)).rejects.toThrow(
			'chain',
		);
		await expect(
			(await request(type, undefined, ['sui:devnet'])).verifyJwtSession(key),
		).resolves.toBeTruthy();
	},
);
