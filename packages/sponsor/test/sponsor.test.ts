// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction, TransactionDataBuilder } from '@mysten/sui/transactions';
import { normalizeSuiAddress, toBase58, toBase64 } from '@mysten/sui/utils';
import { verifyTransactionSignature } from '@mysten/sui/verify';
import { describe, expect, it } from 'vitest';

import { createSponsor } from '../src/sponsor.js';
import type { SignTransactionResult, SponsoredTransaction } from '../src/sponsor.js';
import { gasBudget, senderIsNotSponsor } from '../src/validators.js';

/** Narrow a sign result to the `Signed` variant, failing the test otherwise. */
function signed(result: SignTransactionResult): SponsoredTransaction {
	if (result.$kind !== 'Signed') {
		throw new Error(`Expected a signed result, got: ${JSON.stringify(result)}`);
	}
	return result;
}

const fakeGasPayment = [
	{
		objectId: '1'.padEnd(64, '0'),
		version: '1',
		digest: toBase58(new Uint8Array(32).fill(7)),
	},
];

// These tests exercise build + signing with an offline validator, so they never
// trigger the (network-backed) analysis phase and can use an empty client.
const offline = { validate: [senderIsNotSponsor()] };

/** A fully-resolved transaction that builds without a client. */
function resolvedTransaction({ sender, sponsor }: { sender: string; sponsor: string }) {
	const tx = new Transaction();
	tx.setSender(sender);
	tx.setGasOwner(sponsor);
	tx.setGasBudget(2_000_000n);
	tx.setGasPrice(1000n);
	tx.setGasPayment(fakeGasPayment);
	// Budget, price, payment, and an expiration are all set, so the build resolves
	// offline (no client) even though `signTransaction` switches to empty payment.
	tx.setExpiration({ Epoch: 100 });
	tx.moveCall({ target: '0x2::foo::bar', arguments: [tx.pure.u64(1n)] });
	return tx;
}

describe('Sponsor.signTransaction', () => {
	it('validates and produces a verifiable sponsor signature', async () => {
		const sponsorKey = new Ed25519Keypair();
		const sender = new Ed25519Keypair().toSuiAddress();
		const tx = resolvedTransaction({ sender, sponsor: sponsorKey.toSuiAddress() });

		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			...offline,
		});
		const result = signed(await sponsor.signTransaction({ transaction: tx }));

		expect(result.signatures).toBeUndefined();
		expect(result.digest).toBe(TransactionDataBuilder.getDigestFromBytes(result.bytes));

		const pk = await verifyTransactionSignature(result.bytes, result.sponsorSignature, {
			address: sponsor.address,
		});
		expect(normalizeSuiAddress(pk.toSuiAddress())).toBe(sponsor.address);
	});

	it('co-signs a user-signed transaction and returns both signatures', async () => {
		const sponsorKey = new Ed25519Keypair();
		const senderKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const bytes = await tx.build();
		const { signature: userSignature } = await senderKey.signTransaction(bytes);

		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			...offline,
		});
		const result = signed(await sponsor.signTransaction({ transaction: bytes, userSignature }));

		expect(result.signatures).toEqual([userSignature, result.sponsorSignature]);
	});

	it('returns a Rejected result when sender equals sponsor', async () => {
		const sponsorKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: sponsorKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});

		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			...offline,
		});
		const result = await sponsor.signTransaction({ transaction: tx });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toContain('SENDER_IS_SPONSOR');
		}
	});

	it('accepts base64 bytes with a user signature', async () => {
		const sponsorKey = new Ed25519Keypair();
		const senderKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const bytes = await tx.build();
		const { signature: userSignature } = await senderKey.signTransaction(bytes);

		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			...offline,
		});
		const result = signed(
			await sponsor.signTransaction({ transaction: toBase64(bytes), userSignature }),
		);

		expect(result.signatures).toEqual([userSignature, result.sponsorSignature]);
	});

	it('runs additional validators (gas budget bounds)', async () => {
		const sponsorKey = new Ed25519Keypair();
		const senderKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});

		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [gasBudget({ max: 1n })],
		});

		const result = await sponsor.signTransaction({ transaction: tx });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toContain('GAS_BUDGET_TOO_HIGH');
		}
	});
});
