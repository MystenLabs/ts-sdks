// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The code in this file mirrors the examples in README.md so they stay
// type-checked (`pnpm test:typecheck`). It is never executed.
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

import {
	allowedPackages,
	analyze,
	analyzers,
	createAnalyzer,
	createSponsor,
	defaults,
	gasBudget,
	gasCoinNotUsed,
	senderIsNotSponsor,
} from '../src/index.js';

// Placeholders for things an app supplies.
declare const signer: Signer;
declare const USDC: string;
declare const userAddress: string;
declare const recipient: string;
/** The user's `Signer` (in a dApp, use dapp-kit's `signTransaction` instead). */
declare const userSigner: Signer;
/** An app-specific auth check, e.g. against your backend. */
declare function isValidToken(token: string): boolean;

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});

// ── Quick start ──────────────────────────────────────────────────────────────
const sponsor = createSponsor({
	signer: Ed25519Keypair.fromSecretKey(process.env.SPONSOR_KEY!),
	client,
	// `defaults()` keeps the baseline (see the Defaults section).
	validate: [defaults(), gasBudget({ max: 50_000_000n }), allowedPackages(['0xabc'])],
});

// Offline-only signing: validate already-built bytes (no dry-run, no network).
const offlineSponsor = createSponsor({
	signer,
	client,
	validate: [senderIsNotSponsor(), gasCoinNotUsed()],
});

// ── A user transaction ───────────────────────────────────────────────────────
// The user spends their *own* SUI (`useGasCoin: false`) — a sponsored transaction
// must never touch the gas coin, which is the sponsor's.
function userPayment(amount: bigint) {
	const tx = new Transaction();
	const coin = tx.coin({ balance: amount, useGasCoin: false });
	tx.transferObjects([coin], recipient);
	return tx;
}

// ── The client builds the transaction (recommended) ──────────────────────────
async function clientBuilds(transaction: Transaction) {
	transaction.setSender(userAddress);
	transaction.setGasOwner(sponsor.address); // gas is paid by the sponsor…
	transaction.setGasPayment([]); // …from its address balance (no specific gas coins)
	const bytes = await transaction.build({ client });

	const { signature: userSignature } = await userSigner.signTransaction(bytes);
	const result = await sponsor.signAndExecuteTransaction({ transaction: bytes, userSignature });

	// Three outcomes, not two — switch on `$kind`:
	switch (result.$kind) {
		case 'Rejected': // a validator declined; the sponsor never signed or executed
			throw new Error(result.issues.map((issue) => issue.message).join('; '));
		case 'FailedTransaction': // executed on-chain but aborted — the sponsor still paid gas
			throw new Error(`Transaction failed on-chain: ${result.FailedTransaction.digest}`);
		case 'Transaction': // executed successfully
			return result.Transaction.digest;
	}
}

// ── The sponsor builds the transaction ───────────────────────────────────────
async function sponsorBuilds(transaction: Transaction) {
	const result = await sponsor.signTransaction({ transaction, sender: userAddress });
	if (result.$kind === 'Rejected') {
		throw new Error(result.issues.map((issue) => issue.message).join('; '));
	}

	const { signature: userSignature } = await userSigner.signTransaction(result.bytes);
	await client.core.executeTransaction({
		transaction: result.bytes,
		signatures: [userSignature, result.sponsorSignature],
	});
}

// ── Over the network ─────────────────────────────────────────────────────────
// The client builds + signs; the sponsor validates, co-signs, and executes.
// Every outcome is a `$kind` — no try/catch needed for a policy rejection.
async function handleSponsorRequest(body: { transaction: string; userSignature: string }) {
	const result = await sponsor.signAndExecuteTransaction({
		transaction: body.transaction,
		userSignature: body.userSignature,
	});
	switch (result.$kind) {
		case 'Rejected':
			return { ok: false as const, issues: result.issues };
		case 'FailedTransaction':
			return { ok: false as const, issues: [{ message: 'Transaction failed on-chain.' }] };
		case 'Transaction':
			return { ok: true as const, digest: result.Transaction.digest };
	}
}

// Client — build with the sponsor as gas owner, sign, send the bytes + signature.
async function callSponsor(transaction: Transaction) {
	transaction.setSender(userAddress);
	transaction.setGasOwner(sponsor.address);
	transaction.setGasPayment([]);
	const bytes = await transaction.build({ client });
	const { signature } = await userSigner.signTransaction(bytes);

	const res = await handleSponsorRequest({
		transaction: toBase64(bytes),
		userSignature: signature,
	});
	if (!res.ok) throw new Error(res.issues.map((issue) => issue.message).join('; '));
}

