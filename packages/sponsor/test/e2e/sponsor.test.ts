// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { beforeAll, describe, expect, it } from 'vitest';

import { analyzers, createAnalyzer, createSponsor, gasBudget } from '../../src/index.js';
import { client, NETWORK, seedSponsor } from './setup.js';

const sponsorKey = new Ed25519Keypair();
const senderKey = new Ed25519Keypair();

/** True once the faucet seeded the sponsor's address balance; else suites soft-skip. */
let funded = false;

beforeAll(async () => {
	funded = await seedSponsor({ sponsor: sponsorKey, senders: [senderKey] });
});

function effects(result: { $kind: string; Transaction?: any; FailedTransaction?: any }) {
	const tx = result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
	return tx?.effects;
}

/**
 * A realistic sponsored transaction: the sender spends 1 MIST of its *own* SUI
 * (`useGasCoin: false`, so it never touches the sponsor's gas coin) to the sponsor.
 */
function userCommands() {
	const tx = new Transaction();
	const coin = tx.coin({ balance: 1n, useGasCoin: false });
	tx.transferObjects([coin], sponsorKey.toSuiAddress());
	tx.setSender(senderKey.toSuiAddress());
	return tx;
}

describe(`Sponsor e2e (${NETWORK})`, () => {
	it('sign: sponsor provides gas + signs, user signs, executes on-chain', async (ctx) => {
		if (!funded) return ctx.skip();

		// No `validate` — exercises the full default set (incl. the dry-run and the
		// server-set expiration), and the pass direction of analyzer-backed validators.
		const sponsor = createSponsor({ signer: sponsorKey, client });

		const signedResult = await sponsor.signTransaction({ transaction: userCommands() });
		expect(signedResult.$kind).toBe('Signed');
		if (signedResult.$kind !== 'Signed') return;
		const { bytes, sponsorSignature, digest } = signedResult;

		const { signature: userSignature } = await senderKey.signTransaction(bytes);
		const result = await client.core.executeTransaction({
			transaction: bytes,
			signatures: [userSignature, sponsorSignature],
			include: { effects: true },
		});

		expect(result.$kind).toBe('Transaction');
		expect(effects(result)?.status.success).toBe(true);
		expect(digest).toBeTruthy();
		// The sender reuses its (versioned) coin across tests, so wait for this tx
		// before the next builds. The sponsor's address-balance gas needs no such
		// wait — it doesn't serialize, so a sponsor can execute in parallel.
		await client.core.waitForTransaction({ digest });
	});

	it('signAndExecute: user signs first, sponsor co-signs and submits', async (ctx) => {
		if (!funded) return ctx.skip();

		const sponsor = createSponsor({ signer: sponsorKey, client });

		// The user signs final bytes, so the client wires up sponsorship: sponsor as
		// gas owner + address-balance gas, which the resolver fills with a bounded
		// expiration (required by `defaults()`).
		const tx = userCommands();
		tx.setGasOwner(sponsor.address);
		tx.setGasPayment([]);
		const bytes = await tx.build({ client });
		const { signature: userSignature } = await senderKey.signTransaction(bytes);

		const result = await sponsor.signAndExecuteTransaction({ transaction: bytes, userSignature });

		expect(result.$kind).toBe('Transaction');
		expect(effects(result)?.status.success).toBe(true);
		if (result.$kind === 'Transaction') {
			// Wait for the sender's coin to settle before the next test reuses it.
			await client.core.waitForTransaction({ digest: result.Transaction.digest });
		}
	});

	it('returns Rejected for an over-budget transaction', async (ctx) => {
		if (!funded) return ctx.skip();

		const sponsor = createSponsor({
			signer: sponsorKey,
			client,
			validate: [gasBudget({ max: 1n })],
		});

		const result = await sponsor.signTransaction({ transaction: userCommands() });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toContain('GAS_BUDGET_TOO_HIGH');
		}
	});

	it('threads validationOptions to a custom validator (reject, then sign)', async (ctx) => {
		if (!funded) return ctx.skip();

		// A validator that reads a request-scoped token off `options` — inferred onto
		// `signTransaction` as a required `validationOptions.token`.
		const requiresToken = createAnalyzer({
			analyze: (options: { token: string }) => () =>
				options.token === 'ok'
					? { result: null }
					: { result: [{ code: 'BAD_TOKEN', message: 'invalid token' }] },
		});
		const sponsor = createSponsor({ signer: sponsorKey, client, validate: [requiresToken] });

		const rejected = await sponsor.signTransaction({
			transaction: userCommands(),
			validationOptions: { token: 'no' },
		});
		expect(rejected.$kind).toBe('Rejected');
		if (rejected.$kind === 'Rejected') {
			expect(rejected.issues.map((issue) => issue.code)).toContain('BAD_TOKEN');
		}

		const signedResult = await sponsor.signTransaction({
			transaction: userCommands(),
			validationOptions: { token: 'ok' },
		});
		expect(signedResult.$kind).toBe('Signed');
	});

	it('runs a custom balanceFlows validator (rejects when underpaid)', async (ctx) => {
		if (!funded) return ctx.skip();

		// Require the sponsor net at least 1 SUI; the realistic tx pays 1 MIST → reject.
		const requirePayment = createAnalyzer({
			dependencies: { balanceFlows: analyzers.balanceFlows },
			analyze:
				() =>
				({ balanceFlows }) => {
					const received = (balanceFlows.sponsor ?? []).reduce(
						(sum, flow) => sum + (flow.amount > 0n ? flow.amount : 0n),
						0n,
					);
					return received >= 1_000_000_000n
						? { result: null }
						: { result: [{ code: 'UNDERPAID', message: `sponsor received only ${received}` }] };
				},
		});
		const sponsor = createSponsor({ signer: sponsorKey, client, validate: [requirePayment] });

		const result = await sponsor.signTransaction({ transaction: userCommands() });
		expect(result.$kind).toBe('Rejected');
		if (result.$kind === 'Rejected') {
			expect(result.issues.map((issue) => issue.code)).toContain('UNDERPAID');
		}
	});
});
