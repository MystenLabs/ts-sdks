// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Bitcoin address derivation for Hashi deposit addresses.
 *
 * Hashi bridges Bitcoin and Sui by assigning each Sui address a unique Bitcoin
 * deposit address. When BTC is sent to that address, the Hashi MPC committee
 * and the Hashi guardian co-sign the withdrawal that spends it, and the bridge
 * mints equivalent tokens on Sui.
 *
 * The deposit address is a Pay-to-Taproot (P2TR / BIP-341) script-path address
 * with two leaves: an immediate `multi_a(2, guardian_btc_pubkey,
 * derive(mpc_master, sui_address))` spend, and a delayed MPC-only recovery
 * spend after Hashi's BIP-68 relative timelock.
 *
 * The full derivation pipeline is:
 *
 * 1. **Fetch** the MPC master key from on-chain (`CommitteeSet.mpc_public_key`)
 *    and the guardian's BTC public key from the on-chain config
 *    (`guardian_btc_public_key`). The MPC bytes use the arkworks compressed
 *    format and must first be converted to SEC1 via
 *    {@link arkworksToSec1Compressed} — done automatically by the client's
 *    `view.mpcPublicKey()`. The guardian key is already in BIP-340 x-only form.
 *
 * 2. **Derive** a child MPC key: `child = masterKey + HKDF-SHA3-256(x ‖ suiAddr) × G`
 *    (see {@link deriveChildPubkey}). This replicates the Rust function
 *    `fastcrypto_tbls::threshold_schnorr::key_derivation::derive_verifying_key`.
 *
 * 3. **Build** the taproot address:
 *    `tr(NUMS, {multi_a(2, guardian, child), and_v(v:older(delay), pk(child))})`
 *    where NUMS is a Nothing-Up-My-Sleeve point with no known private key,
 *    forcing all spends through the script path (see
 *    {@link twoOfTwoTaprootScriptPathAddress}).
 *
 * The end-to-end helper {@link generateDepositAddress} combines steps 2–3.
 *
 * Mirrors `taproot_address` in `crates/hashi-types/src/bitcoin/taproot.rs`.
 * Cross-language test vectors live in both this file's unit tests and the
 * matching Rust unit test `cross_lang_2of2_test_vectors`.
 *
 * @see https://mystenlabs.github.io/hashi/design/address-scheme.html
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha3_256 } from '@noble/hashes/sha3.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from '@noble/hashes/utils.js';
import { bech32, bech32m } from '@scure/base';
import { NETWORK_HRP, NUMS_KEY } from './constants.js';
import { InvalidBitcoinAddressError } from './errors.js';

import type { BitcoinNetwork } from './types.js';

const Point = secp256k1.Point;
const CURVE_ORDER = Point.CURVE().n;

const NUMS_POINT = Point.fromBytes(concatBytes(new Uint8Array([0x02]), NUMS_KEY));
const HASHI_MPC_RECOVERY_DELAY_SECONDS = 60 * 24 * 60 * 60;
const HASHI_MPC_RECOVERY_DELAY_SEQUENCE =
	(1 << 22) | Math.ceil(HASHI_MPC_RECOVERY_DELAY_SECONDS / 512);

// ---------------------------------------------------------------------------
//  Internal helpers
// ---------------------------------------------------------------------------

/** BIP-340 tagged hash: SHA256(SHA256(tag) ‖ SHA256(tag) ‖ msg) */
function taggedHash(tag: string, ...msgs: Uint8Array[]): Uint8Array {
	const tagHash = sha256(new TextEncoder().encode(tag));
	return sha256(concatBytes(tagHash, tagHash, ...msgs));
}

/** Interpret a byte array as a big-endian unsigned integer. */
function bytesToNumberBE(bytes: Uint8Array): bigint {
	let n = 0n;
	for (const byte of bytes) {
		n = (n << 8n) | BigInt(byte);
	}
	return n;
}

/** CompactSize for scripts small enough to fit in one byte. */
function compactSize(len: number): Uint8Array {
	if (len >= 253) {
		throw new Error(`Unsupported script length ${len}`);
	}
	return new Uint8Array([len]);
}

