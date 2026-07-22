// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

import type { WithdrawalHistoryItem } from '../../src/types.js';
import {
	btcCoinType,
	btcRpc,
	fetchCoinBalance,
	freshFundedSigner,
	fundDepositOnLocalnet,
	isLocalnet,
	localnetCli,
	makeClient,
	waitForCoinBalance,
} from './_env.js';

/**
 * Localnet-only — full withdrawal happy path. Complements
 * `withdrawal-lifecycle.test.ts`, which cancels the request before the
 * committee broadcasts, by letting the pipeline run end-to-end:
 *
 *   deposit → mint hBTC → request withdrawal → committee builds + signs
 *   (MPC) → broadcast to bitcoind → target address receives BTC
 *
 * The assertion is the BTC payout, not the Sui-side event: the SDK does
 * not consume `WithdrawalConfirmedEvent` (operator-only), so polling the
 * Bitcoin RPC is the most direct check that the request actually paid out.
 *
 * Skipped on devnet: the BTC payout end of the pipeline isn't reachable
 * from the SDK on devnet (no shared regtest node, no controlled wallet).
 */

// Same 300 s budget as `deposit.test.ts` — Kyoto BIP-157 warmup on cold CI.
const LOCALNET_HBTC_TIMEOUT_MS = 300_000;
const LOCALNET_HBTC_INTERVAL_MS = 2_000;

// The withdrawal pipeline (request seen → presigs allocated → MPC sign →
// broadcast) is comparable in cost to deposit confirmation on a cold
// localnet, so we budget the same 300 s. Mining 1 block per poll keeps
// the chain advancing while we wait for the broadcast tx to surface.
const LOCALNET_BTC_PAYOUT_TIMEOUT_MS = 300_000;
const LOCALNET_BTC_PAYOUT_INTERVAL_MS = 2_000;

describe.skipIf(!isLocalnet())('HashiClient withdrawal payout (localnet)', () => {
	it(
		'request withdrawal → committee broadcasts BTC → target address receives funds',
		async () => {
			const client = makeClient();
			const signer = await freshFundedSigner();
			const recipient = signer.toSuiAddress();

			// 1. Fund the deposit address and mint hBTC. Reuses the same
			//    helpers as deposit.test.ts so any flake in this stage is
			//    pre-existing rather than introduced here.
			const balanceBefore = await fetchCoinBalance(client, recipient, btcCoinType());
			const { funded } = await fundDepositOnLocalnet(client, recipient);

			const depositResult = await client.hashi.deposit({
				signer,
				txid: funded.txid,
				utxos: [{ vout: funded.vout, amountSats: funded.amountSats }],
				recipient,
			});
			expect(depositResult.$kind).toBe('Transaction');
			if (depositResult.$kind !== 'Transaction') {
				throw new Error(`Deposit tx failed: ${JSON.stringify(depositResult.FailedTransaction)}`);
			}
			expect(depositResult.Transaction.status.success).toBe(true);

			const hbtcTarget = balanceBefore + funded.amountSats;
			await waitForCoinBalance(client, recipient, btcCoinType(), hbtcTarget, {
				timeoutMs: LOCALNET_HBTC_TIMEOUT_MS,
				intervalMs: LOCALNET_HBTC_INTERVAL_MS,
			});

			// 2. Pick a withdrawal amount above the on-chain minimum and a
			//    BTC destination from a wallet we control so we can poll
			//    `getreceivedbyaddress` for arrival.
			const snap = await client.hashi.view.all();
			const withdrawAmountSats = snap.bitcoinWithdrawalMinimum + 50_000n;
			const destination = await btcRpc<string>('getnewaddress', [], { wallet: 'test' });

			const withdrawResult = await client.hashi.requestWithdrawal({
				signer,
				amountSats: withdrawAmountSats,
				bitcoinAddress: destination,
			});
			expect(withdrawResult.$kind).toBe('Transaction');
			if (withdrawResult.$kind !== 'Transaction') {
				throw new Error(
					`requestWithdrawal tx failed: ${JSON.stringify(withdrawResult.FailedTransaction)}`,
				);
			}
			expect(withdrawResult.Transaction.status.success).toBe(true);

			// 3. Poll the destination address until the committee's BTC tx
			//    surfaces. `minconf=0` includes mempool, so we see the payout
			//    as soon as the committee broadcasts — no need to wait for a
			//    confirmation. Mining 1 block per cycle keeps the chain
			//    moving in case any pipeline step waits on a new block.
			//
			//    The actual amount received is `withdrawAmountSats` minus
			//    the miner fee the committee paid. `worstCaseNetworkFee` is
			//    the upper bound on that fee, so the received amount lives
			//    in the closed interval below.
			const minReceived = withdrawAmountSats - snap.worstCaseNetworkFee;
			const deadline = Date.now() + LOCALNET_BTC_PAYOUT_TIMEOUT_MS;
			let receivedSats = 0n;
			for (;;) {
				await localnetCli(['mine', '--blocks', '1']);
				const receivedBtc = await btcRpc<number>('getreceivedbyaddress', [destination, 0], {
					wallet: 'test',
				});
				receivedSats = BigInt(Math.round(receivedBtc * 1e8));
				if (receivedSats >= minReceived) break;
				if (Date.now() >= deadline) {
					throw new Error(
						`BTC payout to ${destination} did not arrive within ` +
							`${LOCALNET_BTC_PAYOUT_TIMEOUT_MS / 1000} s — ` +
							`received=${receivedSats}, minExpected=${minReceived}, ` +
							`withdrawAmount=${withdrawAmountSats}, ` +
							`worstCaseNetworkFee=${snap.worstCaseNetworkFee}.`,
					);
				}
				await new Promise((resolve) => setTimeout(resolve, LOCALNET_BTC_PAYOUT_INTERVAL_MS));
			}

			expect(receivedSats).toBeGreaterThanOrEqual(minReceived);
			expect(receivedSats).toBeLessThanOrEqual(withdrawAmountSats);

			// --- view method assertions (SEDEFI-201) ---
			// After the committee broadcasts, the withdrawal's btcTxid
			// should be populated from the linked WithdrawalTransaction.
			const history = await client.hashi.view.transactionHistory(recipient);
			const wd = history.find(
				(h): h is WithdrawalHistoryItem =>
					h.kind === 'withdrawal' && h.btcAmountSats === withdrawAmountSats,
			);
			expect(wd).toBeDefined();
			expect(wd!.btcTxid).toBeTypeOf('string');
			expect(wd!.btcTxid).toMatch(/^[0-9a-f]{64}$/);
			// Status should be Processing, Signed, or Confirmed by this point.
			expect(['Processing', 'Signed', 'Confirmed']).toContain(wd!.status);
		},
		LOCALNET_HBTC_TIMEOUT_MS + LOCALNET_BTC_PAYOUT_TIMEOUT_MS + 120_000,
	);
});
