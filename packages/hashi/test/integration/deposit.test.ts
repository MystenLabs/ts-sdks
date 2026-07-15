// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

import type { DepositHistoryItem } from '../../src/types.js';
import {
	btcCoinType,
	fetchCoinBalance,
	freshFundedSigner,
	fundDepositOnLocalnet,
	isLocalnet,
	makeClient,
	makeSigner,
	waitForCoinBalance,
} from './_env.js';

/**
 * Real-network deposit smoke test. Two execution targets, same assertions:
 *
 *  - **devnet** (default): submits the env-configured signet UTXO to Sui
 *    devnet. Polling hBTC arrival is opt-in (`HASHI_E2E_WAIT_FOR_HBTC=1`)
 *    because committee latency on devnet varies (8 min – 1.5 h).
 *  - **localnet** (`HASHI_E2E_SUI_NETWORK=localnet`, set by CI): derives a
 *    deposit address, sends real BTC to it via `bitcoin-cli`, mines enough
 *    confirmations, captures the resulting txid/vout, then submits via the
 *    SDK and asserts hBTC arrival within ~60 s. The full contract — submit
 *    + committee verify + mint — is exactly what SEDEFI-190 (txid byte-order
 *    bug) silently violated for weeks; this lane is the regression backstop.
 *
 * For local devnet runs, populate `.env`:
 *   HASHI_E2E_SUI_PRIVATE_KEY=suiprivkey1…
 *   HASHI_E2E_BTC_TXID=<64-char hex, no 0x prefix>
 *   HASHI_E2E_BTC_VOUT=<integer>
 *   HASHI_E2E_BTC_AMOUNT_SATS=<integer>
 * then `pnpm test:integration`.
 */

const HBTC_POLL_INTERVAL_MS = 30_000;
const DEVNET_HBTC_TIMEOUT_MS = 15 * 60_000;
// 300 s tolerates Kyoto BIP-157 light-client peer-discovery + sync warmup
// on a cold CI runner. Empirically the "Deposit request detected" →
// "Processing" gap is ~180 s on the first deposit (validators block on
// Kyoto peering with bitcoind and back-filling block filters); once warm,
// subsequent deposits flush in <5 s. PR #11 CI run 25059655658 had
// detection→confirmation take 184 s and missed a 180 s SDK budget by 4 s.
// 300 s gives ~2× headroom over the observed steady warmup.
const LOCALNET_HBTC_TIMEOUT_MS = 300_000;
const LOCALNET_HBTC_INTERVAL_MS = 2_000;