function scriptNum(n: number): Uint8Array {
	if (n === 0) return new Uint8Array();

	const bytes: number[] = [];
	let value = n;
	while (value > 0) {
		bytes.push(value & 0xff);
		value >>= 8;
	}
	if ((bytes[bytes.length - 1] & 0x80) !== 0) {
		bytes.push(0);
	}
	return new Uint8Array(bytes);
}

function pushBytes(bytes: Uint8Array): Uint8Array {
	if (bytes.length >= 0x4c) {
		throw new Error(`Unsupported push length ${bytes.length}`);
	}
	return concatBytes(new Uint8Array([bytes.length]), bytes);
}

function lexicographicCompare(a: Uint8Array, b: Uint8Array): number {
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return a.length - b.length;
}

function tapLeafHash(script: Uint8Array): Uint8Array {
	return taggedHash('TapLeaf', new Uint8Array([0xc0]), compactSize(script.length), script);
}

function tapBranchHash(a: Uint8Array, b: Uint8Array): Uint8Array {
	return lexicographicCompare(a, b) <= 0
		? taggedHash('TapBranch', a, b)
		: taggedHash('TapBranch', b, a);
}

// ---------------------------------------------------------------------------
//  Format conversion
// ---------------------------------------------------------------------------

/**
 * Converts a 33-byte arkworks-compressed secp256k1 point to 33-byte SEC1 compressed format.
 *
 * The on-chain `CommitteeSet.mpc_public_key` is serialised with `ark-serialize`
 * (via `bcs::to_bytes` in the Rust node), which uses a different compressed
 * layout than the SEC1/X9.62 standard that `@noble/curves` expects:
 *
 * | Property       | ark-serialize              | SEC1 (noble)             |
 * |----------------|----------------------------|--------------------------|
 * | Byte order     | **little-endian** x        | **big-endian** x         |
 * | Y-parity       | flag in **last** byte      | prefix **first** byte    |
 * | Parity meaning | "negative" (y > (p-1)/2)   | even / odd (y mod 2)     |
 *
 * Because the parity conventions differ, we cannot simply remap the flag bit —
 * we must lift the x-coordinate onto the curve to recover y, then check its
 * parity in both systems.
 *
 * @param ark - 33-byte arkworks-compressed point
 *   (bytes [0..32] = x in little-endian, byte [32] = flags with bit 7 = y_is_negative)
 * @returns 33-byte SEC1 compressed point (prefix 0x02 | 0x03, then x in big-endian)
 */
