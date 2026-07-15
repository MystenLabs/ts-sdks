// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BitcoinNetwork, NetworkConfig, SuiNetwork } from './types.js';

export const NETWORK_HRP: Record<BitcoinNetwork, string> = {
	mainnet: 'bc',
	testnet: 'tb',
	signet: 'tb',
	regtest: 'bcrt',
};

/**
 * BIP-341 Nothing-Up-My-Sleeve (NUMS) internal key.
 * Has no known private key, which forces all taproot spends through the script path.
 */
// prettier-ignore
export const NUMS_KEY = new Uint8Array([
    0x50, 0x92, 0x9b, 0x74, 0xc1, 0xa0, 0x49, 0x54,
    0xb7, 0x8b, 0x4b, 0x60, 0x35, 0xe9, 0x7a, 0x5e,
    0x07, 0x8a, 0x5a, 0x0f, 0x28, 0xec, 0x96, 0xd5,
    0x47, 0xbf, 0xee, 0x9a, 0xce, 0x80, 0x3a, 0xc0,
]);

/**
 * The Move side uses this as a floor on `bitcoin_deposit_minimum` and
 * `bitcoin_withdrawal_minimum`; the SDK replicates the same floors so `view.*`
 * matches on-chain semantics. Mirrors `DUST_RELAY_MIN_VALUE` in
 * `hashi::btc_config`.
 */
export const DUST_RELAY_MIN_VALUE = 546n;

/**
 * Length of the Guardian's Ed25519 attestation public key, in bytes. Matches
 * `GUARDIAN_PUBLIC_KEY_LEN` in `hashi::config`.
 */
export const GUARDIAN_PUBLIC_KEY_LEN = 32;

/**
 * Length of the Guardian's BIP-340 x-only BTC public key, in bytes. Matches
 * `GUARDIAN_BTC_PUBLIC_KEY_LEN` in `hashi::config`.
 */
export const GUARDIAN_BTC_PUBLIC_KEY_LEN = 32;

export const NETWORK_CONFIG: Partial<Record<SuiNetwork, NetworkConfig>> = {
	devnet: {
		hashiObjectId: '0x84081242ebb05eac5e09ab2a930a60b1357d3d8bc6f927380979f72de991ccca',
		packageId: '0xa877d4d97b6a8bae1da982a84980c502c5ad2ead4b24e6c8e50c57cd6ddc3771',
		bitcoinNetwork: 'signet',
	},
	testnet: {
		hashiObjectId: '0x22c0ce66ce09df2dc88a31bd320d4177b766518b9b88010368cfbdcd724528f8',
		packageId: '0xfcea10cadbb553c4874201584abf68771592678952efd957b2e82c010c7f4360',
		bitcoinNetwork: 'signet',
	},
};