describe('HashiClient.deposit (real network)', () => {
	if (isLocalnet()) {
		it(
			'fund regtest deposit address, submit via SDK, and verify hBTC arrival',
			async () => {
				const client = makeClient();
				// Fresh signer per test so concurrent test files don't share a
				// sender — eliminates gas-object races and hBTC cross-talk
				// between deposit.test.ts and withdrawal-lifecycle.test.ts.
				const signer = await freshFundedSigner();
				const recipient = signer.toSuiAddress();

				// A fresh signer starts with zero hBTC, so this is 0n by
				// construction. Read it anyway to keep the assertion shape
				// identical to the devnet path and resilient against any
				// future change that pre-funds new signers with hBTC.
				const balanceBefore = await fetchCoinBalance(client, recipient, btcCoinType());

				const { funded } = await fundDepositOnLocalnet(client, recipient);

				const result = await client.hashi.deposit({
					signer,
					txid: funded.txid,
					utxos: [{ vout: funded.vout, amountSats: funded.amountSats }],
					recipient,
				});

				expect(result.$kind).toBe('Transaction');
				if (result.$kind !== 'Transaction') {
					throw new Error(`Transaction failed: ${JSON.stringify(result.FailedTransaction)}`);
				}
				expect(result.Transaction.status.success).toBe(true);

				const evt = result.Transaction.events?.find((e) =>
					e.eventType.endsWith('::deposit::DepositRequested'),
				);
				expect(evt).toBeDefined();

				const target = balanceBefore + funded.amountSats;
				const final = await waitForCoinBalance(client, recipient, btcCoinType(), target, {
					timeoutMs: LOCALNET_HBTC_TIMEOUT_MS,
					intervalMs: LOCALNET_HBTC_INTERVAL_MS,
				});
				expect(final).toBeGreaterThanOrEqual(target);

				// --- view method assertions (SEDEFI-201) ---

				// The deposited UTXO should now appear in the active pool.
				const usage = await client.hashi.view.findUsedUtxos([
					{ txid: funded.txid, vout: funded.vout },
				]);
				expect(usage).toHaveLength(1);
				expect(usage[0].isUsed).toBe(true);
				expect(usage[0].inActivePool).toBe(true);

				// Transaction history should contain the deposit with correct
				// btcTxid and btcVout extracted from the on-chain DepositRequest.
				const history = await client.hashi.view.transactionHistory(recipient);
				const dep = history.find(
					(h): h is DepositHistoryItem =>
						h.kind === 'deposit' && h.btcTxid === funded.txid.replace(/^0x/, ''),
				);
				expect(dep).toBeDefined();
				expect(dep!.btcVout).toBe(funded.vout);
				expect(dep!.amountSats).toBe(funded.amountSats);
				expect(dep!.sender).toBe(recipient);
			},
			LOCALNET_HBTC_TIMEOUT_MS + 60_000,
		);
		return;
	}

	// Devnet path — env-configured signet UTXO. Fail loudly at module load
	// if any var is missing so a misconfigured `.env` doesn't masquerade as
	// a clean run with zero tests.
	const TEST_TXID = process.env.HASHI_E2E_BTC_TXID;
	const TEST_VOUT = process.env.HASHI_E2E_BTC_VOUT;
	const TEST_AMOUNT_SATS = process.env.HASHI_E2E_BTC_AMOUNT_SATS;
	if (!process.env.HASHI_E2E_SUI_PRIVATE_KEY || !TEST_TXID || !TEST_VOUT || !TEST_AMOUNT_SATS) {
		throw new Error(
			'Set HASHI_E2E_SUI_PRIVATE_KEY, HASHI_E2E_BTC_TXID, HASHI_E2E_BTC_VOUT, ' +
				'and HASHI_E2E_BTC_AMOUNT_SATS in `.env` (or run with ' +
				'HASHI_E2E_SUI_NETWORK=localnet for the localnet flow).',
		);
	}

	const waitForHBtc = process.env.HASHI_E2E_WAIT_FOR_HBTC === '1';
	const testTimeoutMs = waitForHBtc ? DEVNET_HBTC_TIMEOUT_MS + 60_000 : 120_000;

	it(
		'submits a real deposit for the configured signet UTXO and emits DepositRequested',
		async () => {
			const client = makeClient();
			const signer = makeSigner();
			const recipient = signer.toSuiAddress();
			const amountSats = BigInt(TEST_AMOUNT_SATS);

			const balanceBefore = waitForHBtc
				? await fetchCoinBalance(client, recipient, btcCoinType())
				: 0n;

			const result = await client.hashi.deposit({
				signer,
				txid: `0x${TEST_TXID}`,
				utxos: [{ vout: Number(TEST_VOUT), amountSats }],
				recipient,
			});

			expect(result.$kind).toBe('Transaction');
			if (result.$kind !== 'Transaction') {
				throw new Error(`Transaction failed: ${JSON.stringify(result.FailedTransaction)}`);
			}
			expect(result.Transaction.status.success).toBe(true);

			const evt = result.Transaction.events?.find((e) =>
				e.eventType.endsWith('::deposit::DepositRequested'),
			);
			expect(evt).toBeDefined();

			if (!waitForHBtc) return;

			const target = balanceBefore + amountSats;
			const deadline = Date.now() + DEVNET_HBTC_TIMEOUT_MS;
			// eslint-disable-next-line no-console
			console.log(
				`[deposit.test] waiting for hBTC at ${recipient}: ` +
					`before=${balanceBefore}, target=${target}, ` +
					`timeout=${DEVNET_HBTC_TIMEOUT_MS / 60_000} min`,
			);
			for (;;) {
				const current = await fetchCoinBalance(client, recipient, btcCoinType());
				if (current >= target) {
					// eslint-disable-next-line no-console
					console.log(`[deposit.test] hBTC arrived: balance=${current}`);
					expect(current).toBeGreaterThanOrEqual(target);
					return;
				}
				if (Date.now() >= deadline) {
					throw new Error(
						`hBTC did not arrive within ${DEVNET_HBTC_TIMEOUT_MS / 60_000} min — ` +
							`recipient=${recipient}, before=${balanceBefore}, ` +
							`target=${target}, last=${current}. ` +
							`Most likely the committee couldn't verify the deposit ` +
							`(check txid byte-order, BTC confirmations, or committee health).`,
					);
				}
				await new Promise((resolve) => setTimeout(resolve, HBTC_POLL_INTERVAL_MS));
			}
		},
		testTimeoutMs,
	);
});
