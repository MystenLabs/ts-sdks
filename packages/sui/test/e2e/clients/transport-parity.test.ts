// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Transactions whose mapping once differed between gRPC and GraphQL, read through every Core API
 * path that returns them: get, list, and the transaction and checkpoint streams.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import type { ClientWithCoreApi } from '../../../src/client/core.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { Transaction } from '../../../src/transactions/index.js';
import { normalizeSuiAddress, SUI_TYPE_ARG } from '../../../src/utils/index.js';
import { DEFAULT_RECIPIENT, setup, type TestToolbox } from '../utils/setup.js';

const INCLUDE = {
	transaction: true,
	effects: true,
	events: true,
	balanceChanges: true,
	objectTypes: true,
	bcs: true,
} as const;

type Fixture = 'crossPackageEvent' | 'perEpochConfig' | 'sponsored' | 'insufficientBalance';
type Signer = Awaited<ReturnType<TestToolbox['getSigner']>>;

async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
	const frames: T[] = [];
	for await (const frame of stream) frames.push(frame);
	return frames;
}

/**
 * Error messages are worded by each server and are not compared. Everything else about the error
 * must match.
 */
function withoutErrorMessages<T>(value: T): T {
	const copy = structuredClone(value);
	const strip = (status: { error?: { message?: string } | null } | undefined) => {
		if (status?.error) delete status.error.message;
	};
	const visit = (node: unknown) => {
		if (!node || typeof node !== 'object' || ArrayBuffer.isView(node)) return;
		if ('status' in node && 'digest' in node) {
			const tx = node as { status?: never; effects?: { status?: never } };
			strip(tx.status);
			strip(tx.effects?.status);
		}
		for (const field of Object.values(node)) visit(field);
	};
	visit(copy);
	return copy;
}

const unwrap = <Include extends SuiClientTypes.TransactionInclude>(
	result: SuiClientTypes.TransactionResult<Include>,
) => result.Transaction ?? result.FailedTransaction;

