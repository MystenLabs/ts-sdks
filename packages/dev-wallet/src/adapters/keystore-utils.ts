// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Signer } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64 } from '@mysten/sui/utils';

export const DEFAULT_KEYSTORE_PATH = join(homedir(), '.sui', 'sui_config', 'sui.keystore');

/** A parsed entry from a Sui keystore file. */
export interface KeystoreEntry {
	address: string;
	signer: Signer;
	publicKey: Uint8Array;
	scheme: 'ed25519' | 'secp256k1' | 'secp256r1';
}

/**
 * Parse a Sui keystore file and return all valid entries.
 * Skips entries with unknown key schemes or malformed data.
 */
export async function parseKeystoreFile(keystorePath: string): Promise<KeystoreEntry[]> {
	const content = await readFile(keystorePath, 'utf-8');
	const keys: string[] = JSON.parse(content);
	const entries: KeystoreEntry[] = [];
	const seenAddresses = new Set<string>();

	for (const base64Key of keys) {
		let signer: Signer;
		let scheme: KeystoreEntry['scheme'];
		try {
			const bytes = fromBase64(base64Key);
			const flag = bytes[0];
			const secretKey = bytes.slice(1);

			switch (flag) {
				case 0x00:
					signer = Ed25519Keypair.fromSecretKey(secretKey);
					scheme = 'ed25519';
					break;
				case 0x01:
					signer = Secp256k1Keypair.fromSecretKey(secretKey);
					scheme = 'secp256k1';
					break;
				case 0x02:
					signer = Secp256r1Keypair.fromSecretKey(secretKey);
					scheme = 'secp256r1';
					break;
				default:
					continue;
			}
		} catch {
			continue;
		}

		const address = signer.toSuiAddress();
		if (seenAddresses.has(address)) {
			continue;
		}
		seenAddresses.add(address);

		entries.push({
			address,
			signer,
			publicKey: signer.getPublicKey().toSuiBytes(),
			scheme,
		});
	}

	return entries;
}
