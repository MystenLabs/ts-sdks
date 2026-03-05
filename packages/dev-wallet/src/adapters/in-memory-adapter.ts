// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import type { CreateAccountOptions, ImportAccountOptions, ManagedAccount } from '../types.js';
import { BaseSignerAdapter } from './base-adapter.js';
import { buildManagedAccount } from './build-managed-account.js';

export class InMemorySignerAdapter extends BaseSignerAdapter {
	readonly id = 'in-memory';
	readonly name = 'In-Memory Signer';

	async initialize(): Promise<void> {
		// No-op for in-memory adapter
	}

	async createAccount(options?: CreateAccountOptions): Promise<ManagedAccount> {
		const keypair = new Ed25519Keypair();
		const address = keypair.getPublicKey().toSuiAddress();
		const label = options?.label ?? this.getDefaultLabel();

		const managedAccount = buildManagedAccount(keypair, address, label);
		this.addAccount(managedAccount);
		return managedAccount;
	}

	async importAccount(options: ImportAccountOptions): Promise<ManagedAccount> {
		const signer = options.signer;
		if (!signer) {
			throw new Error('In-memory adapter requires a signer to import');
		}
		const address = signer.toSuiAddress();

		const existing = this.getAccount(address);
		if (existing) return existing;

		const label = options.label ?? this.getDefaultLabel();
		const managedAccount = buildManagedAccount(signer, address, label);
		this.addAccount(managedAccount);
		return managedAccount;
	}

	async renameAccount(address: string, label: string): Promise<boolean> {
		return this._performRename(address, label);
	}

	async removeAccount(address: string): Promise<boolean> {
		return this.removeAccountByAddress(address);
	}
}
