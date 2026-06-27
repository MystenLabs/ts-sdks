// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction, TransactionDataBuilder } from '@mysten/sui/transactions';
import { normalizeSuiAddress, toBase58, toBase64 } from '@mysten/sui/utils';
import { verifyTransactionSignature } from '@mysten/sui/verify';
import { describe, expect, it } from 'vitest';

import { analyze, createAnalyzer } from '../src/index.js';
import type { Validator } from '../src/index.js';
import { assertSponsorable, createSponsor } from '../src/sponsor.js';
import type { SignTransactionResult, SponsoredTransaction } from '../src/sponsor.js';
import {
	gasBudget,
	onlySenderWithdrawals,
	validSender,
	simulationSucceeds,
	userSignatureMatchesSender,
} from '../src/validators.js';

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
const offline = { validate: [validSender()] };

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
			validate: [validSender(), gasBudget({ max: 1n })],
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

	it('preserves policy rejections when an independent validator cannot analyze', async () => {
		const sponsorKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: sponsorKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const cantCheck = createAnalyzer({
			analyze: () => () => ({ issues: [{ message: 'service down' }] }),
		}) as Validator;
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [validSender(), cantCheck],
		});

		const result = await sponsor.signTransaction({ transaction: tx });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.reason).toBe('ANALYSIS_FAILED');
			expect(result.policyIssues.map((issue) => issue.code)).toEqual(['SENDER_IS_SPONSOR']);
			expect(result.analysisIssues.map((issue) => issue.message)).toEqual(['service down']);
			expect(result.issues.map((issue) => issue.code)).toContain('SENDER_IS_SPONSOR');
			expect(result.issues.map((issue) => issue.message)).toContain('service down');
		}
	});

	it('fails closed when a validator could not run but surfaced no issue', async () => {
		const sponsorKey = new Ed25519Keypair();
		// Degenerate "couldn't analyze" with an EMPTY issues array: status `failed`,
		// no `result`, no message. Must still reject — never sign on a non-running validator.
		const cantCheck = createAnalyzer({
			analyze: () => () => ({ issues: [] }),
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
			expect(result.analysisIssues.map((issue) => issue.code)).toEqual(['ANALYSIS_FAILED']);
		}
	});

	it('fails closed when a validator is skipped by an empty-issues required dependency', async () => {
		const sponsorKey = new Ed25519Keypair();
		// A required dependency that fails with an EMPTY issues array → the validator
		// is `skipped` with `issues: []`. The aggregate must still reject.
		const silentlyFailingDep = createAnalyzer({
			cacheKey: 'test:silent-failing-dep',
			analyze: () => () => ({ issues: [] }),
		});
		const skippedValidator = createAnalyzer({
			dependencies: { silentlyFailingDep },
			analyze:
				() =>
				({ silentlyFailingDep }) => ({ result: silentlyFailingDep ? null : null }),
		}) as Validator;
		const sponsor = createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [skippedValidator],
		});

		const result = await sponsor.signTransaction({ transaction: txFor(sponsorKey) });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.reason).toBe('ANALYSIS_FAILED');
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

