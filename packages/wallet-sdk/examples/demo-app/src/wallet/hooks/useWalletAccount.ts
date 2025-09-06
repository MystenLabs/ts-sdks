// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { saveToStorage, loadFromStorage } from '../utils/storage.js';
import { getAccountAvatarUrl } from '../constants/icons.js';

const ACCOUNTS_STORAGE_KEY = 'wallet-accounts';
const ACTIVE_ACCOUNT_KEY = 'active-account-index';

interface StoredAccount {
	secretKey: string;
	label: string;
}

export function useWalletAccount() {
	const [accounts, setAccounts] = useState<ReadonlyWalletAccount[]>([]);
	const [keypairs, setKeypairs] = useState<Ed25519Keypair[]>([]);
	const [activeAccountIndex, setActiveAccountIndex] = useState(0);

	const createAccountObject = (kp: Ed25519Keypair, label: string) => {
		const address = kp.toSuiAddress();
		return new ReadonlyWalletAccount({
			address,
			publicKey: kp.getPublicKey().toRawBytes(),
			chains: ['sui:testnet', 'sui:mainnet', 'sui:devnet'],
			features: ['sui:signAndExecuteTransaction', 'sui:signTransaction', 'sui:signPersonalMessage'],
			label,
			icon: getAccountAvatarUrl(address) as any,
		});
	};

	useEffect(() => {
		// Load accounts from storage or create default
		const storedAccountsStr = loadFromStorage(ACCOUNTS_STORAGE_KEY) as string | null;
		const storedActiveIndexStr = loadFromStorage(ACTIVE_ACCOUNT_KEY) as string | null;

		if (storedAccountsStr) {
			const storedAccounts: StoredAccount[] = JSON.parse(storedAccountsStr);
			const storedActiveIndex = storedActiveIndexStr ? parseInt(storedActiveIndexStr, 10) : 0;

			const kps = storedAccounts.map((stored) => Ed25519Keypair.fromSecretKey(stored.secretKey));
			const accs = storedAccounts.map((stored, index) =>
				createAccountObject(kps[index], stored.label),
			);

			setKeypairs(kps);
			setAccounts(accs);
			setActiveAccountIndex(Math.min(storedActiveIndex, accs.length - 1));
		} else {
			// Create first account
			const kp = new Ed25519Keypair();
			const acc = createAccountObject(kp, 'Account 1');

			const storedAccounts: StoredAccount[] = [
				{
					secretKey: kp.getSecretKey(),
					label: 'Account 1',
				},
			];

			saveToStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(storedAccounts));
			saveToStorage(ACTIVE_ACCOUNT_KEY, '0');

			setKeypairs([kp]);
			setAccounts([acc]);
			setActiveAccountIndex(0);
		}
	}, []);

	const addAccount = () => {
		const kp = new Ed25519Keypair();
		const accountNumber = accounts.length + 1;
		const label = `Account ${accountNumber}`;
		const acc = createAccountObject(kp, label);

		const newKeypairs = [...keypairs, kp];
		const newAccounts = [...accounts, acc];

		const storedAccounts: StoredAccount[] = newKeypairs.map((keypair, index) => ({
			secretKey: keypair.getSecretKey(),
			label: newAccounts[index].label || `Account ${index + 1}`,
		}));

		saveToStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(storedAccounts));

		setKeypairs(newKeypairs);
		setAccounts(newAccounts);
		setActiveAccountIndex(newAccounts.length - 1);
		saveToStorage(ACTIVE_ACCOUNT_KEY, (newAccounts.length - 1).toString());
	};

	const removeAccount = (index: number) => {
		if (accounts.length <= 1) return; // Don't allow removing the last account

		const newKeypairs = keypairs.filter((_, i) => i !== index);
		const newAccounts = accounts.filter((_, i) => i !== index);

		const storedAccounts: StoredAccount[] = newKeypairs.map((kp, i) => ({
			secretKey: kp.getSecretKey(),
			label: newAccounts[i].label || `Account ${i + 1}`,
		}));

		saveToStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(storedAccounts));

		setKeypairs(newKeypairs);
		setAccounts(newAccounts);

		// Adjust active account index
		const newActiveIndex =
			activeAccountIndex >= newAccounts.length
				? newAccounts.length - 1
				: activeAccountIndex > index
					? activeAccountIndex - 1
					: activeAccountIndex;

		setActiveAccountIndex(newActiveIndex);
		saveToStorage(ACTIVE_ACCOUNT_KEY, newActiveIndex.toString());
	};

	const switchAccount = (index: number) => {
		if (index >= 0 && index < accounts.length) {
			setActiveAccountIndex(index);
			saveToStorage(ACTIVE_ACCOUNT_KEY, index.toString());
		}
	};

	const renameAccount = (index: number, newLabel: string) => {
		if (index >= 0 && index < accounts.length) {
			const newKeypairs = [...keypairs];
			const newAccounts = accounts.map((account, i) =>
				i === index
					? new ReadonlyWalletAccount({
							address: account.address,
							publicKey: account.publicKey,
							chains: account.chains,
							features: account.features,
							label: newLabel,
							icon: getAccountAvatarUrl(account.address) as any,
						})
					: account,
			);

			const storedAccounts: StoredAccount[] = newKeypairs.map((keypair, i) => ({
				secretKey: keypair.getSecretKey(),
				label: newAccounts[i].label || `Account ${i + 1}`,
			}));

			saveToStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(storedAccounts));
			setAccounts(newAccounts);
		}
	};

	return {
		accounts,
		keypairs,
		activeAccount: accounts[activeAccountIndex] || null,
		activeKeypair: keypairs[activeAccountIndex] || null,
		activeAccountIndex,
		addAccount,
		removeAccount,
		switchAccount,
		renameAccount,
	};
}
