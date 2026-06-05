// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { beforeAll, describe, expect, it } from 'vitest';

import { createSponsor, gasBudget } from '../../src/index.js';

const NETWORK = 'devnet';

const client = new SuiGrpcClient({
	network: NETWORK,
	baseUrl: process.env.FULLNODE_URL ?? 'https://fullnode.devnet.sui.io:443',
});

const sponsorKey = new Ed25519Keypair();
const senderKey = new Ed25519Keypair();

/** Set false if the faucet is unavailable / rate-limited, so we soft-skip rather than hard-fail. */
let funded = false;

async function fund(address: string) {
	const host = process.env.FAUCET_URL ?? getFaucetHost(NETWORK);
	const res = await requestSuiFromFaucetV2({ host, recipient: address });
	const digest = res.coins_sent?.[0]?.transferTxDigest;
	if (digest) {
		await client.core.waitForTransaction({ digest });
	}
}

/**
 * Move SUI from the sponsor's coins into its on-chain address balance, which is
 * what pays gas (the faucet only hands out coin objects, not address balance).
 */
async function depositToAddressBalance(amount: bigint) {
	const tx = new Transaction();
	const [coin] = tx.splitCoins(tx.gas, [amount]);
	tx.moveCall({
		target: '0x2::coin::send_funds',
		typeArguments: ['0x2::sui::SUI'],
		arguments: [coin, tx.pure.address(sponsorKey.toSuiAddress())],
	});
	tx.setSender(sponsorKey.toSuiAddress());
	const bytes = await tx.build({ client });
	const { signature } = await sponsorKey.signTransaction(bytes);
	const result = await client.core.executeTransaction({
		transaction: bytes,
		signatures: [signature],
		include: { effects: true },
	});
	await client.core.waitForTransaction({ digest: result.Transaction!.digest });
}

function effects(result: { $kind: string; Transaction?: any; FailedTransaction?: any }) {
	const tx = result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
	return tx?.effects;
}

/**
 * A realistic sponsored transaction: the sender spends 1 MIST of its *own* SUI
 * (`useGasCoin: false`, so it never touches the sponsor's gas coin).
 */
function userCommands() {
	const tx = new Transaction();
	const coin = tx.coin({ balance: 1n, useGasCoin: false });
	tx.transferObjects([coin], sponsorKey.toSuiAddress());
	tx.setSender(senderKey.toSuiAddress());
	return tx;
}

beforeAll(async () => {
	try {
		await fund(sponsorKey.toSuiAddress());
		await fund(senderKey.toSuiAddress());
		// The sponsor pays gas from its address balance.
		await depositToAddressBalance(2_000_000_000n);
		funded = true;
	} catch (error) {
		if (error instanceof FaucetRateLimitError) {
			console.warn('Faucet rate-limited; skipping sponsor e2e tests.');
		} else {
			console.warn(`Faucet unavailable (${(error as Error).message}); skipping sponsor e2e tests.`);
		}
	}
});

describe(`Sponsor e2e (${NETWORK})`, () => {
	it('sign: sponsor provides gas + signs, user signs, executes on-chain', async (ctx) => {
		if (!funded) return ctx.skip();

		// No `validate` — exercises the full default set (incl. the server-set expiration).
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

	it('returns a Rejected result for an over-budget transaction', async (ctx) => {
		if (!funded) return ctx.skip();

		const sponsor = createSponsor({
			signer: sponsorKey,
			client,
			validate: [gasBudget({ max: 1n })],
		});

		const result = await sponsor.signTransaction({ transaction: userCommands() });
		expect(result.$kind).toBe('Rejected');
	});
});
