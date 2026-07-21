// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeAll } from 'vitest';
import type { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import type { WithdrawalHistoryItem } from '../../src/types.js';
import {
	btcCoinType,
	btcRpc,
	fetchCoinBalance,
	freshFundedSigner,
	fundDepositOnLocalnet,
	isLocalnet,
	makeClient,
	waitForCoinBalance,
	waitForCoinBalanceExact,
	type ExtendedHashiClient,
} from './_env.js';

/**
 * Localnet-only — full deposit → request withdrawal → cancel withdrawal
 * lifecycle as three sequential `it()` blocks. Sharing state via the
 * `describe` scope keeps the chain of preconditions (signer must own
 * hBTC; cancel must reference the just-emitted `request_id`) inside one
 * file so vitest's intra-describe ordering is the only ordering guarantee
 * we rely on.
 *
 * Skipped on devnet: cancellation cooldown alone (devnet is configured for
 * minutes-to-hours) makes a single-test-run lifecycle infeasible. The
 * underscore-prefixed dev-tool tests this replaces handled the two halves
 * separately, with operator-driven waits in between.
 */

// See deposit.test.ts for why 300 s — Kyoto BIP-157 warmup on cold CI.
const LOCALNET_HBTC_TIMEOUT_MS = 300_000;
const LOCALNET_HBTC_INTERVAL_MS = 2_000;
const COOLDOWN_BUDGET_MS = 30_000;

interface LifecycleState {
	client: ExtendedHashiClient;
	signer: Ed25519Keypair;
	recipient: string;
	balanceBeforeDeposit: bigint;
	balanceAfterDeposit: bigint;
	requestId: string;
	withdrawAmountSats: bigint;
	cancellationCooldownMs: bigint;
	/** Set when `requestWithdrawal` succeeds, used to gate the cooldown wait. */
	requestSubmittedAt: number;
}

describe.skipIf(!isLocalnet())('HashiClient withdrawal lifecycle (localnet)', () => {
	const state = {} as LifecycleState;

	beforeAll(async () => {
		state.client = makeClient();
		// Fresh signer per test — see freshFundedSigner docstring. Each
		// localnet integration test owns its own Sui address, so concurrent
		// test files don't share gas objects or hBTC balances.
		state.signer = await freshFundedSigner();
		state.recipient = state.signer.toSuiAddress();
	});

	it(
		'deposit: signer mints hBTC by funding the derived deposit address',
		async () => {
			state.balanceBeforeDeposit = await fetchCoinBalance(
				state.client,
				state.recipient,
				btcCoinType(),
			);

			const { funded } = await fundDepositOnLocalnet(state.client, state.recipient);

			const result = await state.client.hashi.deposit({
				signer: state.signer,
				txid: funded.txid,
				utxos: [{ vout: funded.vout, amountSats: funded.amountSats }],
				recipient: state.recipient,
			});

			expect(result.$kind).toBe('Transaction');
			if (result.$kind !== 'Transaction') {
				throw new Error(`Transaction failed: ${JSON.stringify(result.FailedTransaction)}`);
			}
			expect(result.Transaction.status.success).toBe(true);

			const target = state.balanceBeforeDeposit + funded.amountSats;
			state.balanceAfterDeposit = await waitForCoinBalance(
				state.client,
				state.recipient,
				btcCoinType(),
				target,
				{ timeoutMs: LOCALNET_HBTC_TIMEOUT_MS, intervalMs: LOCALNET_HBTC_INTERVAL_MS },
			);
			expect(state.balanceAfterDeposit).toBeGreaterThanOrEqual(target);
		},
		LOCALNET_HBTC_TIMEOUT_MS + 60_000,
	);

	it('requestWithdrawal: emits WithdrawalRequested and burns hBTC', async () => {
		const snap = await state.client.hashi.view.all();
		state.cancellationCooldownMs = snap.withdrawalCancellationCooldownMs;

		// Withdraw min + 1000 so the change-of-balance assertion is
		// unambiguously decided by request/cancel, not by floor rounding.
		state.withdrawAmountSats = snap.bitcoinWithdrawalMinimum + 1_000n;

		// A regtest BTC address from the Core test wallet — used as the
		// withdrawal target. The test never expects this address to be
		// paid (we cancel before the committee processes), so any valid
		// bech32 regtest address works.
		const bitcoinAddress = await btcRpc<string>('getnewaddress', [], { wallet: 'test' });

		const result = await state.client.hashi.requestWithdrawal({
			signer: state.signer,
			amountSats: state.withdrawAmountSats,
			bitcoinAddress,
		});
		state.requestSubmittedAt = Date.now();

		expect(result.$kind).toBe('Transaction');
		if (result.$kind !== 'Transaction') {
			throw new Error(`Transaction failed: ${JSON.stringify(result.FailedTransaction)}`);
		}
		expect(result.Transaction.status.success).toBe(true);

		const evt = result.Transaction.events?.find((e) =>
			e.eventType.endsWith('::withdrawal_queue::WithdrawalRequested'),
		);
		expect(evt).toBeDefined();

		// The gRPC client (`@mysten/sui/grpc`) surfaces parsed Move event
		// data under `event.json`, not the JSON-RPC-era `event.parsedJson`.
		// Mixing the two silently returns undefined and looks like the
		// event was malformed.
		const parsed = (evt as unknown as { json?: { request_id?: string } }).json;
		if (!parsed?.request_id) {
			throw new Error(`WithdrawalRequested missing request_id: ${JSON.stringify(evt)}`);
		}
		state.requestId = parsed.request_id;

		// Sanity: hBTC is locked at request time — balance should drop by
		// exactly the requested amount once the request lands. The balance
		// index updates a beat after `signAndExecuteTransaction` returns,
		// so we poll until it matches rather than reading once.
		const expected = state.balanceAfterDeposit - state.withdrawAmountSats;
		await waitForCoinBalanceExact(state.client, state.recipient, btcCoinType(), expected, {
			timeoutMs: 5_000,
			intervalMs: 100,
		});

		// --- view method assertions (SEDEFI-201) ---
		// Transaction history should include the withdrawal with status "Requested".
		const history = await state.client.hashi.view.transactionHistory(state.recipient);
		const wd = history.find(
			(h): h is WithdrawalHistoryItem => h.kind === 'withdrawal' && h.requestId === state.requestId,
		);
		expect(wd).toBeDefined();
		expect(wd!.status).toBe('Requested');
		expect(wd!.btcAmountSats).toBe(state.withdrawAmountSats);
		expect(wd!.btcTxid).toBeNull(); // committee hasn't broadcast yet
	}, 60_000);

	it(
		'cancelWithdrawal: returns the locked hBTC to the requester',
		async () => {
			if (state.cancellationCooldownMs > BigInt(COOLDOWN_BUDGET_MS)) {
				// eslint-disable-next-line no-console
				console.log(
					`[withdrawal-lifecycle] skipping cancel: cooldown ` +
						`${state.cancellationCooldownMs} ms exceeds test budget ` +
						`${COOLDOWN_BUDGET_MS} ms. Lower it in localnet defaults to ` +
						`re-enable.`,
				);
				return;
			}

			const elapsed = Date.now() - state.requestSubmittedAt;
			const remaining = Number(state.cancellationCooldownMs) - elapsed;
			if (remaining > 0) {
				await new Promise((resolve) => setTimeout(resolve, remaining + 250));
			}

			const result = await state.client.hashi.cancelWithdrawal({
				signer: state.signer,
				requestId: state.requestId,
			});

			expect(result.$kind).toBe('Transaction');
			if (result.$kind !== 'Transaction') {
				throw new Error(`Transaction failed: ${JSON.stringify(result.FailedTransaction)}`);
			}
			expect(result.Transaction.status.success).toBe(true);

			const evt = result.Transaction.events?.find((e) =>
				e.eventType.endsWith('::withdrawal_queue::WithdrawalCancelledEvent'),
			);
			expect(evt).toBeDefined();

			// Balance must return to the post-deposit value: cancel unlocks
			// exactly what request locked. Same balance-index lag as the
			// request step, so poll for equality.
			await waitForCoinBalanceExact(
				state.client,
				state.recipient,
				btcCoinType(),
				state.balanceAfterDeposit,
				{ timeoutMs: 5_000, intervalMs: 100 },
			);
		},
		COOLDOWN_BUDGET_MS + 60_000,
	);
});
