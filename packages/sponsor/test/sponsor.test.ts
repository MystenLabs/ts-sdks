// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction, TransactionDataBuilder } from '@mysten/sui/transactions';
import { normalizeSuiAddress, toBase58, toBase64 } from '@mysten/sui/utils';
import { verifyTransactionSignature } from '@mysten/sui/verify';
import { describe, expect, it } from 'vitest';

import { analyze, createAnalyzer } from '../src/index.js';
import type { Validator } from '../src/index.js';
import { createSponsor } from '../src/sponsor.js';
import type { SignTransactionResult, SponsoredTransaction } from '../src/sponsor.js';
import { gasBudget, senderIsNotSponsor, simulationSucceeds } from '../src/validators.js';

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

describe('Sponsor.signTransaction — analyzer behavior', () => {
	function txFor(sponsorKey: Ed25519Keypair) {
		return resolvedTransaction({
			sender: new Ed25519Keypair().toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
	}

	it('maps a thrown validator error to ANALYSIS_FAILED', async () => {
		const sponsorKey = new Ed25519Keypair();
		// A degenerate stub: it only ever throws, so it has no `result` branch for `T`
		// to infer from — a real validator always has one. Cast to mark it a stub.
		const boom = createAnalyzer({
			analyze: () => () => {
				throw new Error('lookup failed');
			},
		}) as Validator;
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [boom],
		});

		const result = await sponsor.signTransaction({ transaction: txFor(sponsorKey) });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') expect(result.reason).toBe('ANALYSIS_FAILED');
	});

	it('maps a validator that returns { issues } to ANALYSIS_FAILED', async () => {
		const sponsorKey = new Ed25519Keypair();
		// Reports via the framework's `issues` channel only (no `result` branch) — the
		// "couldn't analyze" signal. Cast to mark it a stub (a real validator has both).
		const cantCheck = createAnalyzer({
			analyze: () => () => ({ issues: [{ message: 'service down' }] }),
		}) as Validator;
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [cantCheck],
		});

		const result = await sponsor.signTransaction({ transaction: txFor(sponsorKey) });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.reason).toBe('ANALYSIS_FAILED');
			expect(result.issues.map((issue) => issue.message)).toContain('service down');
		}
	});

	it('aggregates issues from every rejecting validator (POLICY_REJECTED)', async () => {
		const sponsorKey = new Ed25519Keypair();
		// sender == sponsor AND budget over the max → both validators reject.
		const tx = resolvedTransaction({
			sender: sponsorKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [senderIsNotSponsor(), gasBudget({ max: 1n })],
		});

		const result = await sponsor.signTransaction({ transaction: tx });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			const codes = result.issues.map((issue) => issue.code);
			expect(codes).toContain('SENDER_IS_SPONSOR');
			expect(codes).toContain('GAS_BUDGET_TOO_HIGH');
			expect(result.reason).toBe('POLICY_REJECTED');
		}
	});

	it('threads request-scoped `validationOptions` to validators', async () => {
		const sponsorKey = new Ed25519Keypair();
		const requiresToken = createAnalyzer({
			analyze: (options: { token: string }) => () =>
				options.token === 'ok'
					? { result: null }
					: { result: [{ code: 'BAD_TOKEN', message: 'bad token' }] },
		});
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [requiresToken],
		});

		const rejected = await sponsor.signTransaction({
			transaction: txFor(sponsorKey),
			validationOptions: { token: 'no' },
		});
		expect(rejected.$kind).toBe('Rejected');
		if (rejected.$kind === 'Rejected') {
			expect(rejected.issues.map((issue) => issue.code)).toContain('BAD_TOKEN');
		}

		const ok = await sponsor.signTransaction({
			transaction: txFor(sponsorKey),
			validationOptions: { token: 'ok' },
		});
		expect(ok.$kind).toBe('Signed');
	});
});

describe('Sponsor.analyzer', () => {
	it('is a stable instance and dedupes a shared dependency in a host graph', async () => {
		const sponsorKey = new Ed25519Keypair();
		let probeRuns = 0;
		const probe = createAnalyzer({
			cacheKey: 'test:probe',
			analyze: () => () => {
				probeRuns += 1;
				return { result: 1 };
			},
		});
		const usesProbe = createAnalyzer({
			dependencies: { probe },
			analyze:
				() =>
				({ probe }) =>
					probe > 0 ? { result: null } : { result: [{ message: 'no' }] },
		});
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [usesProbe],
		});

		// Memoized — a stable identity is what lets the framework dedupe it.
		expect(sponsor.analyzer).toBe(sponsor.analyzer);

		// Compose into a host graph that also depends on `probe` → it resolves once.
		const analysis = await analyze({ check: sponsor.analyzer, probe }, {
			transaction: await resolvedTransaction({
				sender: new Ed25519Keypair().toSuiAddress(),
				sponsor: sponsorKey.toSuiAddress(),
			}).build(),
			client: {} as ClientWithCoreApi,
		} as never);

		expect(probeRuns).toBe(1);
		expect(analysis.check.result).toBeNull();
	});
});

describe('Sponsor — untrusted validationOptions', () => {
	it('ignores an injected `transaction` (validates the real, signed tx)', async () => {
		const sponsorKey = new Ed25519Keypair();
		const realTx = resolvedTransaction({
			sender: new Ed25519Keypair().toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		// A tx that WOULD be rejected (sender == sponsor), supplied by a malicious caller.
		const evilBytes = await resolvedTransaction({
			sender: sponsorKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			...offline,
		});

		// `as never` simulates an untrusted / `as any` caller passing a reserved key.
		const result = await sponsor.signTransaction({
			transaction: realTx,
			validationOptions: { transaction: evilBytes },
		} as never);
		expect(result.$kind).toBe('Signed'); // analyzed realTx (sender != sponsor), not evilBytes
	});

	it('strips an injected `transactionResponse` (no forged dry-run)', async () => {
		const sponsorKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: new Ed25519Keypair().toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [simulationSucceeds()],
		});

		const result = await sponsor.signTransaction({
			transaction: tx,
			validationOptions: { transactionResponse: { effects: { status: { success: true } } } },
		} as never);
		// Stripped → the real simulation runs (and fails with an empty client) →
		// ANALYSIS_FAILED, not a forged Signed.
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') expect(result.reason).toBe('ANALYSIS_FAILED');
	});
});

describe('Sponsor multi-signer', () => {
	it('assembles every user signature plus the sponsor signature, in order', async () => {
		const sponsorKey = new Ed25519Keypair();
		const senderKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const bytes = await tx.build();
		const { signature: userSignature } = await senderKey.signTransaction(bytes);
		const second = `${userSignature}`; // a second required signer's signature

		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			...offline,
		});
		const result = signed(
			await sponsor.signTransaction({ transaction: bytes, userSignature: [userSignature, second] }),
		);

		expect(result.signatures).toEqual([userSignature, second, result.sponsorSignature]);
	});
});
