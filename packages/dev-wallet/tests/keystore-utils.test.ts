// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { toBase64 } from '@mysten/sui/utils';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

import { parseKeystoreFile } from '../src/adapters/keystore-utils.js';

/**
 * Build a Sui keystore entry: flag byte + secret key bytes, base64-encoded.
 * Ed25519 secret key = 32 bytes, Secp256k1/r1 = 32 bytes.
 */
function makeKeystoreEntry(
	flag: number,
	secretKeyLength = 32,
): {
	b64: string;
	signer: ReturnType<typeof Ed25519Keypair.fromSecretKey>;
} {
	const secretKey = randomBytes(secretKeyLength);
	const withFlag = new Uint8Array(1 + secretKey.length);
	withFlag[0] = flag;
	withFlag.set(secretKey, 1);

	// Also create the keypair so we can verify the address matches
	let signer: any;
	switch (flag) {
		case 0x00:
			signer = Ed25519Keypair.fromSecretKey(secretKey);
			break;
		case 0x01:
			signer = Secp256k1Keypair.fromSecretKey(secretKey);
			break;
		case 0x02:
			signer = Secp256r1Keypair.fromSecretKey(secretKey);
			break;
	}

	return { b64: toBase64(withFlag), signer };
}

describe('parseKeystoreFile', () => {
	const testDir = join(tmpdir(), `dev-wallet-keystore-test-${Date.now()}`);
	let fileCounter = 0;

	async function writeKeystore(keys: string[]): Promise<string> {
		await mkdir(testDir, { recursive: true });
		const path = join(testDir, `sui-${fileCounter++}.keystore`);
		await writeFile(path, JSON.stringify(keys));
		return path;
	}

	it('parses an ed25519 entry', async () => {
		const { b64, signer } = makeKeystoreEntry(0x00);
		const path = await writeKeystore([b64]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toHaveLength(1);
		expect(entries[0].scheme).toBe('ed25519');
		expect(entries[0].address).toBe(signer.toSuiAddress());
	});

	it('parses a secp256k1 entry', async () => {
		const { b64 } = makeKeystoreEntry(0x01);
		const path = await writeKeystore([b64]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toHaveLength(1);
		expect(entries[0].scheme).toBe('secp256k1');
	});

	it('parses a secp256r1 entry', async () => {
		const { b64 } = makeKeystoreEntry(0x02);
		const path = await writeKeystore([b64]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toHaveLength(1);
		expect(entries[0].scheme).toBe('secp256r1');
	});

	it('skips malformed entries', async () => {
		const { b64: valid } = makeKeystoreEntry(0x00);
		// Unknown flag 0xff should be skipped
		const unknownFlag = toBase64(new Uint8Array([0xff, ...randomBytes(32)]));
		const path = await writeKeystore([valid, unknownFlag]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toHaveLength(1);
	});

	it('returns empty array for empty keystore', async () => {
		const path = await writeKeystore([]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toEqual([]);
	});

	it('deduplicates entries by address', async () => {
		const { b64 } = makeKeystoreEntry(0x00);
		const path = await writeKeystore([b64, b64]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toHaveLength(1);
	});

	it('parses mixed key schemes', async () => {
		const ed = makeKeystoreEntry(0x00);
		const secp = makeKeystoreEntry(0x01);
		const r1 = makeKeystoreEntry(0x02);
		const path = await writeKeystore([ed.b64, secp.b64, r1.b64]);
		const entries = await parseKeystoreFile(path);
		expect(entries).toHaveLength(3);
		expect(entries.map((e) => e.scheme)).toEqual(['ed25519', 'secp256k1', 'secp256r1']);
	});
});