describe('Sponsor.signAndExecuteTransaction', () => {
	it('returns custom result fields (events) requested via `include`, with effects forced on', async () => {
		const sponsorKey = new Ed25519Keypair();
		const senderKey = new Ed25519Keypair();
		const tx = resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const bytes = await tx.build();
		const { signature: userSignature } = await senderKey.signTransaction(bytes);

		const events: SuiClientTypes.Event[] = [
			{
				packageId: normalizeSuiAddress('0x2'),
				module: 'foo',
				sender: senderKey.toSuiAddress(),
				eventType: '0x2::foo::Bar',
				bcs: new Uint8Array([1, 2, 3]),
				json: { value: 1 },
			},
		];

		// Capture what the sponsor forwards to the core execute call.
		let executeArgs: { include?: unknown; signatures?: string[] } | undefined;
		const client = {
			core: {
				executeTransaction: async (options: { include?: unknown; signatures?: string[] }) => {
					executeArgs = options;
					return { $kind: 'Transaction', Transaction: { digest: 'digest', events } };
				},
			},
		} as unknown as ClientWithCoreApi;

		const sponsor = createSponsor({ signer: sponsorKey, client, validate: [validSender()] });
		const result = await sponsor.signAndExecuteTransaction({
			transaction: bytes,
			userSignature,
			include: { events: true },
		});

		expect(result.$kind).toBe('Transaction');
		if (result.$kind === 'Transaction') {
			// `events` is typed `Event[]` (combined with the forced `effects`) — no cast.
			const got: SuiClientTypes.Event[] = result.Transaction.events;
			expect(got).toEqual(events);
		}
		// The requested `events` is merged with the always-on `effects`, and the
		// user + sponsor signatures are both forwarded for execution (Ed25519 signing
		// is deterministic, so the sponsor signature is reproducible here).
		const { signature: sponsorSignature } = await sponsorKey.signTransaction(bytes);
		expect(executeArgs?.include).toEqual({ events: true, effects: true });
		expect(executeArgs?.signatures).toEqual([userSignature, sponsorSignature]);
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

describe('offline-only validation (no client calls)', () => {
	const sponsorKey = new Ed25519Keypair();
	const sponsorAddr = normalizeSuiAddress(sponsorKey.toSuiAddress());
	const sender = new Ed25519Keypair().toSuiAddress();

	// A fully-resolved transaction carrying one `FundsWithdrawal` input, built
	// entirely offline (`client: {}` would throw on any RPC). The public builder
	// only emits `withdrawFrom: Sender`; for the `Sponsor` case we rewrite the
	// serialized bytes directly — modelling hand-crafted bytes from an untrusted
	// client, the only way a sponsor withdrawal can actually reach the validator.
	async function withdrawalBytes(from: 'Sender' | 'Sponsor'): Promise<Uint8Array> {
		const tx = new Transaction();
		tx.setSender(sender);
		tx.setGasOwner(sponsorAddr);
		tx.setGasBudget(2_000_000n);
		tx.setGasPrice(1000n);
		tx.setGasPayment(fakeGasPayment);
		tx.setExpiration({ Epoch: 100 });
		const w = tx.withdrawal({ amount: 1000n });
		tx.moveCall({ target: '0x2::foo::bar', arguments: [w] });

		const bytes = await tx.build({ client: {} as ClientWithCoreApi });
		if (from === 'Sender') return bytes;

		const data = TransactionDataBuilder.fromBytes(bytes);
		const withdrawal = data.inputs.find((input) => input.$kind === 'FundsWithdrawal');
		withdrawal!.FundsWithdrawal.withdrawFrom = { $kind: 'Sponsor', Sponsor: true };
		return data.build();
	}

	function offlineSponsor() {
		return createSponsor({
			signer: sponsorKey,
			client: {} as ClientWithCoreApi,
			validate: [onlySenderWithdrawals()],
		});
	}

	it('signs a sender withdrawal with no RPC (real analyze pipeline)', async () => {
		// Exercises the full analyze() chain offline: the FundsWithdrawal survives a
		// BCS build→parse round-trip and onlySenderWithdrawals inspects it — no dry-run.
		const result = signed(
			await offlineSponsor().signTransaction({ transaction: await withdrawalBytes('Sender') }),
		);
		expect(result.sponsorSignature).toBeTruthy();
	});

	it('rejects a sponsor withdrawal with no RPC (real analyze pipeline)', async () => {
		const result = await offlineSponsor().signTransaction({
			transaction: await withdrawalBytes('Sponsor'),
		});
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toEqual(['NON_SENDER_WITHDRAWAL']);
			expect(result.reason).toBe('POLICY_REJECTED');
		}
	});
});

describe('userSignatureMatchesSender', () => {
	function withValidator() {
		const sponsorKey = new Ed25519Keypair();
		return {
			sponsorKey,
			sponsor: createSponsor({
				signer: sponsorKey,
				client: {} as ClientWithCoreApi,
				validate: [userSignatureMatchesSender()],
			}),
		};
	}

	it('accepts a transaction whose user signature matches the sender', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const senderKey = new Ed25519Keypair();
		const bytes = await resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		const { signature: userSignature } = await senderKey.signTransaction(bytes);

		const result = signed(await sponsor.signTransaction({ transaction: bytes, userSignature }));
		expect(result.signatures).toEqual([userSignature, result.sponsorSignature]);
	});

	it('rejects a signature that is valid but not the sender’s', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const senderKey = new Ed25519Keypair();
		const impostorKey = new Ed25519Keypair();
		const bytes = await resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		// A cryptographically valid signature over the same bytes — by someone who
		// isn't the sender.
		const { signature: wrongSignature } = await impostorKey.signTransaction(bytes);

		const result = await sponsor.signTransaction({
			transaction: bytes,
			userSignature: wrongSignature,
		});
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toEqual(['USER_SIGNATURE_INVALID']);
			expect(result.reason).toBe('POLICY_REJECTED');
		}
	});

	it('rejects a malformed signature clearly as USER_SIGNATURE_INVALID', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const bytes = await resolvedTransaction({
			sender: new Ed25519Keypair().toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		// A malformed signature (unknown scheme flag) — parsing fails, which we report
		// as a clear policy decline, not an opaque analysis failure.
		const malformed = toBase64(new Uint8Array(40).fill(0xff));

		const result = await sponsor.signTransaction({ transaction: bytes, userSignature: malformed });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toEqual(['USER_SIGNATURE_INVALID']);
			expect(result.reason).toBe('POLICY_REJECTED');
		}
	});

	it('rejects a well-formed signature that does not verify over the bytes', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const senderKey = new Ed25519Keypair();
		const bytes = await resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		// A real signature by the sender, but over a *different* transaction — a
		// well-formed signature that simply isn't valid for these bytes. The boolean
		// `verifyTransaction` returns false (no throw), so it's a clear policy decline.
		const otherTx = resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		otherTx.setGasBudget(3_000_000n);
		const { signature: staleSignature } = await senderKey.signTransaction(await otherTx.build());

		const result = await sponsor.signTransaction({
			transaction: bytes,
			userSignature: staleSignature,
		});
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toEqual(['USER_SIGNATURE_INVALID']);
			expect(result.reason).toBe('POLICY_REJECTED');
		}
	});

	it('accepts multiple signatures when all belong to the sender', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const senderKey = new Ed25519Keypair();
		const bytes = await resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		const { signature } = await senderKey.signTransaction(bytes);

		const result = signed(
			await sponsor.signTransaction({ transaction: bytes, userSignature: [signature, signature] }),
		);
		expect(result.signatures).toEqual([signature, signature, result.sponsorSignature]);
	});

	it('rejects when any supplied signature is not the sender’s (all are executed)', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const senderKey = new Ed25519Keypair();
		const impostorKey = new Ed25519Keypair();
		const bytes = await resolvedTransaction({
			sender: senderKey.toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		}).build();
		const { signature: senderSig } = await senderKey.signTransaction(bytes);
		const { signature: impostorSig } = await impostorKey.signTransaction(bytes);

		const result = await sponsor.signTransaction({
			transaction: bytes,
			userSignature: [senderSig, impostorSig],
		});
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toEqual(['USER_SIGNATURE_INVALID']);
		}
	});

	it('passes in the sponsor-builds flow (no user signature to verify)', async () => {
		const { sponsorKey, sponsor } = withValidator();
		const tx = resolvedTransaction({
			sender: new Ed25519Keypair().toSuiAddress(),
			sponsor: sponsorKey.toSuiAddress(),
		});
		const result = signed(await sponsor.signTransaction({ transaction: tx }));
		expect(result.sponsorSignature).toBeTruthy();
	});
});

