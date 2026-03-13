// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ManagedAccount, SignerAdapter } from '../types.js';
import { buildManagedAccount } from './build-managed-account.js';

/**
 * Abstract base class implementing the shared boilerplate of {@link SignerAdapter}.
 *
 * Subclasses only need to implement `initialize()`, `id`, and `name`.
 * All account list management, listener notification, and cleanup are handled here.
 */
export abstract class BaseSignerAdapter implements SignerAdapter {
	abstract readonly id: string;
	abstract readonly name: string;
	readonly allowAutoSign: boolean = true;

	#accounts: ManagedAccount[] = [];
	#listeners = new Set<(accounts: ManagedAccount[]) => void>();

	abstract initialize(): Promise<void>;

	getAccounts(): ManagedAccount[] {
		return [...this.#accounts];
	}

	getAccount(address: string): ManagedAccount | undefined {
		return this.#accounts.find((account) => account.address === address);
	}

	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void {
		this.#listeners.add(callback);
		return () => {
			this.#listeners.delete(callback);
		};
	}

	destroy(): void {
		this.#accounts = [];
		this.#listeners.clear();
	}

	// ── Protected helpers for subclasses ─────────────────────────────────────

	protected get _accounts(): readonly ManagedAccount[] {
		return this.#accounts;
	}

	protected setInitialAccounts(accounts: ManagedAccount[]): void {
		this.#accounts = accounts;
		this.notifyListeners();
	}

	protected addAccount(account: ManagedAccount): void {
		this.#accounts.push(account);
		this.notifyListeners();
	}

	protected removeAccountByAddress(address: string): boolean {
		const index = this.#accounts.findIndex((a) => a.address === address);
		if (index === -1) return false;
		this.#accounts.splice(index, 1);
		this.notifyListeners();
		return true;
	}

	/** Replace an account by address (e.g. after rename). */
	protected replaceAccount(address: string, account: ManagedAccount): boolean {
		const index = this.#accounts.findIndex((a) => a.address === address);
		if (index === -1) return false;
		this.#accounts[index] = account;
		this.notifyListeners();
		return true;
	}

	/** Rename an account by rebuilding its ManagedAccount with a new label. */
	protected _performRename(address: string, label: string): boolean {
		const account = this.getAccount(address);
		if (!account) return false;
		return this.replaceAccount(address, buildManagedAccount(account.signer, address, label));
	}

	protected getDefaultLabel(): string {
		return `Account ${this.getAccounts().length + 1}`;
	}

	protected notifyListeners(): void {
		const accounts = this.getAccounts();
		for (const listener of this.#listeners) {
			listener(accounts);
		}
	}
}
