// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';
import {
	generateDepositAddress,
	twoOfTwoTaprootScriptPathAddress,
	deriveChildPubkey,
} from '../../src/bitcoin.js';
import { isLocalnet, makeClient } from './_env.js';

/**
 * Replaces `_show-address.test.ts`. Asserts that `generateDepositAddress`
 * returns a P2TR taproot address with the correct human-readable prefix
 * for the configured Bitcoin network — `bcrt1p…` on regtest (localnet),
 * `tb1p…` on signet/testnet (devnet). Both targets exercise the same
 * SDK code path: only the on-chain MPC key + bitcoin-network hint differ.
 *
 * Pure address derivation — no signing, no funding. A generated keypair's
 * Sui address is the only input that matters; the test never submits a tx.
 */
describe('HashiClient.generateDepositAddress (real network)', () => {
	it('returns a P2TR address whose HRP matches the configured Bitcoin network', async () => {
		const client = makeClient();
		const suiAddress = Ed25519Keypair.generate().toSuiAddress();

		const btcAddress = await client.hashi.generateDepositAddress({ suiAddress });

		const expectedPrefix = isLocalnet() ? 'bcrt1p' : 'tb1p';
		expect(btcAddress.startsWith(expectedPrefix)).toBe(true);
	}, 30_000);

	/**
	 * End-to-end cross-check: rebuild the same address through the public
	 * primitives (`view.mpcPublicKey` + `view.all().guardianBtcPublicKey` +
	 * pure helpers). Catches drift between `HashiClient.generateDepositAddress`
	 * and the lower-level primitives. If the on-chain `guardian_btc_public_key`
	 * is not yet provisioned, this test skips itself rather than failing —
	 * pre-deploy windows are expected.
	 */
	it('matches the manual primitive composition (mpc + guardian + derive + 2-of-2)', async () => {
		const client = makeClient();
		const suiAddress = Ed25519Keypair.generate().toSuiAddress();

		const [mpc, snap] = await Promise.all([
			client.hashi.view.mpcPublicKey(),
			client.hashi.view.all(),
		]);
		if (!snap.guardianBtcPublicKey) {
			// Deployment isn't guardian-provisioned yet; the unit tests cover
			// the deterministic path.
			return;
		}

		const fromClient = await client.hashi.generateDepositAddress({ suiAddress });

		const network = isLocalnet() ? 'regtest' : 'signet';
		const fromHelpers = generateDepositAddress({
			mpcMasterCompressed: mpc,
			guardianBtcXOnly: snap.guardianBtcPublicKey,
			suiAddress: fromHex(suiAddress),
			network,
		});

		// Also reconstruct via the bottom-level helper.
		const child = deriveChildPubkey(mpc, fromHex(suiAddress));
		const fromTwoOfTwo = twoOfTwoTaprootScriptPathAddress(
			snap.guardianBtcPublicKey,
			child,
			network,
		);

		expect(fromClient).toBe(fromHelpers);
		expect(fromClient).toBe(fromTwoOfTwo);
	}, 30_000);
});