// ── A custom validator ───────────────────────────────────────────────────────
// A validator is an analyzer (`createAnalyzer`) whose result is its issues; `{
// result: null }` means pass. It declares the analyzers it reads via
// `dependencies`. There's no built-in "the sponsor must be paid" rule — value-flow
// policy is app-specific, so write it over `balanceFlows` (signed per-address
// deltas: negative = left the owner, positive = arrived).
const requireSponsorPayment = createAnalyzer({
	dependencies: { balanceFlows: analyzers.balanceFlows },
	analyze:
		() =>
		({ balanceFlows }) => {
			const received =
				balanceFlows.sponsor
					?.filter((flow) => flow.coinType === USDC)
					.reduce((sum, flow) => sum + flow.amount, 0n) ?? 0n;

			return received < 10_000n
				? { result: [{ code: 'UNDERPAID', message: `Sponsor received ${received}, needs 10000.` }] }
				: { result: null };
		},
});

// ── A custom analyzer that loads data, shared across validators ───────────────
// An analyzer receives the same `options` the sponsor passes to `analyze` — incl.
// `client` — so it can load on-chain data. Here: the sponsor's own SUI balance
// (the gas owner is the sponsor). The framework runs it once, so both validators
// below read it for one `getBalance`.
const sponsorBalance = createAnalyzer({
	dependencies: { data: analyzers.data },
	analyze:
		(options: { client: ClientWithCoreApi }) =>
		async ({ data }) => {
			const { balance } = await options.client.core.getBalance({ owner: data.gasData.owner ?? '' });
			return { result: BigInt(balance.balance) };
		},
});

// Won't sponsor if the sponsor can't cover this transaction's gas budget.
const sponsorCanCoverGas = createAnalyzer({
	dependencies: { sponsorBalance, data: analyzers.data },
	analyze:
		() =>
		({ sponsorBalance, data }) =>
			sponsorBalance >= BigInt(data.gasData.budget ?? 0)
				? { result: null }
				: {
						result: [{ code: 'SPONSOR_UNDERFUNDED', message: 'Sponsor balance cannot cover gas.' }],
					},
});

// Keep an operational reserve.
const sponsorKeepsReserve = createAnalyzer({
	dependencies: { sponsorBalance },
	analyze:
		() =>
		({ sponsorBalance }) =>
			sponsorBalance >= 1_000_000_000n
				? { result: null }
				: { result: [{ code: 'RESERVE_LOW', message: 'Sponsor reserve below 1 SUI.' }] },
});

const sponsorWithCustomAnalyzer = createSponsor({
	signer: new Ed25519Keypair(),
	client,
	// `sponsorBalance` (and its `getBalance` call) resolve once across both.
	validate: [sponsorCanCoverGas, sponsorKeepsReserve],
});

// ── Request-scoped options (instead of an opaque metadata bag) ────────────────
// A validator reads request inputs (an auth token, a tenant id) off `options`.
// `createSponsor` infers them onto `signTransaction`, so `authToken` becomes a
// typed, required argument.
const authChecked = createAnalyzer({
	analyze: (options: { authToken: string }) => () =>
		isValidToken(options.authToken)
			? { result: null }
			: { result: [{ code: 'BAD_AUTH', message: 'Invalid auth token.' }] },
});

const authSponsor = createSponsor({ signer, client, validate: [authChecked] });

async function callAuthSponsor(transaction: Uint8Array, userSignature: string, authToken: string) {
	// `validationOptions.authToken` is required and type-checked here, inferred from `authChecked`.
	return authSponsor.signAndExecuteTransaction({
		transaction,
		userSignature,
		validationOptions: { authToken },
	});
}

// `sponsor.analyzer` is the validation as a composable analyzer — drop it into
// any other `analyze()` graph and its dependencies dedupe with that graph.
async function inspect(transaction: Uint8Array) {
	const { check } = await analyze(
		{ check: sponsorWithCustomAnalyzer.analyzer },
		{ transaction, client },
	);
	return check;
}

// ── Timing-attack mitigation ─────────────────────────────────────────────────
const sponsorWithDelay = createSponsor({
	signer: new Ed25519Keypair(),
	client,
	delay: {
		beforeSimulate: { min: 50, max: 200 },
		beforeExecute: { min: 50, max: 200 },
	},
});

// Reference the bindings so they aren't flagged as unused.
export type _Examples = [
	typeof userPayment,
	typeof clientBuilds,
	typeof sponsorBuilds,
	typeof callSponsor,
	typeof requireSponsorPayment,
	typeof sponsorWithCustomAnalyzer,
	typeof inspect,
	typeof callAuthSponsor,
	typeof sponsorWithDelay,
	typeof offlineSponsor,
	ClientWithCoreApi,
];