describe('transport parity of transaction mappings', () => {
	let toolbox: TestToolbox;
	let packageId: string;
	let sender: Signer;
	const digests = {} as Record<Fixture, string>;
	let range: { start: { checkpoint: string }; end: { checkpoint: string } };

	/** A transaction with gas set by hand, so it executes even when it is expected to fail. */
	async function buildByHand(tx: Transaction, gasOwner: string) {
		const [{ objects }, { referenceGasPrice }] = await Promise.all([
			toolbox.grpcClient.core.listCoins({ owner: gasOwner, coinType: SUI_TYPE_ARG }),
			toolbox.grpcClient.core.getReferenceGasPrice(),
		]);
		const [gas] = objects;
		tx.setSender(sender.address);
		tx.setGasOwner(gasOwner);
		tx.setGasBudget(50_000_000);
		tx.setGasPrice(referenceGasPrice);
		tx.setGasPayment([{ objectId: gas.objectId, version: gas.version, digest: gas.digest }]);
		return tx.build({});
	}

	async function execute(bytes: Uint8Array, signers: Signer[]) {
		const signatures = await Promise.all(
			signers.map(async (signer) => (await signer.keypair.signTransaction(bytes)).signature),
		);
		const result = await toolbox.grpcClient.core.executeTransaction({
			transaction: bytes,
			signatures,
		});
		const { digest } = unwrap(result);
		await toolbox.waitForTransaction({ digest });
		return digest;
	}

	async function run(tx: Transaction) {
		const result = await toolbox.signAndExecuteTransaction({
			transaction: tx,
			signer: sender.keypair,
		});
		if (result.$kind !== 'Transaction') {
			throw new Error(`Fixture failed: ${result.FailedTransaction.status.error?.message}`);
		}
		return result.Transaction.digest;
	}

	beforeAll(async () => {
		toolbox = await setup();
		packageId = toolbox.getPackage('test_data');
		const treasuryCap = toolbox.getSharedObject('test_data', 'TreasuryCap<TEST_COIN>');
		if (!treasuryCap) throw new Error('TreasuryCap<TEST_COIN> not found in pre-published package');
		let sponsor: Signer;
		[sender, sponsor] = await Promise.all([
			toolbox.getSigner({ coins: [1_000_000_000n] }),
			toolbox.getSigner({ coins: [1_000_000_000n] }),
		]);

		const policy = new Transaction();
		policy.moveCall({
			target: `${packageId}::test_coin::share_token_policy`,
			arguments: [policy.object(treasuryCap)],
		});
		digests.crossPackageEvent = await run(policy);

		// Receiving a coin other than SUI reads the deny list as a per-epoch config object.
		const transfer = new Transaction();
		const [coin] = transfer.moveCall({
			target: `${packageId}::test_coin::mint`,
			arguments: [transfer.object(treasuryCap), transfer.pure.u64(100)],
		});
		transfer.transferObjects([coin], DEFAULT_RECIPIENT);
		digests.perEpochConfig = await run(transfer);

		const sponsored = new Transaction();
		sponsored.moveCall({
			target: `${packageId}::test_objects::create_object_with_event`,
			arguments: [sponsored.pure.u64(7)],
		});
		digests.sponsored = await execute(await buildByHand(sponsored, sponsor.address), [
			sender,
			sponsor,
		]);

		const overdraw = new Transaction();
		overdraw.transferObjects(
			[overdraw.splitCoins(overdraw.gas, [10_000_000_000_000n])],
			DEFAULT_RECIPIENT,
		);
		digests.insufficientBalance = await execute(await buildByHand(overdraw, sender.address), [
			sender,
		]);

		const checkpoints = await Promise.all(
			Object.values(digests).map(async (digest) => {
				const { Transaction, FailedTransaction } = await toolbox.grpcClient.core.getTransaction({
					digest,
				});
				return BigInt((Transaction ?? FailedTransaction)!.checkpoint!);
			}),
		);
		const first = checkpoints.reduce((a, b) => (a < b ? a : b));
		const last = checkpoints.reduce((a, b) => (a > b ? a : b));
		range = {
			start: { checkpoint: first.toString() },
			end: { checkpoint: (last + 1n).toString() },
		};
	});

	function getAll(client: ClientWithCoreApi) {
		return Promise.all(
			Object.values(digests).map(async (digest) =>
				unwrap(await client.core.getTransaction({ digest, include: INCLUDE })),
			),
		);
	}

	it('exercises every mapping the fixtures were made for', async () => {
		const [crossPackage, perEpoch, sponsored, overdraw] = await getAll(toolbox.grpcClient);

		const [event] = crossPackage.events;
		expect(event.packageId).toBe(packageId);
		expect(event.module).toBe('test_coin');
		expect(event.eventType).toMatch(new RegExp(`^${normalizeSuiAddress('0x2')}::token::`));

		expect(perEpoch.effects.unchangedConsensusObjects).toContainEqual(
			expect.objectContaining({ kind: 'PerEpochConfig', version: null }),
		);

		expect(sponsored.signatures).toHaveLength(2);
		expect(sponsored.transaction.gasData.owner).not.toBe(sponsored.transaction.sender);

		expect(overdraw.status.success).toBe(false);
		expect(overdraw.status.error).toMatchObject({ command: 0 });
		expect(overdraw.status.error?.$kind).not.toBe('MoveAbort');
	});

	it('returns the same transactions from getTransaction', async () => {
		await toolbox.expectAllClientsReturnSameData(getAll, withoutErrorMessages);
	});

	it('returns the same transactions from listTransactions', async () => {
		await toolbox.expectAllClientsReturnSameData(async (client) => {
			const { transactions } = await client.core.listTransactions({
				filter: { sender: sender.address },
				include: INCLUDE,
			});
			return transactions;
		}, withoutErrorMessages);
	});

	it('returns the same transactions from streamTransactions', async () => {
		await toolbox.expectAllClientsReturnSameData(async (client) => {
			const frames = await collect(
				client.core.streamTransactions({
					...range,
					filter: { sender: sender.address },
					include: INCLUDE,
				}),
			);
			expect(frames).toHaveLength(Object.keys(digests).length);
			return frames.map((frame) => frame.transaction);
		}, withoutErrorMessages);
	});

	it('returns the same checkpoints with transactions, matching streamTransactions on each transport', async () => {
		const include = { transactions: INCLUDE };
		await toolbox.expectAllClientsReturnSameData(async (client) => {
			const checkpoints = (await collect(client.core.streamCheckpoints({ ...range, include }))).map(
				(frame) => frame.checkpoint,
			);
			const transactions = await collect(
				client.core.streamTransactions({ ...range, include: INCLUDE }),
			);
			expect(checkpoints.flatMap((checkpoint) => checkpoint.transactions)).toEqual(
				transactions.map((frame) => frame.transaction),
			);
			const delivered = new Set(
				checkpoints.flatMap((checkpoint) =>
					checkpoint.transactions.map((result) => unwrap(result).digest),
				),
			);
			for (const digest of Object.values(digests)) expect(delivered).toContain(digest);
			// Other test files run alongside this one; compare only this file's transactions.
			const ours = new Set(Object.values(digests));
			return checkpoints.map((checkpoint) => ({
				...checkpoint,
				transactions: checkpoint.transactions.filter((result) => ours.has(unwrap(result).digest)),
			}));
		}, withoutErrorMessages);
	});
});
