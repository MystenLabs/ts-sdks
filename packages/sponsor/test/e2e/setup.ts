// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

export const NETWORK = 'devnet';

export const client = new SuiGrpcClient({
	network: NETWORK,
	baseUrl: process.env.FULLNODE_URL ?? 'https://fullnode.devnet.sui.io:443',
});

/** Request faucet SUI for an address — these are coin *objects*, not address balance. */
export async function fundCoins(address: string): Promise<void> {
	const host = process.env.FAUCET_URL ?? getFaucetHost(NETWORK);
	const res = await requestSuiFromFaucetV2({ host, recipient: address });
	const digest = res.coins_sent?.[0]?.transferTxDigest;
	if (digest) await client.core.waitForTransaction({ digest });
}

/**
 * Move SUI from a signer's coins into its on-chain *address balance* — which is
 * what pays gas for a sponsor (the faucet only hands out coin objects). Uses
 * `0x2::coin::send_funds` to the signer's own address.
 */
export async function depositAddressBalance(signer: Signer, amount: bigint): Promise<void> {
	const tx = new Transaction();
	const [coin] = tx.splitCoins(tx.gas, [amount]);
	tx.moveCall({
		target: '0x2::coin::send_funds',
		typeArguments: ['0x2::sui::SUI'],
		arguments: [coin, tx.pure.address(signer.toSuiAddress())],
	});
	tx.setSender(signer.toSuiAddress());
	const bytes = await tx.build({ client });
	const { signature } = await signer.signTransaction(bytes);
	const result = await client.core.executeTransaction({
		transaction: bytes,
		signatures: [signature],
		include: { effects: true },
	});
	if (result.$kind !== 'Transaction') {
		throw new Error(`Address-balance deposit failed on-chain: ${JSON.stringify(result)}`);
	}
	await client.core.waitForTransaction({ digest: result.Transaction.digest });
}

/**
 * Seed a sponsor environment for e2e: faucet-fund the sponsor (and any senders),
 * then pre-seed the sponsor's **address balance** so it can pay gas. Returns
 * `false` if the faucet is unavailable / rate-limited, so suites can soft-skip
 * rather than hard-fail in CI.
 */
export async function seedSponsor(options: {
	sponsor: Signer;
	senders?: Signer[];
	/** Address balance to pre-seed on the sponsor (MIST). Default 2 SUI. */
	addressBalance?: bigint;
}): Promise<boolean> {
	// Faucet availability is a legitimate soft-skip (rate limits / downtime in CI).
	try {
		await fundCoins(options.sponsor.toSuiAddress());
		for (const sender of options.senders ?? []) {
			await fundCoins(sender.toSuiAddress());
		}
	} catch (error) {
		if (error instanceof FaucetRateLimitError) {
			console.warn('Faucet rate-limited; skipping sponsor e2e tests.');
		} else {
			console.warn(`Faucet unavailable (${(error as Error).message}); skipping sponsor e2e tests.`);
		}
		return false;
	}

	// Funding succeeded, so the deposit MUST succeed — a failure here is a real bug,
	// not a reason to silently skip (which would let CI go green without running).
	await depositAddressBalance(options.sponsor, options.addressBalance ?? 2_000_000_000n);
	console.info(`Seeded sponsor ${options.sponsor.toSuiAddress()} address balance; running e2e.`);
	return true;
}
