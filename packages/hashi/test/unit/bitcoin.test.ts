// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
	deriveChildPubkey,
	twoOfTwoTaprootScriptPathAddress,
	generateDepositAddress,
	arkworksToSec1Compressed,
	bitcoinAddressToWitnessProgram,
	witnessProgramToAddress,
} from '../../src/bitcoin.js';
import { InvalidBitcoinAddressError } from '../../src/errors.js';
import depositAddressVectors from './deposit-address-vectors.json' with { type: 'json' };
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { bech32, bech32m } from '@scure/base';
import { fromHex, toHex } from '@mysten/sui/utils';

/**
 * Deterministic test key: secret key = 2 (small-scalar convenience, used for
 * tests that just need *some* valid pubkey).
 */
const TEST_SECRET_KEY = new Uint8Array(32);
TEST_SECRET_KEY[31] = 2; // scalar = 2
const TEST_COMPRESSED_KEY = secp256k1.getPublicKey(TEST_SECRET_KEY, true);

const ZERO_ADDRESS = new Uint8Array(32); // 0x000…000

const TEST_GUARDIAN_BTC_X_ONLY = secp256k1.getPublicKey(new Uint8Array(32).fill(1), true).slice(1);

describe('deriveChildPubkey', () => {
	it('returns a 32-byte x-only key', () => {
		const child = deriveChildPubkey(TEST_COMPRESSED_KEY, ZERO_ADDRESS);
		expect(child).toBeInstanceOf(Uint8Array);
		expect(child.length).toBe(32);
	});

	it('produces different keys for different Sui addresses', () => {
		const addr1 = new Uint8Array(32);
		addr1[31] = 1;
		const addr2 = new Uint8Array(32);
		addr2[31] = 2;

		const child1 = deriveChildPubkey(TEST_COMPRESSED_KEY, addr1);
		const child2 = deriveChildPubkey(TEST_COMPRESSED_KEY, addr2);

		expect(child1).not.toEqual(child2);
	});

	it('is deterministic', () => {
		const a = deriveChildPubkey(TEST_COMPRESSED_KEY, ZERO_ADDRESS);
		const b = deriveChildPubkey(TEST_COMPRESSED_KEY, ZERO_ADDRESS);
		expect(a).toEqual(b);
	});

	it('throws for wrong key length', () => {
		expect(() => deriveChildPubkey(new Uint8Array(32), ZERO_ADDRESS)).toThrow('33-byte');
	});

	it('throws for wrong address length', () => {
		expect(() => deriveChildPubkey(TEST_COMPRESSED_KEY, new Uint8Array(20))).toThrow('32-byte');
	});
});

describe('arkworksToSec1Compressed', () => {
	it('converts a known arkworks key to valid SEC1 compressed format', () => {
		// Known devnet MPC key in arkworks format
		const ark = fromHex('0x466d7e0035ec8c4b3056d28c9faab29228a89332a12dec1a6a68aaa5669d9e0380');
		const sec1 = arkworksToSec1Compressed(ark);

		expect(sec1.length).toBe(33);
		// SEC1 prefix must be 0x02 or 0x03
		expect([0x02, 0x03]).toContain(sec1[0]);
		// x-coordinate should be the LE bytes reversed to BE
		expect(Buffer.from(sec1.slice(1)).toString('hex')).toBe(
			'039e9d66a5aa686a1aec2da13293a82892b2aa9f8cd256304b8cec35007e6d46',
		);
	});

	it('round-trips a SEC1 key through arkworks encoding', () => {
		// Build an arkworks-encoded version of TEST_COMPRESSED_KEY (SEC1, secret=2):
		// SEC1: prefix(1) + x_be(32).  Arkworks: x_le(32) + flags(1).
		const xBe = TEST_COMPRESSED_KEY.slice(1); // 32-byte BE x-coordinate
		const xLe = new Uint8Array(xBe).reverse(); // LE

		// Determine arkworks flag: y > (p-1)/2 → bit 7
		const Point = secp256k1.Point;
		const point = Point.fromBytes(TEST_COMPRESSED_KEY);
		const y = point.toAffine().y;
		const p = Point.CURVE().p;
		const yIsNeg = y > (p - 1n) / 2n;

		const ark = new Uint8Array(33);
		ark.set(xLe, 0);
		ark[32] = yIsNeg ? 0x80 : 0x00;

		const sec1 = arkworksToSec1Compressed(ark);

		// Must recover the original SEC1 compressed key
		expect(sec1).toEqual(TEST_COMPRESSED_KEY);
	});

	it('throws for wrong length', () => {
		expect(() => arkworksToSec1Compressed(new Uint8Array(32))).toThrow('33-byte');
	});
});

