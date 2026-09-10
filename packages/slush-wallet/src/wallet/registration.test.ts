// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const registry = vi.hoisted(() => ({ get: vi.fn(), register: vi.fn(), on: vi.fn() }));
vi.mock('@mysten/wallet-standard', async (original) => ({
	...(await original<typeof import('@mysten/wallet-standard')>()),
	getWallets: () => registry,
}));

import { registerSlushWallet, SlushWallet } from './index.js';

const metadata = {
	id: 'slush',
	walletName: 'Slush',
	icon: 'data:image/png;base64,',
	enabled: true,
};
const extension = { id: 'com.mystenlabs.suiwallet' };
let browser: EventTarget;
let registered: (wallet: typeof extension) => void;
let finishMetadata: (value: Response) => void;
const unregisterWallet = vi.fn();
const stopRegistration = vi.fn();
const readSession = vi.fn(() => null);

beforeEach(() => {
	vi.clearAllMocks();
	browser = new EventTarget();
	vi.stubGlobal('window', browser);
	vi.stubGlobal('localStorage', { getItem: readSession });
	vi.stubGlobal(
		'fetch',
		vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					finishMetadata = resolve;
				}),
		),
	);
	registry.get.mockReturnValue([]);
	registry.register.mockReturnValue(unregisterWallet);
	registry.on.mockImplementation((_event, handler) => {
		registered = handler;
		return stopRegistration;
	});
});
afterEach(() => vi.unstubAllGlobals());

function storageChanged() {
	browser.dispatchEvent(
		Object.assign(new Event('storage'), { key: 'slush:session', storageArea: localStorage }),
	);
}

it.each(['explicit', 'extension', 'disabled metadata'] as const)(
	'releases listeners when registration ends via %s',
	async (reason) => {
		const result = registerSlushWallet('test')!;
		const changed = vi.fn();
		result.wallet.features['standard:events'].on('change', changed);
		storageChanged();
		expect(changed).toHaveBeenCalledTimes(1);
		changed.mockClear();
		if (reason === 'explicit') result.unregister();
		else if (reason === 'extension') registered(extension);
		else {
			finishMetadata(new Response(JSON.stringify({ ...metadata, enabled: false })));
			await vi.waitFor(() => expect(unregisterWallet).toHaveBeenCalledTimes(1));
		}
		result.unregister();
		readSession.mockClear();
		storageChanged();
		expect(readSession).not.toHaveBeenCalled();
		expect(changed).not.toHaveBeenCalled();
		expect(unregisterWallet).toHaveBeenCalledTimes(1);
		expect(stopRegistration).toHaveBeenCalledTimes(1);
	},
);

it('does not subscribe when an extension is already registered', () => {
	registry.get.mockReturnValue([extension]);
	expect(registerSlushWallet('test')).toBeUndefined();
	expect(registry.on).not.toHaveBeenCalled();
});

it('does not update a retired wallet when metadata arrives late', async () => {
	const result = registerSlushWallet('test')!;
	const update = vi.spyOn(result.wallet, 'updateMetadata');
	const json = vi.fn().mockResolvedValue(metadata);
	result.unregister();
	finishMetadata({ ok: true, json } as unknown as Response);
	await vi.waitFor(() => expect(json).toHaveBeenCalledTimes(1));
	expect(update).not.toHaveBeenCalled();
});

it('lets directly constructed wallets release their storage listener idempotently', () => {
	const wallet = new SlushWallet({ name: 'test', metadata });
	wallet.dispose();
	wallet.dispose();
	readSession.mockClear();
	storageChanged();
	expect(readSession).not.toHaveBeenCalled();
});