describe('assertSponsorable', () => {
	const sponsor = normalizeSuiAddress('0x5');

	// A transaction that resolves fully offline: sender + gas owner/budget/price set,
	// empty gas payment with an expiration (address-balance gas), no unresolved inputs.
	const resolvedTx = () => {
		const tx = new Transaction();
		tx.setSender(normalizeSuiAddress('0xa'));
		tx.setGasOwner(sponsor);
		tx.setGasBudget(1000n);
		tx.setGasPrice(1000n);
		tx.setGasPayment([]);
		tx.setExpiration({ Epoch: 100 });
		return tx;
	};

	it('accepts a final, sponsor-owned transaction', () => {
		expect(() => assertSponsorable(resolvedTx(), sponsor)).not.toThrow();
	});

	it('rejects an unresolved transaction (signed bytes are taken as-is)', () => {
		// No gas/sender/expiration set — needs resolution, so not fully resolved.
		const tx = new Transaction();
		tx.setGasOwner(sponsor);
		expect(() => assertSponsorable(tx, sponsor)).toThrow(/not fully resolved/i);
	});

	it('rejects a missing sender', () => {
		const tx = resolvedTx();
		tx.setSender(undefined as never);
		expect(() => assertSponsorable(tx, sponsor)).toThrow(/not fully resolved/i);
	});

	it('rejects a gas owner that is not the sponsor', () => {
		const tx = resolvedTx();
		tx.setGasOwner(normalizeSuiAddress('0x9'));
		expect(() => assertSponsorable(tx, sponsor)).toThrow(/gas owner/i);
	});

	it('rejects unset gas budget/price', () => {
		// Everything set except the gas budget — still needs resolution.
		const tx = new Transaction();
		tx.setSender(normalizeSuiAddress('0xa'));
		tx.setGasOwner(sponsor);
		tx.setGasPrice(1000n);
		tx.setGasPayment([]);
		tx.setExpiration({ Epoch: 100 });
		expect(() => assertSponsorable(tx, sponsor)).toThrow(/not fully resolved/i);
	});
});