describe('twoOfTwoTaprootScriptPathAddress', () => {
	const guardian = TEST_GUARDIAN_BTC_X_ONLY;
	const childKey = deriveChildPubkey(TEST_COMPRESSED_KEY, ZERO_ADDRESS);

	it('returns a bech32m address with correct prefix per network', () => {
		expect(twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'mainnet')).toMatch(/^bc1p/);
		expect(twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'testnet')).toMatch(/^tb1p/);
		expect(twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'signet')).toMatch(/^tb1p/);
		expect(twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'regtest')).toMatch(/^bcrt1p/);
	});

	it('is deterministic', () => {
		const a = twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'testnet');
		const b = twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'testnet');
		expect(a).toBe(b);
	});

	it('differs when guardian and MPC-child arguments are swapped', () => {
		// The Rust descriptor is `tr(NUMS, multi_a(2, enclave, derived_hashi))` —
		// miniscript does NOT auto-sort keys. Swapping the two arguments must
		// produce a different address, otherwise we've accidentally introduced
		// canonical sorting and the SDK would silently diverge from the bridge.
		const a = twoOfTwoTaprootScriptPathAddress(guardian, childKey, 'regtest');
		const b = twoOfTwoTaprootScriptPathAddress(childKey, guardian, 'regtest');
		expect(a).not.toBe(b);
	});

	it('rejects non-32-byte inputs', () => {
		expect(() => twoOfTwoTaprootScriptPathAddress(new Uint8Array(31), childKey, 'testnet')).toThrow(
			'32-byte',
		);
		expect(() => twoOfTwoTaprootScriptPathAddress(guardian, new Uint8Array(33), 'testnet')).toThrow(
			'32-byte',
		);
	});
});

describe('generateDepositAddress', () => {
	it('produces a valid P2TR address end-to-end', () => {
		const suiAddr = new Uint8Array(32);
		suiAddr[31] = 0x42;

		const btcAddress = generateDepositAddress({
			mpcMasterCompressed: TEST_COMPRESSED_KEY,
			guardianBtcXOnly: TEST_GUARDIAN_BTC_X_ONLY,
			suiAddress: suiAddr,
			network: 'regtest',
		});

		expect(btcAddress).toMatch(/^bcrt1p/);
		expect(btcAddress.length).toBeGreaterThan(40);
	});

	it('matches manual two-step derivation', () => {
		const suiAddr = new Uint8Array(32);
		suiAddr[0] = 0xab;

		const composed = generateDepositAddress({
			mpcMasterCompressed: TEST_COMPRESSED_KEY,
			guardianBtcXOnly: TEST_GUARDIAN_BTC_X_ONLY,
			suiAddress: suiAddr,
			network: 'testnet',
		});

		const child = deriveChildPubkey(TEST_COMPRESSED_KEY, suiAddr);
		const manual = twoOfTwoTaprootScriptPathAddress(TEST_GUARDIAN_BTC_X_ONLY, child, 'testnet');

		expect(composed).toBe(manual);
	});

	// Generated by hashi's `regenerate_deposit_address_vectors` and copied
	// verbatim; hashi-ci.yml fails when this copy drifts from hashi main.
	it.each(depositAddressVectors)('matches the Rust bridge: vector %#', (vector) => {
		const mpcMasterCompressed = arkworksToSec1Compressed(fromHex(vector.mpc_public_key));
		const suiAddress = fromHex(vector.derivation_path);
		expect(toHex(deriveChildPubkey(mpcMasterCompressed, suiAddress))).toBe(vector.child_pubkey);

		for (const network of ['mainnet', 'signet', 'regtest'] as const) {
			const btcAddress = generateDepositAddress({
				mpcMasterCompressed,
				guardianBtcXOnly: fromHex(vector.guardian_btc_public_key),
				suiAddress,
				network,
			});
			expect(btcAddress).toBe(vector.address[network]);
		}
	});
});

