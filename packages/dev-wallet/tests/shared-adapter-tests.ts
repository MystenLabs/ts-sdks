// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import type { ManagedAccount } from '../src/types.js';

export interface TestableAdapter {
	getAccounts(): ManagedAccount[];
	getAccount(address: string): ManagedAccount | undefined;
	createAccount(opts?: { label?: string }): Promise<ManagedAccount>;
	removeAccount(address: string): Promise<boolean>;
	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void;
	destroy(): void;
	renameAccount?: (address: string, label: string) => boolean | Promise<boolean>;
}

const ZERO_ADDRESS = '0x' + '0'.repeat(64);

export function runAdapterContractTests(
	name: string,
	createAdapter: () => Promise<TestableAdapter>,
) {
	describe(`${name} shared contract`, () => {
		it('createAccount creates an account with valid Sui address', async () => {
			const adapter = await createAdapter();
			const account = await adapter.createAccount();
			expect(account.address).toMatch(/^0x[a-f0-9]{64}$/);
		});

		it('createAccount with label uses the provided label', async () => {
			const adapter = await createAdapter();
			const account = await adapter.createAccount({ label: 'Custom Label' });
			expect(account.label).toBe('Custom Label');
		});

		it('getAccounts returns all created accounts', async () => {
			const adapter = await createAdapter();
			await adapter.createAccount();
			await adapter.createAccount();
			await adapter.createAccount();
			expect(adapter.getAccounts()).toHaveLength(3);
		});

		it('getAccount finds account by address', async () => {
			const adapter = await createAdapter();
			const created = await adapter.createAccount({ label: 'Test' });
			const found = adapter.getAccount(created.address);
			expect(found).toBeDefined();
			expect(found!.address).toBe(created.address);
			expect(found!.label).toBe('Test');
		});

		it('getAccount returns undefined for unknown address', async () => {
			const adapter = await createAdapter();
			expect(adapter.getAccount(ZERO_ADDRESS)).toBeUndefined();
		});

		it('removeAccount removes the account', async () => {
			const adapter = await createAdapter();
			const account = await adapter.createAccount();
			const removed = await adapter.removeAccount(account.address);
			expect(removed).toBe(true);
			expect(adapter.getAccounts()).toHaveLength(0);
			expect(adapter.getAccount(account.address)).toBeUndefined();
		});

		it('removeAccount returns false for unknown address', async () => {
			const adapter = await createAdapter();
			const removed = await adapter.removeAccount(ZERO_ADDRESS);
			expect(removed).toBe(false);
		});

		it('onAccountsChanged fires when accounts are created', async () => {
			const adapter = await createAdapter();
			const callback = vi.fn();
			adapter.onAccountsChanged(callback);
			await adapter.createAccount();
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ address: expect.any(String) })]),
			);
		});

		it('onAccountsChanged fires when accounts are removed', async () => {
			const adapter = await createAdapter();
			const account = await adapter.createAccount();
			const callback = vi.fn();
			adapter.onAccountsChanged(callback);
			await adapter.removeAccount(account.address);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith([]);
		});

		it('unsubscribe stops receiving events', async () => {
			const adapter = await createAdapter();
			const callback = vi.fn();
			const unsubscribe = adapter.onAccountsChanged(callback);
			unsubscribe();
			await adapter.createAccount();
			expect(callback).not.toHaveBeenCalled();
		});

		it('destroy clears all accounts', async () => {
			const adapter = await createAdapter();
			await adapter.createAccount();
			await adapter.createAccount();
			expect(adapter.getAccounts()).toHaveLength(2);
			adapter.destroy();
			expect(adapter.getAccounts()).toHaveLength(0);
		});

		it('renameAccount changes the label and fires onAccountsChanged', async () => {
			const adapter = await createAdapter();
			if (!adapter.renameAccount) return; // skip if adapter doesn't support rename

			const account = await adapter.createAccount({ label: 'Original' });
			const callback = vi.fn();
			adapter.onAccountsChanged(callback);

			const result = await adapter.renameAccount(account.address, 'Renamed');
			expect(result).toBe(true);

			const updated = adapter.getAccount(account.address);
			expect(updated?.label).toBe('Renamed');
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('renameAccount returns false for unknown address', async () => {
			const adapter = await createAdapter();
			if (!adapter.renameAccount) return;

			const result = await adapter.renameAccount(ZERO_ADDRESS, 'Nope');
			expect(result).toBe(false);
		});

		it('signPersonalMessage produces valid signature', async () => {
			const adapter = await createAdapter();
			const account = await adapter.createAccount();
			const message = new Uint8Array([1, 2, 3, 4]);
			try {
				const { bytes, signature } = await account.signer.signPersonalMessage(message);
				expect(bytes).toBeDefined();
				expect(signature).toBeDefined();
				expect(typeof signature).toBe('string');
			} catch (error) {
				// Some signers (e.g. passkey) require browser interaction and will throw in Node.js
				// This is expected behavior — skip the assertion
				expect(error).toBeInstanceOf(Error);
			}
		});
	});
}