export function arkworksToSec1Compressed(ark: Uint8Array): Uint8Array {
	if (ark.length !== 33) {
		throw new Error(`Expected 33-byte arkworks-compressed key, got ${ark.length}`);
	}

	const flags = ark[32];
	const yIsNegative = (flags >> 7) & 1; // bit 7: y > (p-1)/2 in arkworks

	// x-coordinate: first 32 bytes in LE → reverse to BE.
	const xBe = new Uint8Array(ark.slice(0, 32)).reverse();

	// Lift x onto the curve with a trial SEC1 prefix (0x02 = even y).
	const trial = new Uint8Array(33);
	trial[0] = 0x02;
	trial.set(xBe, 1);

	const trialPoint = Point.fromBytes(trial);
	const y = trialPoint.toAffine().y;

	// arkworks "negative" = y > (p-1)/2.  Determine whether the trial y satisfies that.
	const p = Point.CURVE().p;
	const trialIsNeg = y > (p - 1n) / 2n;

	// If the trial parity doesn't match the arkworks flag, flip the prefix.
	const prefix = (yIsNegative === 1) !== trialIsNeg ? 0x03 : 0x02;

	const sec1 = new Uint8Array(33);
	sec1[0] = prefix;
	sec1.set(xBe, 1);
	return sec1;
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

/**
 * Derives a child x-only public key from the MPC master key and a Sui address.
 *
 * This is the core key-derivation step that gives each Sui address its own
 * unique Bitcoin public key. The MPC committee can sign for this child key
 * (using threshold Schnorr with additive tweaking), which is what authorises
 * a withdrawal transaction on the Bitcoin side.
 *
 * Replicates the Rust function
 * `fastcrypto_tbls::threshold_schnorr::key_derivation::derive_verifying_key`:
 *
 * ```text
 * tweak = HKDF-SHA3-256(ikm = parent_x ‖ sui_address, len = 64) mod n
 * child = parent + tweak × G
 * ```
 *
 * The tweak is derived deterministically from the master key's x-coordinate
 * concatenated with the depositor's Sui address, using HKDF with SHA3-256 as
 * the underlying hash. The 64-byte output is reduced mod n (the secp256k1
 * group order) to produce a scalar, which is then used as an additive tweak
 * on the master public key.
 *
 * The returned value is the 32-byte x-only form of the child key (the
 * x-coordinate only, without a parity prefix). This is the format expected
 * by BIP-340 Schnorr signatures and BIP-341 taproot constructions.
 *
 * @param mpcKeyCompressed - 33-byte SEC1 compressed secp256k1 public key
 *   (the MPC master key, after arkworks-to-SEC1 conversion)
 * @param suiAddress - 32-byte Sui address used as the derivation path
 * @returns 32-byte x-only public key of the derived child
 */
export function deriveChildPubkey(
	mpcKeyCompressed: Uint8Array,
	suiAddress: Uint8Array,
): Uint8Array {
	if (mpcKeyCompressed.length !== 33) {
		throw new Error(`Expected 33-byte compressed MPC key, got ${mpcKeyCompressed.length}`);
	}
	if (suiAddress.length !== 32) {
		throw new Error(`Expected 32-byte Sui address, got ${suiAddress.length}`);
	}

	// Parse the compressed key, preserving y-parity from the prefix byte.
	const parentPoint = Point.fromBytes(mpcKeyCompressed);

	// x-coordinate is bytes [1..33] of the compressed representation.
	const xBytes = mpcKeyCompressed.slice(1);

	// HKDF-SHA3-256(ikm = x ‖ address, salt = ∅, info = ∅, len = 64)
	const ikm = concatBytes(xBytes, suiAddress);
	const tweakBytes = hkdf(sha3_256, ikm, undefined, undefined, 64);

	// Reduce the 64-byte big-endian integer mod the secp256k1 group order.
	const tweakScalar = bytesToNumberBE(tweakBytes) % CURVE_ORDER;

	// child = parent + tweak × G
	const childPoint = parentPoint.add(Point.BASE.multiply(tweakScalar));

	// Return the x-coordinate (32 bytes). The x value is the same regardless
	// of whether the child point has even or odd y.
	return childPoint.toBytes(true).slice(1);
}

/**
 * Builds Hashi's P2TR script-path-only deposit address:
 * `tr(NUMS, {multi_a(2, guardian, derived_mpc), and_v(v:older(delay), pk(derived_mpc))})`.
 *
 * The leaf script is a BIP-342 `multi_a` 2-of-2 — both Schnorr signatures must
 * be present to spend, ordered so that the witness stack is
 * `[derived_mpc_sig, guardian_sig, leaf_script, control_block]` (LIFO). This
 * is the exact immediate-spend script the bridge's withdrawal path constructs
 * in `crates/hashi-types/src/bitcoin/taproot.rs`'s `compute_taproot_descriptor`.
 *
 * The leaf script is exactly 70 bytes:
 *
 * ```text
 * 0x20 ‖ guardian   (32)   // OP_PUSHBYTES_32 <pk1>
 * 0xAC                     // OP_CHECKSIG
 * 0x20 ‖ derived_mpc(32)   // OP_PUSHBYTES_32 <pk2>
 * 0xBA                     // OP_CHECKSIGADD
 * 0x52                     // OP_2 (push small int 2)
 * 0x9C                     // OP_NUMEQUAL
 * ```
 *
 * Note `0x52` (OP_2) — not `0x01 0x02` — because `rust-miniscript`'s `multi_a`
 * codegen routes through `Builder::push_int(2)` which emits the small-num
 * opcode. A literal pushdata would change the leaf hash and the address.
 *
 * The recovery leaf script is a BIP-342 `and_v(v:older(delay), pk(derived_mpc))`:
 * after Hashi's 60-day BIP-68 relative timelock, the MPC child key alone can
 * spend the output if the guardian key is unavailable.
 *
 * The taproot output key is computed per BIP-341:
 *
 * ```text
 * leaf1     = tagged_hash("TapLeaf",  0xC0 ‖ compact_size(two_of_two_script) ‖ two_of_two_script)
 * leaf2     = tagged_hash("TapLeaf",  0xC0 ‖ compact_size(recovery_script) ‖ recovery_script)
 * root      = tagged_hash("TapBranch", min(leaf1, leaf2) ‖ max(leaf1, leaf2))
 * tweak     = tagged_hash("TapTweak", NUMS ‖ root)
 * outputKey = NUMS + tweak × G
 * ```
 *
 * **Argument ordering is load-bearing.** Guardian first, derived-MPC second.
 * Swapping them produces a different (but real-looking) `tb1p…` whose
 * withdrawals the bridge cannot spend.
 *
 * @param guardianBtcXOnly - 32-byte BIP-340 x-only guardian BTC public key
 *   (from the on-chain `guardian_btc_public_key` config)
 * @param derivedMpcXOnly - 32-byte x-only public key for the MPC-derived child
 *   (output of {@link deriveChildPubkey})
 * @param network - Bitcoin network for the bech32m human-readable prefix
 * @returns bech32m-encoded P2TR address (e.g. `bc1p…`, `tb1p…`, `bcrt1p…`)
 */
export function twoOfTwoTaprootScriptPathAddress(
	guardianBtcXOnly: Uint8Array,
	derivedMpcXOnly: Uint8Array,
	network: BitcoinNetwork,
): string {
	if (guardianBtcXOnly.length !== 32) {
		throw new Error(`Expected 32-byte x-only guardian pubkey, got ${guardianBtcXOnly.length}`);
	}
	if (derivedMpcXOnly.length !== 32) {
		throw new Error(`Expected 32-byte x-only derived MPC pubkey, got ${derivedMpcXOnly.length}`);
	}

	// Tapscript:
	//   OP_PUSHBYTES_32 <guardian>    OP_CHECKSIG
	//   OP_PUSHBYTES_32 <derived_mpc> OP_CHECKSIGADD
	//   OP_2 OP_NUMEQUAL
	const twoOfTwoScript = new Uint8Array(70);
	twoOfTwoScript[0] = 0x20; // OP_PUSHBYTES_32
	twoOfTwoScript.set(guardianBtcXOnly, 1);
	twoOfTwoScript[33] = 0xac; // OP_CHECKSIG
	twoOfTwoScript[34] = 0x20; // OP_PUSHBYTES_32
	twoOfTwoScript.set(derivedMpcXOnly, 35);
	twoOfTwoScript[67] = 0xba; // OP_CHECKSIGADD
	twoOfTwoScript[68] = 0x52; // OP_2
	twoOfTwoScript[69] = 0x9c; // OP_NUMEQUAL

	// Tapscript for `and_v(v:older(delay), pk(derived_mpc))`:
	//   <bip68_sequence> OP_CHECKSEQUENCEVERIFY OP_VERIFY <derived_mpc> OP_CHECKSIG
	const recoveryScript = concatBytes(
		pushBytes(scriptNum(HASHI_MPC_RECOVERY_DELAY_SEQUENCE)),
		new Uint8Array([0xb2, 0x69, 0x20]), // OP_CHECKSEQUENCEVERIFY OP_VERIFY OP_PUSHBYTES_32
		derivedMpcXOnly,
		new Uint8Array([0xac]), // OP_CHECKSIG
	);

	const merkleRoot = tapBranchHash(tapLeafHash(twoOfTwoScript), tapLeafHash(recoveryScript));

	// Tweak (BIP-341): tagged_hash("TapTweak", internal_key ‖ merkle_root).
	const tweak = taggedHash('TapTweak', NUMS_KEY, merkleRoot);
	const tweakScalar = bytesToNumberBE(tweak) % CURVE_ORDER;

	// Output key = NUMS + tweak × G
	const outputPoint = NUMS_POINT.add(Point.BASE.multiply(tweakScalar));
	const outputKey = outputPoint.toBytes(true).slice(1); // 32-byte x-only

	const words = [1, ...bech32m.toWords(outputKey)];
	return bech32m.encode(NETWORK_HRP[network], words);
}

/**
 * Named-args input bundle for {@link generateDepositAddress}. Using named args
 * avoids the foot-gun of two 32-byte `Uint8Array`s in adjacent positions —
 * swapping `guardianBtcXOnly` and `suiAddress` would silently produce a valid
 * but wrong address.
 */
export interface DepositAddressInputs {
	/**
	 * 33-byte SEC1-compressed secp256k1 MPC master key (post-arkworks
	 * conversion). See {@link arkworksToSec1Compressed}.
	 */
	readonly mpcMasterCompressed: Uint8Array;
	/**
	 * 32-byte BIP-340 x-only guardian BTC public key (from the on-chain
	 * `guardian_btc_public_key` config).
	 */
	readonly guardianBtcXOnly: Uint8Array;
	/** 32-byte Sui address used as the derivation path. */
	readonly suiAddress: Uint8Array;
	/** Bitcoin network (determines the bech32m address prefix). */
	readonly network: BitcoinNetwork;
}

/**
 * Generates a Bitcoin P2TR deposit address for a Sui address.
 *
 * Main entry point for the address derivation pipeline. Combines
 * {@link deriveChildPubkey} and {@link twoOfTwoTaprootScriptPathAddress} into
 * a single call. The produced address matches the Rust node's
 * `hashi_types::bitcoin::taproot::taproot_address` byte-for-byte.
 *
 * The address scheme is:
 * ```text
 * tr(NUMS, {multi_a(2, guardian, derive(mpc_master, sui_address)),
 *           and_v(v:older(delay), pk(derive(mpc_master, sui_address)))})
 * ```
 *
 * @returns bech32m-encoded P2TR deposit address (e.g. `tb1p…` for signet)
 */
export function generateDepositAddress({
	mpcMasterCompressed,
	guardianBtcXOnly,
	suiAddress,
	network,
}: DepositAddressInputs): string {
	const childXOnly = deriveChildPubkey(mpcMasterCompressed, suiAddress);
	return twoOfTwoTaprootScriptPathAddress(guardianBtcXOnly, childXOnly, network);
}

// ---------------------------------------------------------------------------
//  Withdrawal address decoding
// ---------------------------------------------------------------------------

/**
 * Decodes a bech32/bech32m SegWit Bitcoin address into a witness program.
 *
 * Hashi withdrawals send BTC to a witness-program output, so the SDK only
 * accepts the two address types the MPC committee currently supports:
 *
 *   - **P2WPKH** — witness version 0, 20-byte program (`bc1q…`, `tb1q…`)
 *   - **P2TR**   — witness version 1, 32-byte program (`bc1p…`, `tb1p…`)
 *
 * Legacy base58 addresses (`1…`, `3…`) aren't bech32 at all and surface as
 * `"malformed"`. Version-0 32-byte P2WSH is rejected (no committee support).
 *
 * Per BIP-350, v0 must use a bech32 checksum and v1+ must use bech32m. This
 * function enforces that rule strictly — a v0 address encoded as bech32m
 * (or vice versa) fails with `"bad-checksum"`.
 *
 * @param address - User-supplied Bitcoin address string
 * @param network - Expected Bitcoin network; the HRP must match
 * @returns `{ version, program }` — witness version + raw program bytes
 * @throws {@link InvalidBitcoinAddressError} with a structured `code` on any failure
 */
export function bitcoinAddressToWitnessProgram(
	address: string,
	network: BitcoinNetwork,
): { version: number; program: Uint8Array } {
	const expectedHrp = NETWORK_HRP[network];

	// Try both checksum variants and record which one validated. We defer the
	// BIP-350 version ↔ variant enforcement until after we know the version,
	// so we can emit a targeted `"bad-checksum"` instead of a generic parse
	// failure when the user encoded with the wrong variant.
	let decoded: { prefix: string; words: number[] } | undefined;
	let variant: 'bech32' | 'bech32m' | undefined;
	try {
		decoded = bech32.decode(address as `${string}1${string}`);
		variant = 'bech32';
	} catch {
		// fall through to bech32m
	}
	if (!decoded) {
		try {
			decoded = bech32m.decode(address as `${string}1${string}`);
			variant = 'bech32m';
		} catch (cause) {
			throw new InvalidBitcoinAddressError(
				{
					address,
					code: 'malformed',
					message: `Bitcoin address "${address}" is not valid bech32 or bech32m.`,
				},
				{ cause },
			);
		}
	}

	if (decoded.words.length === 0) {
		throw new InvalidBitcoinAddressError({
			address,
			code: 'malformed',
			message: `Bitcoin address "${address}" has no data payload.`,
		});
	}

	const version = decoded.words[0];

	// BIP-350: witness v0 → bech32, v1+ → bech32m. Cross-variant encodings
	// are malformed per spec even if the bits decode cleanly.
	const expectedVariant = version === 0 ? 'bech32' : 'bech32m';
	if (variant !== expectedVariant) {
		throw new InvalidBitcoinAddressError({
			address,
			code: 'bad-checksum',
			message:
				`Bitcoin address "${address}" has witness version ${version} but a ` +
				`${variant} checksum; BIP-350 requires ${expectedVariant} for this version.`,
		});
	}

	if (decoded.prefix !== expectedHrp) {
		throw new InvalidBitcoinAddressError({
			address,
			code: 'wrong-network',
			message:
				`Bitcoin address "${address}" uses HRP "${decoded.prefix}" but the client ` +
				`is configured for ${network} (expected "${expectedHrp}").`,
		});
	}

	if (version !== 0 && version !== 1) {
		throw new InvalidBitcoinAddressError({
			address,
			code: 'unsupported-version',
			message:
				`Bitcoin address "${address}" has witness version ${version}; ` +
				`Hashi supports only v0 (P2WPKH) and v1 (P2TR).`,
		});
	}

	const program = bech32.fromWords(decoded.words.slice(1));

	const expectedLen = version === 0 ? 20 : 32;
	if (program.length !== expectedLen) {
		throw new InvalidBitcoinAddressError({
			address,
			code: 'bad-program-length',
			message:
				`Bitcoin address "${address}" has a ${program.length}-byte witness program; ` +
				`v${version} (${version === 0 ? 'P2WPKH' : 'P2TR'}) requires ${expectedLen} bytes.`,
		});
	}

	return { version, program };
}

/**
 * Encodes a witness program back into a bech32/bech32m Bitcoin address.
 *
 * Inverse of {@link bitcoinAddressToWitnessProgram}. Useful for displaying
 * the Bitcoin address associated with a withdrawal request whose on-chain
 * state stores only the raw witness program bytes.
 *
 * @param program - Raw witness program bytes (20 for P2WPKH, 32 for P2TR)
 * @param network - Bitcoin network for the HRP
 * @returns Encoded bech32 (v0) or bech32m (v1+) address
 */
export function witnessProgramToAddress(program: Uint8Array, network: BitcoinNetwork): string {
	const hrp = NETWORK_HRP[network];

	if (program.length === 20) {
		const words = [0, ...bech32.toWords(program)];
		return bech32.encode(hrp, words);
	}

	if (program.length === 32) {
		const words = [1, ...bech32m.toWords(program)];
		return bech32m.encode(hrp, words);
	}

	throw new Error(
		`Unsupported witness program length ${program.length}; expected 20 (P2WPKH) or 32 (P2TR).`,
	);
}