describe('bitcoinAddressToWitnessProgram', () => {
	// BIP-173 canonical mainnet P2WPKH test vector.
	const BIP173_P2WPKH = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
	const BIP173_PROGRAM_HEX = '751e76e8199196d454941c45d1b3a323f1433bd6';

	/**
	 * Encode (hrp, version, program) into a bech32(m) SegWit address. Used to
	 * construct edge-case inputs: wrong-variant checksums, unsupported
	 * versions, mismatched program lengths. `@scure/base` doesn't enforce
	 * SegWit-specific rules (v0/20|32, version-variant coupling), so we can
	 * produce technically-invalid combinations and let the decoder reject
	 * them.
	 */
	function encode(
		hrp: string,
		version: number,
		program: Uint8Array,
		variant: 'bech32' | 'bech32m',
	): string {
		const codec = variant === 'bech32' ? bech32 : bech32m;
		const words = [version, ...codec.toWords(program)];
		return codec.encode(hrp as 'bc' | 'tb' | 'bcrt', words);
	}

	const P2WPKH_PROGRAM = new Uint8Array(20).fill(0x01);
	const P2TR_PROGRAM = new Uint8Array(32).fill(0x02);

	it('decodes a BIP-173 canonical P2WPKH mainnet address', () => {
		const { version, program } = bitcoinAddressToWitnessProgram(BIP173_P2WPKH, 'mainnet');
		expect(version).toBe(0);
		expect(program).toBeInstanceOf(Uint8Array);
		expect(program.length).toBe(20);
		expect(Buffer.from(program).toString('hex')).toBe(BIP173_PROGRAM_HEX);
	});

	it('decodes a constructed mainnet P2TR (v1, 32-byte, bech32m)', () => {
		const addr = encode('bc', 1, P2TR_PROGRAM, 'bech32m');
		const { version, program } = bitcoinAddressToWitnessProgram(addr, 'mainnet');
		expect(version).toBe(1);
		expect(program).toEqual(P2TR_PROGRAM);
	});

	it('decodes a signet P2TR (tb1p…)', () => {
		const addr = encode('tb', 1, P2TR_PROGRAM, 'bech32m');
		const { version, program } = bitcoinAddressToWitnessProgram(addr, 'signet');
		expect(version).toBe(1);
		expect(program).toEqual(P2TR_PROGRAM);
	});

	it('decodes a regtest P2WPKH (bcrt1q…)', () => {
		const addr = encode('bcrt', 0, P2WPKH_PROGRAM, 'bech32');
		const { version, program } = bitcoinAddressToWitnessProgram(addr, 'regtest');
		expect(version).toBe(0);
		expect(program).toEqual(P2WPKH_PROGRAM);
	});

	it('rejects garbage strings with code `malformed`', () => {
		try {
			bitcoinAddressToWitnessProgram('not-an-address', 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('malformed');
			expect((err as InvalidBitcoinAddressError).address).toBe('not-an-address');
		}
	});

	it('rejects legacy base58 addresses with code `malformed`', () => {
		const legacy = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
		try {
			bitcoinAddressToWitnessProgram(legacy, 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('malformed');
		}
	});

	it('rejects a v0 address encoded with bech32m (bad-checksum per BIP-350)', () => {
		const addr = encode('bc', 0, P2WPKH_PROGRAM, 'bech32m');
		try {
			bitcoinAddressToWitnessProgram(addr, 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('bad-checksum');
		}
	});

	it('rejects a v1 address encoded with bech32 (bad-checksum per BIP-350)', () => {
		const addr = encode('bc', 1, P2TR_PROGRAM, 'bech32');
		try {
			bitcoinAddressToWitnessProgram(addr, 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('bad-checksum');
		}
	});

	it('rejects a mainnet address on signet with code `wrong-network`', () => {
		try {
			bitcoinAddressToWitnessProgram(BIP173_P2WPKH, 'signet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('wrong-network');
		}
	});

	it('rejects witness version 2 with code `unsupported-version`', () => {
		const addr = encode('bc', 2, P2TR_PROGRAM, 'bech32m');
		try {
			bitcoinAddressToWitnessProgram(addr, 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('unsupported-version');
		}
	});

	it('rejects v0 with a 32-byte program (P2WSH — not supported)', () => {
		const addr = encode('bc', 0, P2TR_PROGRAM, 'bech32');
		try {
			bitcoinAddressToWitnessProgram(addr, 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('bad-program-length');
		}
	});

	it('rejects v1 with a 20-byte program', () => {
		const addr = encode('bc', 1, P2WPKH_PROGRAM, 'bech32m');
		try {
			bitcoinAddressToWitnessProgram(addr, 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidBitcoinAddressError);
			expect((err as InvalidBitcoinAddressError).code).toBe('bad-program-length');
		}
	});

	it('echoes the original input in `.address`', () => {
		try {
			bitcoinAddressToWitnessProgram('foo', 'mainnet');
			expect.fail('expected to throw');
		} catch (err) {
			expect((err as InvalidBitcoinAddressError).address).toBe('foo');
		}
	});
});

describe('witnessProgramToAddress', () => {
	it('round-trips a P2WPKH address (v0, 20 bytes)', () => {
		const program = new Uint8Array(20).fill(0xaa);
		const addr = witnessProgramToAddress(program, 'regtest');
		expect(addr).toMatch(/^bcrt1q/);

		const decoded = bitcoinAddressToWitnessProgram(addr, 'regtest');
		expect(decoded.version).toBe(0);
		expect(new Uint8Array(decoded.program)).toEqual(program);
	});

	it('round-trips a P2TR address (v1, 32 bytes)', () => {
		const program = new Uint8Array(32).fill(0xbb);
		const addr = witnessProgramToAddress(program, 'regtest');
		expect(addr).toMatch(/^bcrt1p/);

		const decoded = bitcoinAddressToWitnessProgram(addr, 'regtest');
		expect(decoded.version).toBe(1);
		expect(new Uint8Array(decoded.program)).toEqual(program);
	});

	it('produces correct HRP for each network', () => {
		const program20 = new Uint8Array(20).fill(0x01);
		expect(witnessProgramToAddress(program20, 'mainnet')).toMatch(/^bc1q/);
		expect(witnessProgramToAddress(program20, 'testnet')).toMatch(/^tb1q/);
		expect(witnessProgramToAddress(program20, 'signet')).toMatch(/^tb1q/);
		expect(witnessProgramToAddress(program20, 'regtest')).toMatch(/^bcrt1q/);
	});

	it('throws for unsupported program lengths', () => {
		expect(() => witnessProgramToAddress(new Uint8Array(16), 'mainnet')).toThrow(
			'Unsupported witness program length',
		);
	});

	it('is the inverse of bitcoinAddressToWitnessProgram', () => {
		// Encode a known mainnet P2WPKH
		const knownAddr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
		const { program } = bitcoinAddressToWitnessProgram(knownAddr, 'mainnet');
		const reencoded = witnessProgramToAddress(new Uint8Array(program), 'mainnet');
		expect(reencoded).toBe(knownAddr);
	});
});
