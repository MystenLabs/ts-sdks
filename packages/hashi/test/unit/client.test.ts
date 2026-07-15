// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HashiClient, hashi } from '../../src/client.js';
import {
	AmountBelowMinimumError,
	HashiConfigError,
	HashiGuardianError,
	HashiPausedError,
	InvalidBitcoinAddressError,
	InvalidParamsError,
} from '../../src/errors.js';
import type { GuardianInfoProvider, RawGuardianInfo } from '../../src/types.js';
import { Hashi } from '../../src/contracts/hashi/hashi.js';
import { BitcoinState, BitcoinStateKey } from '../../src/contracts/hashi/bitcoin_state.js';
import { DepositRequest } from '../../src/contracts/hashi/deposit_queue.js';
import {
	WithdrawalRequest,
	WithdrawalTransaction,
} from '../../src/contracts/hashi/withdrawal_queue.js';
import { Bag } from '../../src/contracts/hashi/deps/sui/bag.js';
import { generateDepositAddress } from '../../src/bitcoin.js';
import { reverseTxidBytes } from '../../src/util.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { bech32, bech32m } from '@scure/base';
import { fromHex, normalizeSuiAddress } from '@mysten/sui/utils';

const HASHI_OBJECT_ID = '0x0000000000000000000000000000000000000000000000000000000000000001';
const PACKAGE_ID = '0x0000000000000000000000000000000000000000000000000000000000000002';
const REQUEST_ID = '0x0000000000000000000000000000000000000000000000000000000000000003';

/** Deterministic test key: secret = 2 (matches TEST_HASHI_BTC_SK in Rust tests). */
const TEST_SECRET = new Uint8Array(32);
TEST_SECRET[31] = 2;
const TEST_MPC_KEY = secp256k1.getPublicKey(TEST_SECRET, true); // 33 bytes, SEC1 compressed

/**
 * Arkworks-encoded form of TEST_MPC_KEY, matching the on-chain storage format.
 * Arkworks: bytes[0..32] = x in LE, byte[32] = flag (bit 7 = y > (p-1)/2).
 */
function sec1ToArkworks(sec1: Uint8Array): Uint8Array {
	const xBe = sec1.slice(1);
	const xLe = new Uint8Array(xBe).reverse();
	const Point = secp256k1.Point;
	const point = Point.fromBytes(sec1);
	const y = point.toAffine().y;
	const p = Point.CURVE().p;
	const yIsNeg = y > (p - 1n) / 2n;
	const ark = new Uint8Array(33);
	ark.set(xLe, 0);
	ark[32] = yIsNeg ? 0x80 : 0x00;
	return ark;
}
const TEST_MPC_KEY_ARKWORKS = sec1ToArkworks(TEST_MPC_KEY);

const TEST_SUI_ADDRESS = '0xabcdef0000000000000000000000000000000000000000000000000000000001';

/**
 * 32-byte x-only guardian BTC pubkey for tests. Matches the
 * `TEST_ENCLAVE_BTC_SK = [1u8; 32]` constant in
 * `crates/hashi-types/src/guardian/bitcoin_utils.rs`, so SDK tests stay
 * cross-language-consistent with the bridge.
 */
const TEST_GUARDIAN_BTC_X_ONLY = secp256k1.getPublicKey(new Uint8Array(32).fill(1), true).slice(1);

/** 32-byte Ed25519 attestation pubkey placeholder for tests. */
const TEST_GUARDIAN_ED25519_KEY = new Uint8Array(32).fill(7);

/** Convenience: the `Bytes` config entry for the guardian BTC pubkey. */
function guardianBtcConfigEntry(bytes: Uint8Array = TEST_GUARDIAN_BTC_X_ONLY) {
	return {
		key: 'guardian_btc_public_key',
		value: { $kind: 'Bytes', Bytes: Array.from(bytes) },
	};
}

/**
 * Build a mocked `Hashi.get()` response with a custom config `contents` array.
 * Other fields carry minimal-but-valid placeholders so the BCS-decoded json
 * shape matches what the SDK expects.
 */
function mockHashiWithConfig(
	contents: Array<{ key: string; value: { $kind: string; [k: string]: unknown } }>,
) {
	vi.spyOn(Hashi, 'get').mockResolvedValueOnce({
		json: {
			id: HASHI_OBJECT_ID,
			committee_set: {
				members: HASHI_OBJECT_ID,
				epoch: 0n,
				committees: HASHI_OBJECT_ID,
				pending_epoch_change: null,
				mpc_public_key: [],
			},
			config: {
				config: { contents },
				enabled_versions: { contents: [] },
				upgrade_cap: null,
			},
			treasury: { objects: HASHI_OBJECT_ID },
			proposals: HASHI_OBJECT_ID,
			tob: HASHI_OBJECT_ID,
			num_consumed_presigs: 0n,
		},
	} as never);
}

const WELL_FORMED_CONFIG = [
	{ key: 'paused', value: { $kind: 'Bool', Bool: false } },
	{ key: 'bitcoin_chain_id', value: { $kind: 'Address', Address: `0x${'a'.repeat(64)}` } },
	{ key: 'bitcoin_deposit_minimum', value: { $kind: 'U64', U64: '30000' } },
	{ key: 'bitcoin_withdrawal_minimum', value: { $kind: 'U64', U64: '30000' } },
	{ key: 'bitcoin_confirmation_threshold', value: { $kind: 'U64', U64: '6' } },
	{ key: 'withdrawal_cancellation_cooldown_ms', value: { $kind: 'U64', U64: '3600000' } },
	{ key: 'bitcoin_deposit_time_delay_ms', value: { $kind: 'U64', U64: '600000' } },
];

describe('HashiClient', () => {
	let client: SuiGrpcClient & { hashi: HashiClient };

	beforeEach(() => {
		vi.clearAllMocks();
		client = new SuiGrpcClient({
			network: 'devnet',
			baseUrl: 'https://fullnode.devnet.sui.io:443',
		}).$extend(
			hashi({
				network: 'devnet',
				hashiObjectId: HASHI_OBJECT_ID,
				packageId: PACKAGE_ID,
				bitcoinNetwork: 'regtest',
			}),
		);
	});

	describe('generateDepositAddress', () => {
		/**
		 * Build a `Hashi.get()` mock carrying both the MPC arkworks key and a
		 * configurable governance config. `generateDepositAddress` reads the
		 * committee key and the guardian key from a single `Hashi.get`; the
		 * mock is persistent so any incidental extra read still resolves.
		 */
		function mockHashiWithMpcAndConfig(
			mpcArkworks: Uint8Array | number[],
			configContents: ReadonlyArray<{
				key: string;
				value: { $kind: string; [k: string]: unknown };
			}>,
		) {
			vi.spyOn(Hashi, 'get').mockResolvedValue({
				json: {
					id: HASHI_OBJECT_ID,
					committee_set: {
						members: HASHI_OBJECT_ID,
						epoch: 0n,
						committees: HASHI_OBJECT_ID,
						pending_epoch_change: null,
						mpc_public_key: Array.from(mpcArkworks),
					},
					config: {
						config: { contents: configContents },
						enabled_versions: { contents: [] },
						upgrade_cap: null,
					},
					treasury: { objects: HASHI_OBJECT_ID },
					proposals: HASHI_OBJECT_ID,
					tob: HASHI_OBJECT_ID,
					num_consumed_presigs: 0n,
				},
			} as never);
		}

		it('generates a deposit address by fetching MPC + guardian keys from on-chain', async () => {
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, [
				...WELL_FORMED_CONFIG,
				guardianBtcConfigEntry(),
			]);

			const btcAddress = await client.hashi.generateDepositAddress({
				suiAddress: TEST_SUI_ADDRESS,
			});

			// Matches the pure-function output for the same inputs.
			const expected = generateDepositAddress({
				mpcMasterCompressed: TEST_MPC_KEY,
				guardianBtcXOnly: TEST_GUARDIAN_BTC_X_ONLY,
				suiAddress: fromHex(TEST_SUI_ADDRESS),
				network: 'regtest',
			});
			expect(btcAddress).toBe(expected);
			expect(btcAddress).toMatch(/^bcrt1p/);
		});

		it('throws when MPC key is not yet available', async () => {
			mockHashiWithMpcAndConfig([], [...WELL_FORMED_CONFIG, guardianBtcConfigEntry()]);

			const err = await client.hashi
				.generateDepositAddress({ suiAddress: TEST_SUI_ADDRESS })
				.catch((e) => e);
			expect(err).toBeInstanceOf(HashiConfigError);
			expect((err as HashiConfigError).key).toBe('committee_set.mpc_public_key');
		});

		it('throws HashiConfigError when guardian_btc_public_key is not on-chain', async () => {
			// MPC key present, guardian key absent (pre-feature deployment).
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, WELL_FORMED_CONFIG);

			const err = await client.hashi
				.generateDepositAddress({ suiAddress: TEST_SUI_ADDRESS })
				.catch((e) => e);
			expect(err).toBeInstanceOf(HashiConfigError);
			expect((err as HashiConfigError).key).toBe('guardian_btc_public_key');
		});

		it('throws HashiConfigError when guardian_btc_public_key has wrong length', async () => {
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, [
				...WELL_FORMED_CONFIG,
				{
					key: 'guardian_btc_public_key',
					value: { $kind: 'Bytes', Bytes: Array.from(new Uint8Array(20)) },
				},
			]);

			// generateDepositAddress reads guardian_btc_public_key directly
			// via `configBytes`, which length-checks the entry.
			const err = await client.hashi
				.generateDepositAddress({ suiAddress: TEST_SUI_ADDRESS })
				.catch((e) => e);
			expect(err).toBeInstanceOf(HashiConfigError);
			expect((err as HashiConfigError).key).toBe('guardian_btc_public_key');
			expect(err.message).toMatch(/expected 32 bytes, got 20/);
		});

		it('reads the committee and guardian keys from a single Hashi.get', async () => {
			const getSpy = vi.spyOn(Hashi, 'get');
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, [
				...WELL_FORMED_CONFIG,
				guardianBtcConfigEntry(),
			]);

			await client.hashi.generateDepositAddress({ suiAddress: TEST_SUI_ADDRESS });

			expect(getSpy).toHaveBeenCalledTimes(1);
		});

		it('ignores an unrelated malformed config entry (guardian_public_key)', async () => {
			// The Ed25519 attestation key is never touched by address
			// derivation, so a malformed one must not block it — only the MPC
			// key and guardian_btc_public_key are parsed.
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, [
				...WELL_FORMED_CONFIG,
				guardianBtcConfigEntry(),
				{
					key: 'guardian_public_key',
					value: { $kind: 'Bytes', Bytes: Array.from(new Uint8Array(20)) }, // wrong length
				},
			]);

			const btcAddress = await client.hashi.generateDepositAddress({
				suiAddress: TEST_SUI_ADDRESS,
			});
			expect(btcAddress).toMatch(/^bcrt1p/);
		});

		it('normalizes a short-form Sui address before deriving', async () => {
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, [
				...WELL_FORMED_CONFIG,
				guardianBtcConfigEntry(),
			]);

			const fromShort = await client.hashi.generateDepositAddress({ suiAddress: '0x42' });
			const expected = generateDepositAddress({
				mpcMasterCompressed: TEST_MPC_KEY,
				guardianBtcXOnly: TEST_GUARDIAN_BTC_X_ONLY,
				suiAddress: fromHex(normalizeSuiAddress('0x42')),
				network: 'regtest',
			});
			expect(fromShort).toBe(expected);
		});

		it.todo('derives a BTC deposit address from a live devnet MPC + guardian key', async () => {
			const devnetClient = new SuiGrpcClient({
				network: 'devnet',
				baseUrl: 'https://fullnode.devnet.sui.io:443',
			}).$extend(hashi({ network: 'devnet' }));

			const suiAddress = '0xe40c8cf8b53822829b3a6dc9aea84b62653f60b771e9da4bd4e214cae851b87b';

			const btcAddress = await devnetClient.hashi.generateDepositAddress({ suiAddress });

			// signet/testnet addresses start with tb1p
			expect(btcAddress).toMatch(/^tb1p/);
			expect(btcAddress.length).toBeGreaterThan(40);
			// Replace with the new 2-of-2 reference address once devnet is
			// redeployed with the guardian BTC pubkey published.
		});

		it('allows overriding the network per call', async () => {
			mockHashiWithMpcAndConfig(TEST_MPC_KEY_ARKWORKS, [
				...WELL_FORMED_CONFIG,
				guardianBtcConfigEntry(),
			]);

			// Client default is regtest, but we override to testnet
			const addr = await client.hashi.generateDepositAddress({
				suiAddress: TEST_SUI_ADDRESS,
				bitcoinNetwork: 'testnet',
			});
			expect(addr).toMatch(/^tb1p/);
		});
	});

	describe('deposit', () => {
		const validTxid = '0x' + 'ef'.repeat(32);
		const testSigner = Ed25519Keypair.generate();

		// Stub the network call so happy-path tests don't hit a real node.
		// Spy on `client.core` (the raw CoreClient instance) rather than
		// `client` itself — `$extend` wraps the client in a Proxy that caches
		// bound method references, so a spy installed on the Proxy gets
		// shadowed by the cache on subsequent reads. The underlying target is
		// reachable via `client.core` since `CoreClient` sets `core = this`,
		// and `HashiClient` stores that same target internally.
		let signExecSpy: ReturnType<typeof vi.spyOn>;
		beforeEach(() => {
			signExecSpy = vi.spyOn(client.core, 'signAndExecuteTransaction').mockResolvedValue({
				$kind: 'Transaction',
				Transaction: { status: { success: true } },
			} as never);
		});

		it('throws HashiPausedError when the protocol is paused', async () => {
			mockHashiWithConfig([
				...WELL_FORMED_CONFIG.filter((e) => e.key !== 'paused'),
				{ key: 'paused', value: { $kind: 'Bool', Bool: true } },
			]);

			const promise = client.hashi.deposit({
				signer: testSigner,
				txid: validTxid,
				utxos: [{ vout: 0, amountSats: 100_000n }],
				recipient: TEST_SUI_ADDRESS,
			});

			await expect(promise).rejects.toBeInstanceOf(HashiPausedError);
			await expect(promise).rejects.toMatchObject({ operation: 'deposit' });
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('prefers HashiPausedError over AmountBelowMinimumError when both would apply', async () => {
			// Pause check must run before the minimum check — if these two
			// fired in the wrong order a user depositing dust into a paused
			// system would see the wrong recovery signal.
			mockHashiWithConfig([
				...WELL_FORMED_CONFIG.filter((e) => e.key !== 'paused'),
				{ key: 'paused', value: { $kind: 'Bool', Bool: true } },
			]);

			await expect(
				client.hashi.deposit({
					signer: testSigner,
					txid: validTxid,
					utxos: [{ vout: 0, amountSats: 1n }], // well below 30 000
					recipient: TEST_SUI_ADDRESS,
				}),
			).rejects.toBeInstanceOf(HashiPausedError);
		});

		it('throws AmountBelowMinimumError carrying every violation for an under-minimum batch', async () => {
			// WELL_FORMED_CONFIG sets bitcoin_deposit_minimum = 30_000 sats.
			mockHashiWithConfig(WELL_FORMED_CONFIG);

			const promise = client.hashi.deposit({
				signer: testSigner,
				txid: validTxid,
				utxos: [
					{ vout: 1, amountSats: 10_000n },
					{ vout: 3, amountSats: 50_000n }, // passes
					{ vout: 7, amountSats: 20_000n },
				],
				recipient: TEST_SUI_ADDRESS,
			});

			await expect(promise).rejects.toBeInstanceOf(AmountBelowMinimumError);
			await expect(promise).rejects.toMatchObject({
				violations: [
					{ amount: 10_000n, minimum: 30_000n, vout: 1 },
					{ amount: 20_000n, minimum: 30_000n, vout: 7 },
				],
			});
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('accepts a UTXO at exactly the minimum (boundary = pass)', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			await client.hashi.deposit({
				signer: testSigner,
				txid: validTxid,
				utxos: [{ vout: 0, amountSats: 30_000n }],
				recipient: TEST_SUI_ADDRESS,
			});
			expect(signExecSpy).toHaveBeenCalledTimes(1);
		});

		it('rejects a UTXO one sat below the minimum (boundary = fail)', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			await expect(
				client.hashi.deposit({
					signer: testSigner,
					txid: validTxid,
					utxos: [{ vout: 0, amountSats: 29_999n }],
					recipient: TEST_SUI_ADDRESS,
				}),
			).rejects.toBeInstanceOf(AmountBelowMinimumError);
		});

		it('forwards the built PTB and the provided signer to signAndExecuteTransaction', async () => {
			// PTB shape is exhaustively covered by `tx.deposit` tests; here we
			// just verify the surface method hands off correctly.
			mockHashiWithConfig(WELL_FORMED_CONFIG);

			await client.hashi.deposit({
				signer: testSigner,
				txid: validTxid,
				utxos: [
					{ vout: 0, amountSats: 100_000n },
					{ vout: 1, amountSats: 50_000n },
				],
				recipient: TEST_SUI_ADDRESS,
			});

			expect(signExecSpy).toHaveBeenCalledTimes(1);
			const call = signExecSpy.mock.calls[0][0] as {
				signer: unknown;
				transaction: Transaction;
			};
			expect(call.signer).toBe(testSigner);
			expect(call.transaction).toBeInstanceOf(Transaction);
			expect(call.transaction.getData().commands).toHaveLength(6);
		});

		it('fetches the governance snapshot exactly once per deposit call', async () => {
			const getSpy = vi.spyOn(Hashi, 'get');
			mockHashiWithConfig(WELL_FORMED_CONFIG);

			await client.hashi.deposit({
				signer: testSigner,
				txid: validTxid,
				utxos: [{ vout: 0, amountSats: 100_000n }],
				recipient: TEST_SUI_ADDRESS,
			});

			expect(getSpy).toHaveBeenCalledTimes(1);
		});

		describe('structural validation (no chain read)', () => {
			it('rejects a malformed txid before reading chain state', async () => {
				const getSpy = vi.spyOn(Hashi, 'get');
				await expect(
					client.hashi.deposit({
						signer: testSigner,
						txid: '0xabc', // too short
						utxos: [{ vout: 0, amountSats: 100_000n }],
						recipient: TEST_SUI_ADDRESS,
					}),
				).rejects.toBeInstanceOf(InvalidParamsError);
				expect(getSpy).not.toHaveBeenCalled();
				expect(signExecSpy).not.toHaveBeenCalled();
			});

			it('rejects a malformed recipient', async () => {
				await expect(
					client.hashi.deposit({
						signer: testSigner,
						txid: validTxid,
						utxos: [{ vout: 0, amountSats: 100_000n }],
						recipient: 'not-a-sui-address',
					}),
				).rejects.toBeInstanceOf(InvalidParamsError);
				expect(signExecSpy).not.toHaveBeenCalled();
			});

			it('rejects an empty utxos array', async () => {
				await expect(
					client.hashi.deposit({
						signer: testSigner,
						txid: validTxid,
						utxos: [],
						recipient: TEST_SUI_ADDRESS,
					}),
				).rejects.toMatchObject({
					name: 'InvalidParamsError',
					reason: expect.stringContaining('at least one UTXO'),
				});
				expect(signExecSpy).not.toHaveBeenCalled();
			});

			it('rejects duplicate vouts within a single deposit', async () => {
				await expect(
					client.hashi.deposit({
						signer: testSigner,
						txid: validTxid,
						utxos: [
							{ vout: 0, amountSats: 100_000n },
							{ vout: 0, amountSats: 50_000n },
						],
						recipient: TEST_SUI_ADDRESS,
					}),
				).rejects.toMatchObject({
					name: 'InvalidParamsError',
					reason: expect.stringContaining('duplicate `vout`'),
				});
				expect(signExecSpy).not.toHaveBeenCalled();
			});

			it('rejects a non-integer vout', async () => {
				await expect(
					client.hashi.deposit({
						signer: testSigner,
						txid: validTxid,
						utxos: [{ vout: 1.5, amountSats: 100_000n }],
						recipient: TEST_SUI_ADDRESS,
					}),
				).rejects.toBeInstanceOf(InvalidParamsError);
				expect(signExecSpy).not.toHaveBeenCalled();
			});

			it('rejects a negative vout', async () => {
				await expect(
					client.hashi.deposit({
						signer: testSigner,
						txid: validTxid,
						utxos: [{ vout: -1, amountSats: 100_000n }],
						recipient: TEST_SUI_ADDRESS,
					}),
				).rejects.toBeInstanceOf(InvalidParamsError);
				expect(signExecSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('requestWithdrawal', () => {
		const testSigner = Ed25519Keypair.generate();

		// Test client is configured for `bitcoinNetwork: "regtest"` (see outer
		// beforeEach), so valid deposit addresses must use the `bcrt` HRP.
		const VALID_REGTEST_P2WPKH = bech32.encode('bcrt' as const, [
			0,
			...bech32.toWords(new Uint8Array(20).fill(0xaa)),
		]);
		const VALID_REGTEST_P2TR = bech32m.encode('bcrt' as const, [
			1,
			...bech32m.toWords(new Uint8Array(32).fill(0xbb)),
		]);

		let signExecSpy: ReturnType<typeof vi.spyOn>;
		beforeEach(() => {
			signExecSpy = vi.spyOn(client.core, 'signAndExecuteTransaction').mockResolvedValue({
				$kind: 'Transaction',
				Transaction: { status: { success: true } },
			} as never);
		});

		it('rejects a malformed address before reading chain state', async () => {
			const getSpy = vi.spyOn(Hashi, 'get');
			await expect(
				client.hashi.requestWithdrawal({
					signer: testSigner,
					amountSats: 100_000n,
					bitcoinAddress: 'not-an-address',
				}),
			).rejects.toBeInstanceOf(InvalidBitcoinAddressError);
			expect(getSpy).not.toHaveBeenCalled();
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('rejects a wrong-network address with code `wrong-network`', async () => {
			// Mainnet P2WPKH passed to a regtest-configured client.
			await expect(
				client.hashi.requestWithdrawal({
					signer: testSigner,
					amountSats: 100_000n,
					bitcoinAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
				}),
			).rejects.toMatchObject({
				name: 'InvalidBitcoinAddressError',
				code: 'wrong-network',
			});
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('throws HashiPausedError when the protocol is paused', async () => {
			mockHashiWithConfig([
				...WELL_FORMED_CONFIG.filter((e) => e.key !== 'paused'),
				{ key: 'paused', value: { $kind: 'Bool', Bool: true } },
			]);
			const promise = client.hashi.requestWithdrawal({
				signer: testSigner,
				amountSats: 100_000n,
				bitcoinAddress: VALID_REGTEST_P2TR,
			});
			await expect(promise).rejects.toBeInstanceOf(HashiPausedError);
			await expect(promise).rejects.toMatchObject({ operation: 'withdraw' });
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('throws AmountBelowMinimumError with a single vout-less violation', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);

			let caught: AmountBelowMinimumError | undefined;
			try {
				await client.hashi.requestWithdrawal({
					signer: testSigner,
					amountSats: 29_999n, // one below 30_000 (WELL_FORMED_CONFIG)
					bitcoinAddress: VALID_REGTEST_P2TR,
				});
				expect.fail('expected to throw');
			} catch (err) {
				caught = err as AmountBelowMinimumError;
			}

			expect(caught).toBeInstanceOf(AmountBelowMinimumError);
			expect(caught!.violations).toHaveLength(1);
			expect(caught!.violations[0]).toEqual({
				amount: 29_999n,
				minimum: 30_000n,
			});
			// Withdrawal violation carries no `vout` — the optional field is
			// absent rather than set to anything falsy-but-present.
			expect(caught!.violations[0].vout).toBeUndefined();
			// And the rendered message reflects that (no "UTXO at vout" prefix).
			expect(caught!.message).toMatch(/^Amount 29999 sats/);
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('accepts an amount exactly at the minimum (boundary = pass)', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			await client.hashi.requestWithdrawal({
				signer: testSigner,
				amountSats: 30_000n,
				bitcoinAddress: VALID_REGTEST_P2TR,
			});
			expect(signExecSpy).toHaveBeenCalledTimes(1);
		});

		it('forwards the built PTB and the provided signer to signAndExecuteTransaction', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			await client.hashi.requestWithdrawal({
				signer: testSigner,
				amountSats: 100_000n,
				bitcoinAddress: VALID_REGTEST_P2WPKH,
			});

			expect(signExecSpy).toHaveBeenCalledTimes(1);
			const call = signExecSpy.mock.calls[0][0] as {
				signer: unknown;
				transaction: Transaction;
			};
			expect(call.signer).toBe(testSigner);
			expect(call.transaction).toBeInstanceOf(Transaction);
		});

		it('fetches the governance snapshot exactly once per call', async () => {
			const getSpy = vi.spyOn(Hashi, 'get');
			mockHashiWithConfig(WELL_FORMED_CONFIG);

			await client.hashi.requestWithdrawal({
				signer: testSigner,
				amountSats: 100_000n,
				bitcoinAddress: VALID_REGTEST_P2TR,
			});

			expect(getSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('cancelWithdrawal', () => {
		const testSigner = Ed25519Keypair.generate();

		let signExecSpy: ReturnType<typeof vi.spyOn>;
		beforeEach(() => {
			signExecSpy = vi.spyOn(client.core, 'signAndExecuteTransaction').mockResolvedValue({
				$kind: 'Transaction',
				Transaction: { status: { success: true } },
			} as never);
		});

		it('rejects a malformed requestId before any chain or tx work', async () => {
			const getSpy = vi.spyOn(Hashi, 'get');
			await expect(
				client.hashi.cancelWithdrawal({
					signer: testSigner,
					requestId: '0xabc', // too short
				}),
			).rejects.toBeInstanceOf(InvalidParamsError);
			expect(getSpy).not.toHaveBeenCalled();
			expect(signExecSpy).not.toHaveBeenCalled();
		});

		it('happy path: forwards signer + a 3-command PTB to signAndExecuteTransaction', async () => {
			await client.hashi.cancelWithdrawal({
				signer: testSigner,
				requestId: REQUEST_ID,
			});

			expect(signExecSpy).toHaveBeenCalledTimes(1);
			const call = signExecSpy.mock.calls[0][0] as {
				signer: unknown;
				transaction: Transaction;
			};
			expect(call.signer).toBe(testSigner);
			expect(call.transaction).toBeInstanceOf(Transaction);
			// `tx.cancelWithdrawal` composes cancel_withdrawal + from_balance +
			// transferObjects — 3 commands total.
			expect(call.transaction.getData().commands).toHaveLength(3);
		});

		it('does not pause-check (Move permits cancellation while paused)', async () => {
			// Move's `cancel_withdrawal` has no `assert_unpaused` call, so the
			// SDK mirrors that by skipping the governance fetch entirely —
			// users must be able to unwind a pending request even if the
			// system is paused.
			const getSpy = vi.spyOn(Hashi, 'get');
			await client.hashi.cancelWithdrawal({
				signer: testSigner,
				requestId: REQUEST_ID,
			});
			expect(getSpy).not.toHaveBeenCalled();
			expect(signExecSpy).toHaveBeenCalledTimes(1);
		});

		it("passes the signer's Sui address as recipient to tx.cancelWithdrawal", async () => {
			const txSpy = vi.spyOn(client.hashi.tx, 'cancelWithdrawal');
			await client.hashi.cancelWithdrawal({
				signer: testSigner,
				requestId: REQUEST_ID,
			});
			expect(txSpy).toHaveBeenCalledWith({
				requestId: REQUEST_ID,
				recipient: testSigner.toSuiAddress(),
			});
		});
	});

	describe('requestSignetFaucet', () => {
		it.todo('requests BTC from the signet faucet');
	});

	describe('network support', () => {
		it('resolves testnet from NETWORK_CONFIG without custom ids', () => {
			expect(() =>
				new SuiGrpcClient({
					network: 'testnet',
					baseUrl: 'https://fullnode.testnet.sui.io:443',
				}).$extend(hashi({ network: 'testnet' })),
			).not.toThrow();
		});

		it('throws for mainnet without a custom hashiObjectId', () => {
			expect(() =>
				new SuiGrpcClient({
					network: 'mainnet',
					baseUrl: 'https://fullnode.mainnet.sui.io:443',
				}).$extend(hashi({ network: 'mainnet' })),
			).toThrow('not yet supported on Sui mainnet');
		});

		it('allows unsupported networks with a custom hashiObjectId and packageId', () => {
			expect(() =>
				new SuiGrpcClient({
					network: 'mainnet',
					baseUrl: 'https://fullnode.mainnet.sui.io:443',
				}).$extend(
					hashi({
						network: 'mainnet',
						hashiObjectId: HASHI_OBJECT_ID,
						packageId: PACKAGE_ID,
					}),
				),
			).not.toThrow();
		});
	});

	describe('view', () => {
		describe('mpcPublicKey', () => {
			it('returns the 33-byte compressed MPC key', async () => {
				vi.spyOn(Hashi, 'get').mockResolvedValueOnce({
					json: {
						id: HASHI_OBJECT_ID,
						committee_set: {
							members: HASHI_OBJECT_ID,
							epoch: 0n,
							committees: HASHI_OBJECT_ID,
							pending_epoch_change: null,
							mpc_public_key: Array.from(TEST_MPC_KEY_ARKWORKS),
						},
						config: {
							config: { contents: [] },
							enabled_versions: { contents: [] },
							upgrade_cap: null,
						},
						treasury: { objects: HASHI_OBJECT_ID },
						proposals: HASHI_OBJECT_ID,
						tob: HASHI_OBJECT_ID,
						num_consumed_presigs: 0n,
					},
				} as never);

				const key = await client.hashi.view.mpcPublicKey();
				expect(key).toBeInstanceOf(Uint8Array);
				expect(key.length).toBe(33);
				expect(key[0]).toBeOneOf([0x02, 0x03]); // valid compressed prefix
				expect(key).toEqual(TEST_MPC_KEY);
			});

			it('throws when DKG has not completed', async () => {
				vi.spyOn(Hashi, 'get').mockResolvedValueOnce({
					json: {
						id: HASHI_OBJECT_ID,
						committee_set: {
							members: HASHI_OBJECT_ID,
							epoch: 0n,
							committees: HASHI_OBJECT_ID,
							pending_epoch_change: null,
							mpc_public_key: [],
						},
						config: {
							config: { contents: [] },
							enabled_versions: { contents: [] },
							upgrade_cap: null,
						},
						treasury: { objects: HASHI_OBJECT_ID },
						proposals: HASHI_OBJECT_ID,
						tob: HASHI_OBJECT_ID,
						num_consumed_presigs: 0n,
					},
				} as never);

				const err = await client.hashi.view.mpcPublicKey().catch((e) => e);
				expect(err).toBeInstanceOf(HashiConfigError);
				expect((err as HashiConfigError).key).toBe('committee_set.mpc_public_key');
			});
		});

		describe('all / governance getters', () => {
			it('all() returns a full typed snapshot from one Hashi.get call', async () => {
				const getSpy = vi.spyOn(Hashi, 'get');
				mockHashiWithConfig(WELL_FORMED_CONFIG);

				const snap = await client.hashi.view.all();

				expect(getSpy).toHaveBeenCalledTimes(1);
				expect(snap).toEqual({
					paused: false,
					bitcoinChainId: `0x${'a'.repeat(64)}`,
					bitcoinDepositMinimum: 30_000n,
					bitcoinWithdrawalMinimum: 30_000n,
					bitcoinConfirmationThreshold: 6n,
					withdrawalCancellationCooldownMs: 3_600_000n,
					bitcoinDepositTimeDelayMs: 600_000n,
					depositMinimum: 30_000n,
					worstCaseNetworkFee: 30_000n - 546n,
					// WELL_FORMED_CONFIG has no guardian entries — pre-feature shape.
					guardianUrl: null,
					guardianPublicKey: null,
					guardianBtcPublicKey: null,
				});
			});

			it('all() surfaces guardian config keys when set on-chain', async () => {
				mockHashiWithConfig([
					...WELL_FORMED_CONFIG,
					{ key: 'guardian_url', value: { $kind: 'String', String: 'https://g.example' } },
					{
						key: 'guardian_public_key',
						value: { $kind: 'Bytes', Bytes: Array.from(TEST_GUARDIAN_ED25519_KEY) },
					},
					guardianBtcConfigEntry(),
				]);

				const snap = await client.hashi.view.all();
				expect(snap.guardianUrl).toBe('https://g.example');
				expect(snap.guardianPublicKey).toEqual(TEST_GUARDIAN_ED25519_KEY);
				expect(snap.guardianBtcPublicKey).toEqual(TEST_GUARDIAN_BTC_X_ONLY);
			});

			it('all() throws when guardian_public_key has wrong length', async () => {
				mockHashiWithConfig([
					...WELL_FORMED_CONFIG,
					{
						key: 'guardian_public_key',
						value: { $kind: 'Bytes', Bytes: Array.from(new Uint8Array(33)) },
					},
				]);

				const err = await client.hashi.view.all().catch((e) => e);
				expect(err).toBeInstanceOf(HashiConfigError);
				expect((err as HashiConfigError).key).toBe('guardian_public_key');
				expect(err.message).toMatch(/expected 32 bytes, got 33/);
			});

			it('floors bitcoin_deposit_minimum to DUST_RELAY_MIN_VALUE (546)', async () => {
				mockHashiWithConfig([
					...WELL_FORMED_CONFIG.filter((e) => e.key !== 'bitcoin_deposit_minimum'),
					{ key: 'bitcoin_deposit_minimum', value: { $kind: 'U64', U64: '100' } },
				]);

				const snap = await client.hashi.view.all();

				expect(snap.bitcoinDepositMinimum).toBe(546n);
				expect(snap.depositMinimum).toBe(546n);
			});

			it('floors bitcoin_withdrawal_minimum to DUST_RELAY_MIN_VALUE + 1 (547)', async () => {
				mockHashiWithConfig([
					...WELL_FORMED_CONFIG.filter((e) => e.key !== 'bitcoin_withdrawal_minimum'),
					{ key: 'bitcoin_withdrawal_minimum', value: { $kind: 'U64', U64: '200' } },
				]);

				const snap = await client.hashi.view.all();

				expect(snap.bitcoinWithdrawalMinimum).toBe(547n);
				expect(snap.worstCaseNetworkFee).toBe(1n); // 547 - 546
			});

			it('throws HashiConfigError naming the missing key', async () => {
				mockHashiWithConfig(WELL_FORMED_CONFIG.filter((e) => e.key !== 'paused'));

				await expect(client.hashi.view.all()).rejects.toMatchObject({
					name: 'HashiConfigError',
					key: 'paused',
					expectedVariant: 'Bool',
					message: expect.stringContaining('"paused" not found'),
				});
			});

			it('throws HashiConfigError when variant is wrong', async () => {
				mockHashiWithConfig([
					...WELL_FORMED_CONFIG.filter((e) => e.key !== 'paused'),
					{ key: 'paused', value: { $kind: 'U64', U64: '1' } },
				]);

				await expect(client.hashi.view.all()).rejects.toMatchObject({
					name: 'HashiConfigError',
					key: 'paused',
					expectedVariant: 'Bool',
					actualVariant: 'U64',
				});
			});

			it('each individual view method fetches via all() (one Hashi.get per call)', async () => {
				const getSpy = vi.spyOn(Hashi, 'get');
				mockHashiWithConfig(WELL_FORMED_CONFIG);

				expect(await client.hashi.view.paused()).toBe(false);
				expect(getSpy).toHaveBeenCalledTimes(1);
			});

			it('HashiConfigError is instanceof Error and carries structured fields', async () => {
				mockHashiWithConfig(WELL_FORMED_CONFIG.filter((e) => e.key !== 'paused'));

				try {
					await client.hashi.view.all();
					expect.fail('should have thrown');
				} catch (err) {
					expect(err).toBeInstanceOf(Error);
					expect(err).toBeInstanceOf(HashiConfigError);
				}
			});
		});
	});

	describe('view.findUsedUtxos', () => {
		const ACTIVE_POOL_ID = '0x' + 'a1'.repeat(32);
		const SPENT_POOL_ID = '0x' + 'a2'.repeat(32);
		const TABLE_ID = '0x' + 'a3'.repeat(32);

		/** JSON-RPC `ObjectError` not-found shape: `.code === "notExists"`. */
		const jsonRpcNotFoundError = () => Object.assign(new Error('not found'), { code: 'notExists' });
		/** gRPC not-found shape: plain `Error` with `Object <id> not found` message. */
		const grpcNotFoundError = (id = '0x' + '00'.repeat(32)) => new Error(`Object ${id} not found`);
		const notFoundError = jsonRpcNotFoundError;

		/** BCS-encoded BitcoinState with known Bag/Table IDs. */
		function mockBitcoinStateContent() {
			const bagFields = (id: string) => ({ id, size: '0' });
			const objectBagFields = (id: string) => ({ id, size: '0' });
			return BitcoinState.serialize({
				id: '0x' + 'b0'.repeat(32),
				deposit_queue: {
					requests: objectBagFields('0x' + 'd1'.repeat(32)),
					processed: objectBagFields('0x' + 'd2'.repeat(32)),
				},
				withdrawal_queue: {
					requests: objectBagFields('0x' + 'c1'.repeat(32)),
					processed: objectBagFields('0x' + 'c2'.repeat(32)),
					withdrawal_txns: objectBagFields('0x' + 'c3'.repeat(32)),
					confirmed_txns: objectBagFields('0x' + 'c4'.repeat(32)),
				},
				utxo_pool: {
					utxo_records: bagFields(ACTIVE_POOL_ID),
					spent_utxos: bagFields(SPENT_POOL_ID),
				},
				user_requests: bagFields(TABLE_ID),
			}).toBytes();
		}

		function mockFetchBitcoinState() {
			vi.spyOn(client.core, 'getDynamicField').mockResolvedValueOnce({
				dynamicField: {
					$kind: 'DynamicField',
					fieldId: '0x' + 'aa'.repeat(32),
					type: `0x2::dynamic_field::Field<${PACKAGE_ID}::bitcoin_state::BitcoinStateKey, ${PACKAGE_ID}::bitcoin_state::BitcoinState>`,
					name: {
						type: `${PACKAGE_ID}::bitcoin_state::BitcoinStateKey`,
						bcs: BitcoinStateKey.serialize({ dummy_field: false }).toBytes(),
					},
					valueType: `${PACKAGE_ID}::bitcoin_state::BitcoinState`,
					value: {
						type: `${PACKAGE_ID}::bitcoin_state::BitcoinState`,
						bcs: mockBitcoinStateContent(),
					},
					version: '1',
					digest: 'mock',
					previousTransaction: null,
				},
			} as never);
		}

		it('returns empty array for empty input', async () => {
			const result = await client.hashi.view.findUsedUtxos([]);
			expect(result).toEqual([]);
		});

		it('marks a UTXO as used when it exists in the active pool', async () => {
			mockFetchBitcoinState();
			const getObjectsSpy = vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [
					// active pool — found
					{ objectId: '0x01', type: 'Field', version: '1', digest: 'd', owner: {} },
					// spent pool — not found
					notFoundError(),
				],
			} as never);

			const result = await client.hashi.view.findUsedUtxos([
				{ txid: '0x' + 'ab'.repeat(32), vout: 0 },
			]);

			expect(result).toHaveLength(1);
			expect(result[0].inActivePool).toBe(true);
			expect(result[0].inSpentPool).toBe(false);
			expect(result[0].isUsed).toBe(true);
			expect(result[0].utxoId).toEqual({ txid: '0x' + 'ab'.repeat(32), vout: 0 });
			expect(getObjectsSpy).toHaveBeenCalledTimes(1);
		});

		it('marks a UTXO as used when it exists in the spent pool', async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [
					notFoundError(), // active pool
					{ objectId: '0x01', type: 'Field', version: '1', digest: 'd', owner: {} }, // spent pool
				],
			} as never);

			const result = await client.hashi.view.findUsedUtxos([
				{ txid: '0x' + 'cd'.repeat(32), vout: 1 },
			]);

			expect(result[0].inActivePool).toBe(false);
			expect(result[0].inSpentPool).toBe(true);
			expect(result[0].isUsed).toBe(true);
		});

		it('marks a UTXO as not used when absent from both pools', async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [notFoundError(), notFoundError()],
			} as never);

			const result = await client.hashi.view.findUsedUtxos([
				{ txid: '0x' + 'ff'.repeat(32), vout: 99 },
			]);

			expect(result[0].inActivePool).toBe(false);
			expect(result[0].inSpentPool).toBe(false);
			expect(result[0].isUsed).toBe(false);
		});

		it('handles multiple UTXOs in a single batch', async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [
					// UTXO 0: active=found, spent=not found
					{ objectId: '0x01', type: 'F', version: '1', digest: 'd', owner: {} },
					notFoundError(),
					// UTXO 1: active=not found, spent=not found
					notFoundError(),
					notFoundError(),
					// UTXO 2: active=found, spent=found (both)
					{ objectId: '0x02', type: 'F', version: '1', digest: 'd', owner: {} },
					{ objectId: '0x03', type: 'F', version: '1', digest: 'd', owner: {} },
				],
			} as never);

			const result = await client.hashi.view.findUsedUtxos([
				{ txid: '0x' + '01'.repeat(32), vout: 0 },
				{ txid: '0x' + '02'.repeat(32), vout: 1 },
				{ txid: '0x' + '03'.repeat(32), vout: 2 },
			]);

			expect(result).toHaveLength(3);
			expect(result[0]).toMatchObject({ isUsed: true, inActivePool: true, inSpentPool: false });
			expect(result[1]).toMatchObject({
				isUsed: false,
				inActivePool: false,
				inSpentPool: false,
			});
			expect(result[2]).toMatchObject({ isUsed: true, inActivePool: true, inSpentPool: true });
		});

		it("rethrows an RPC error that isn't a 'not found' code", async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [
					notFoundError(),
					Object.assign(new Error('internal server error'), { code: 'unknown' }),
				],
			} as never);

			await expect(
				client.hashi.view.findUsedUtxos([{ txid: '0x' + 'ab'.repeat(32), vout: 0 }]),
			).rejects.toThrow('internal server error');
		});

		it("treats gRPC 'Object <id> not found' plain Errors as misses", async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [grpcNotFoundError(), grpcNotFoundError()],
			} as never);

			const result = await client.hashi.view.findUsedUtxos([
				{ txid: '0x' + 'ab'.repeat(32), vout: 0 },
			]);
			expect(result[0]).toMatchObject({
				inActivePool: false,
				inSpentPool: false,
				isUsed: false,
			});
		});

		it("rethrows a plain Error whose message isn't the gRPC not-found pattern", async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [new Error('internal server error'), notFoundError()],
			} as never);

			await expect(
				client.hashi.view.findUsedUtxos([{ txid: '0x' + 'ab'.repeat(32), vout: 0 }]),
			).rejects.toThrow('internal server error');
		});

		it('throws HashiFetchError when getObjects returns a wrong-length response', async () => {
			mockFetchBitcoinState();
			// Expecting 2 results (one UTXO × 2 pools), mock only returns 1.
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [notFoundError()],
			} as never);

			await expect(
				client.hashi.view.findUsedUtxos([{ txid: '0x' + 'ab'.repeat(32), vout: 0 }]),
			).rejects.toThrow(/expected 2/);
		});
	});

	describe('view.transactionHistory', () => {
		const ACTIVE_POOL_ID = '0x' + 'a1'.repeat(32);
		const SPENT_POOL_ID = '0x' + 'a2'.repeat(32);
		const TABLE_ID = '0x' + 'a3'.repeat(32);
		const USER_BAG_ID = '0x' + 'b1'.repeat(32);

		const DEPOSIT_REQUEST_ID = '0x' + 'd0'.repeat(32);
		const WITHDRAWAL_REQUEST_ID = '0x' + 'e0'.repeat(32);
		const WITHDRAWAL_TXN_ID = '0x' + 'f0'.repeat(32);

		// A display-order txid (plain hex, no 0x) and its internal (reversed, 0x-prefixed) form.
		const DISPLAY_TXID = 'ab'.repeat(32);
		const INTERNAL_TXID = `0x${reverseTxidBytes('0x' + DISPLAY_TXID)}`;

		function mockFetchBitcoinState() {
			const bagFields = (id: string) => ({ id, size: '0' });
			const objectBagFields = (id: string) => ({ id, size: '0' });
			vi.spyOn(client.core, 'getDynamicField').mockResolvedValueOnce({
				dynamicField: {
					$kind: 'DynamicField',
					fieldId: '0x' + 'aa'.repeat(32),
					type: `0x2::dynamic_field::Field<${PACKAGE_ID}::bitcoin_state::BitcoinStateKey, ${PACKAGE_ID}::bitcoin_state::BitcoinState>`,
					name: {
						type: `${PACKAGE_ID}::bitcoin_state::BitcoinStateKey`,
						bcs: BitcoinStateKey.serialize({ dummy_field: false }).toBytes(),
					},
					valueType: `${PACKAGE_ID}::bitcoin_state::BitcoinState`,
					value: {
						type: `${PACKAGE_ID}::bitcoin_state::BitcoinState`,
						bcs: BitcoinState.serialize({
							id: '0x' + 'b0'.repeat(32),
							deposit_queue: {
								requests: objectBagFields('0x' + 'd1'.repeat(32)),
								processed: objectBagFields('0x' + 'd2'.repeat(32)),
							},
							withdrawal_queue: {
								requests: objectBagFields('0x' + 'c1'.repeat(32)),
								processed: objectBagFields('0x' + 'c2'.repeat(32)),
								withdrawal_txns: objectBagFields('0x' + 'c3'.repeat(32)),
								confirmed_txns: objectBagFields('0x' + 'c4'.repeat(32)),
							},
							utxo_pool: {
								utxo_records: bagFields(ACTIVE_POOL_ID),
								spent_utxos: bagFields(SPENT_POOL_ID),
							},
							user_requests: bagFields(TABLE_ID),
						}).toBytes(),
					},
					version: '1',
					digest: 'mock',
					previousTransaction: null,
				},
			} as never);
		}

		function mockUserBagLookup() {
			vi.spyOn(client.core, 'getDynamicField').mockResolvedValueOnce({
				dynamicField: {
					$kind: 'DynamicField',
					fieldId: '0x' + 'cc'.repeat(32),
					type: 'Field<address, Bag>',
					name: { type: 'address', bcs: new Uint8Array(32) },
					valueType: '0x2::bag::Bag',
					value: {
						type: '0x2::bag::Bag',
						bcs: Bag.serialize({ id: USER_BAG_ID, size: '2' }).toBytes(),
					},
					version: '1',
					digest: 'mock',
					previousTransaction: null,
				},
			} as never);
		}

		function mockListDynamicFields(requestIds: string[]) {
			vi.spyOn(client.core, 'listDynamicFields').mockResolvedValueOnce({
				hasNextPage: false,
				cursor: null,
				dynamicFields: requestIds.map((id) => ({
					$kind: 'DynamicField' as const,
					fieldId: '0x' + 'ff'.repeat(32),
					type: 'Field<address, bool>',
					name: {
						type: 'address',
						bcs: bcs.Address.serialize(id).toBytes(),
					},
					valueType: 'bool',
				})),
			} as never);
		}

		function mockGraphQLDepositEvents(depositIds: string[]) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						data: {
							events: {
								nodes: depositIds.map((id) => ({
									contents: { json: { request_id: id } },
								})),
								pageInfo: { hasNextPage: false, endCursor: null },
							},
						},
					}),
				),
			);
		}

		function mockDepositRequestObject() {
			return {
				objectId: DEPOSIT_REQUEST_ID,
				version: '1',
				digest: 'mock',
				owner: { $kind: 'ObjectOwner', ObjectOwner: '0x00' },
				type: `${PACKAGE_ID}::deposit_queue::DepositRequest`,
				content: DepositRequest.serialize({
					id: DEPOSIT_REQUEST_ID,
					sender: TEST_SUI_ADDRESS,
					created_timestamp_ms: '1000',
					sui_tx_digest: Array.from(new Uint8Array(32).fill(0xdd)),
					utxo: {
						id: { txid: INTERNAL_TXID, vout: 7 },
						amount: '50000',
						derivation_path: TEST_SUI_ADDRESS,
					},
					approval_cert: null,
					approved_timestamp_ms: null,
					confirmed_timestamp_ms: null,
				}).toBytes(),
				previousTransaction: undefined,
				objectBcs: undefined,
				json: undefined,
				display: undefined,
			};
		}

		function mockWithdrawalRequestObject(opts?: { withdrawalTxnId?: string | null }) {
			return {
				objectId: WITHDRAWAL_REQUEST_ID,
				version: '1',
				digest: 'mock',
				owner: { $kind: 'ObjectOwner', ObjectOwner: '0x00' },
				type: `${PACKAGE_ID}::withdrawal_queue::WithdrawalRequest`,
				content: WithdrawalRequest.serialize({
					id: WITHDRAWAL_REQUEST_ID,
					sender: TEST_SUI_ADDRESS,
					btc_amount: '30000',
					bitcoin_address: Array.from(new Uint8Array(32).fill(0xcc)),
					created_timestamp_ms: '2000',
					status: { Requested: true },
					approval_cert: null,
					approved_timestamp_ms: null,
					withdrawal_txn_id: opts?.withdrawalTxnId ?? null,
					sui_tx_digest: Array.from(new Uint8Array(32).fill(0xee)),
					btc: { value: '30000' },
				}).toBytes(),
				previousTransaction: undefined,
				objectBcs: undefined,
				json: undefined,
				display: undefined,
			};
		}

		it('returns empty array when user has no confirmed or pending requests', async () => {
			mockFetchBitcoinState();
			vi.spyOn(client.core, 'getDynamicField').mockRejectedValueOnce(new Error('not found'));
			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);
			expect(items).toEqual([]);
		});

		it('maps a DepositRequest with btcTxid in display order and btcVout', async () => {
			mockFetchBitcoinState();
			mockUserBagLookup();
			mockListDynamicFields([DEPOSIT_REQUEST_ID]);
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [mockDepositRequestObject()],
			} as never);
			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);

			expect(items).toHaveLength(1);
			const dep = items[0];
			expect(dep.kind).toBe('deposit');
			if (dep.kind !== 'deposit') throw new Error('expected deposit');

			expect(dep.requestId).toBe(DEPOSIT_REQUEST_ID);
			expect(dep.sender).toBe(TEST_SUI_ADDRESS);
			expect(dep.btcTxid).toBe(DISPLAY_TXID);
			expect(dep.btcVout).toBe(7);
			expect(dep.amountSats).toBe(50_000n);
			expect(dep.approved).toBe(false);
			expect(dep.approvalTimestampMs).toBeNull();
			expect(dep.confirmableAtMs).toBeNull();
			expect(dep.timestampMs).toBe(1_000n);
		});

		it('maps a WithdrawalRequest with status and null btcTxid', async () => {
			mockFetchBitcoinState();
			mockUserBagLookup();
			mockListDynamicFields([WITHDRAWAL_REQUEST_ID]);
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [mockWithdrawalRequestObject()],
			} as never);
			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);

			expect(items).toHaveLength(1);
			const wd = items[0];
			expect(wd.kind).toBe('withdrawal');
			if (wd.kind !== 'withdrawal') throw new Error('expected withdrawal');

			expect(wd.requestId).toBe(WITHDRAWAL_REQUEST_ID);
			expect(wd.sender).toBe(TEST_SUI_ADDRESS);
			expect(wd.status).toBe('Requested');
			expect(wd.btcAmountSats).toBe(30_000n);
			expect(wd.btcTxid).toBeNull();
			expect(wd.withdrawalTxnId).toBeNull();
		});

		it('fetches WithdrawalTransaction to populate btcTxid when withdrawal_txn_id is set', async () => {
			mockFetchBitcoinState();
			mockUserBagLookup();
			mockListDynamicFields([WITHDRAWAL_REQUEST_ID]);

			const BTC_TXID_INTERNAL = '0x' + '99'.repeat(32);
			const BTC_TXID_DISPLAY = reverseTxidBytes(BTC_TXID_INTERNAL);

			const getObjectsSpy = vi.spyOn(client.core, 'getObjects');

			// First call: fetch request objects
			getObjectsSpy.mockResolvedValueOnce({
				objects: [mockWithdrawalRequestObject({ withdrawalTxnId: WITHDRAWAL_TXN_ID })],
			} as never);

			// Second call: fetch WithdrawalTransaction objects
			getObjectsSpy.mockResolvedValueOnce({
				objects: [
					{
						objectId: WITHDRAWAL_TXN_ID,
						version: '1',
						digest: 'mock',
						owner: { $kind: 'ObjectOwner', ObjectOwner: '0x00' },
						type: `${PACKAGE_ID}::withdrawal_queue::WithdrawalTransaction`,
						content: WithdrawalTransaction.serialize({
							id: WITHDRAWAL_TXN_ID,
							txid: BTC_TXID_INTERNAL,
							request_ids: [WITHDRAWAL_REQUEST_ID],
							inputs: [],
							withdrawal_outputs: [],
							change_outputs: [],
							created_timestamp_ms: '3000',
							signed_timestamp_ms: null,
							confirmed_timestamp_ms: null,
							randomness: [],
							signing: { signatures: [], epoch: '1' },
							guardian_signatures: null,
						}).toBytes(),
						previousTransaction: undefined,
						objectBcs: undefined,
						json: undefined,
						display: undefined,
					},
				],
			} as never);

			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);

			expect(items).toHaveLength(1);
			const wd = items[0];
			if (wd.kind !== 'withdrawal') throw new Error('expected withdrawal');
			expect(wd.btcTxid).toBe(BTC_TXID_DISPLAY);
			expect(wd.withdrawalTxnId).toBe(WITHDRAWAL_TXN_ID);
			expect(getObjectsSpy).toHaveBeenCalledTimes(2);
		});

		it('returns mixed deposit and withdrawal items sorted by timestamp descending', async () => {
			mockFetchBitcoinState();
			mockUserBagLookup();
			mockListDynamicFields([DEPOSIT_REQUEST_ID, WITHDRAWAL_REQUEST_ID]);
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [mockDepositRequestObject(), mockWithdrawalRequestObject()],
			} as never);
			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);

			expect(items).toHaveLength(2);
			expect(items[0].kind).toBe('withdrawal');
			expect(items[1].kind).toBe('deposit');
		});

		it('skips Error objects in the batch response', async () => {
			mockFetchBitcoinState();
			mockUserBagLookup();
			mockListDynamicFields([DEPOSIT_REQUEST_ID, '0x' + '00'.repeat(32)]);
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [mockDepositRequestObject(), new Error('deleted')],
			} as never);
			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);
			expect(items).toHaveLength(1);
			expect(items[0].kind).toBe('deposit');
		});

		it('ignores objects whose type matches the module name but a different package', async () => {
			mockFetchBitcoinState();
			mockUserBagLookup();
			mockListDynamicFields([DEPOSIT_REQUEST_ID]);
			const FOREIGN_PKG = '0x' + 'ee'.repeat(32);
			vi.spyOn(client.core, 'getObjects').mockResolvedValueOnce({
				objects: [
					{
						...mockDepositRequestObject(),
						type: `${FOREIGN_PKG}::deposit_queue::DepositRequest`,
					},
				],
			} as never);
			mockGraphQLDepositEvents([]);

			const items = await client.hashi.view.transactionHistory(TEST_SUI_ADDRESS);
			expect(items).toEqual([]);
		});
	});

	describe('view.balance', () => {
		it('returns total balance and coin object count', async () => {
			vi.spyOn(client.core, 'getBalance').mockResolvedValueOnce({
				balance: {
					balance: '150000',
					coinType: `${PACKAGE_ID}::btc::BTC`,
					coinBalance: '150000',
					addressBalance: '150000',
				},
			} as never);
			vi.spyOn(client.core, 'listCoins').mockResolvedValueOnce({
				objects: [{}, {}],
				cursor: null,
				hasNextPage: false,
			} as never);

			const result = await client.hashi.view.balance(TEST_SUI_ADDRESS);
			expect(result.totalBalance).toBe(150_000n);
			expect(result.coinObjectCount).toBe(2);
		});

		it('returns zero balance when no coins exist', async () => {
			vi.spyOn(client.core, 'getBalance').mockResolvedValueOnce({
				balance: {
					balance: '0',
					coinType: `${PACKAGE_ID}::btc::BTC`,
					coinBalance: '0',
					addressBalance: '0',
				},
			} as never);
			vi.spyOn(client.core, 'listCoins').mockResolvedValueOnce({
				objects: [],
				cursor: null,
				hasNextPage: false,
			} as never);

			const result = await client.hashi.view.balance(TEST_SUI_ADDRESS);
			expect(result.totalBalance).toBe(0n);
			expect(result.coinObjectCount).toBe(0);
		});

		it('paginates through multiple pages of coins', async () => {
			vi.spyOn(client.core, 'getBalance').mockResolvedValueOnce({
				balance: {
					balance: '300000',
					coinType: `${PACKAGE_ID}::btc::BTC`,
					coinBalance: '300000',
					addressBalance: '300000',
				},
			} as never);
			const listCoinsSpy = vi.spyOn(client.core, 'listCoins');
			listCoinsSpy.mockResolvedValueOnce({
				objects: [{}, {}],
				cursor: 'page1',
				hasNextPage: true,
			} as never);
			listCoinsSpy.mockResolvedValueOnce({
				objects: [{}],
				cursor: null,
				hasNextPage: false,
			} as never);

			const result = await client.hashi.view.balance(TEST_SUI_ADDRESS);
			expect(result.coinObjectCount).toBe(3);
			expect(listCoinsSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('view.depositStatus', () => {
		it('returns null when no deposit event is found in the transaction', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: { events: [] },
			} as never);

			const result = await client.hashi.view.depositStatus('test-digest');
			expect(result).toBeNull();
		});

		it('returns pending status when request exists in the requests bag', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: {
					events: [
						{
							eventType: `${PACKAGE_ID}::deposit::DepositRequested`,
							json: {
								request_id: REQUEST_ID,
								utxo_id: { txid: '0x' + 'ab'.repeat(32), vout: 0 },
								amount: '50000',
								derivation_path: TEST_SUI_ADDRESS,
								timestamp_ms: '1000',
							},
						},
					],
				},
			} as never);

			vi.spyOn(DepositRequest, 'get').mockResolvedValueOnce({
				json: { approved_timestamp_ms: null },
			} as never);

			const getDfSpy = vi.spyOn(client.core, 'getDynamicField');
			// First call: fetchBitcoinState
			getDfSpy.mockResolvedValueOnce({
				dynamicField: {
					value: {
						bcs: BitcoinState.serialize({
							id: '0x' + 'b0'.repeat(32),
							deposit_queue: {
								requests: { id: '0x' + 'd1'.repeat(32), size: '0' },
								processed: { id: '0x' + 'd2'.repeat(32), size: '0' },
							},
							withdrawal_queue: {
								requests: { id: '0x' + 'c1'.repeat(32), size: '0' },
								processed: { id: '0x' + 'c2'.repeat(32), size: '0' },
								withdrawal_txns: { id: '0x' + 'c3'.repeat(32), size: '0' },
								confirmed_txns: { id: '0x' + 'c4'.repeat(32), size: '0' },
							},
							utxo_pool: {
								utxo_records: { id: '0x' + 'a1'.repeat(32), size: '0' },
								spent_utxos: { id: '0x' + 'a2'.repeat(32), size: '0' },
							},
							user_requests: { id: '0x' + 'a3'.repeat(32), size: '0' },
						}).toBytes(),
					},
				},
			} as never);
			// Second call: check requests bag — found means pending
			getDfSpy.mockResolvedValueOnce({
				dynamicField: { objectId: REQUEST_ID },
			} as never);

			const result = await client.hashi.view.depositStatus('test-digest');
			expect(result).not.toBeNull();
			expect(result!.status).toBe('pending');
			expect(result!.amountSats).toBe(50_000n);
			expect(result!.btcVout).toBe(0);
			expect(result!.approvalTimestampMs).toBeNull();
			expect(result!.confirmableAtMs).toBeNull();
		});

		it('returns confirmed status when request exists but is not in the requests bag', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: {
					events: [
						{
							eventType: `${PACKAGE_ID}::deposit::DepositRequested`,
							json: {
								request_id: REQUEST_ID,
								utxo_id: { txid: '0x' + 'ab'.repeat(32), vout: 0 },
								amount: '50000',
								derivation_path: TEST_SUI_ADDRESS,
								timestamp_ms: '1000',
							},
						},
					],
				},
			} as never);

			vi.spyOn(DepositRequest, 'get').mockResolvedValueOnce({
				json: { approved_timestamp_ms: '5000' },
			} as never);

			mockHashiWithConfig(WELL_FORMED_CONFIG);

			const getDfSpy = vi.spyOn(client.core, 'getDynamicField');
			// fetchBitcoinState
			getDfSpy.mockResolvedValueOnce({
				dynamicField: {
					value: {
						bcs: BitcoinState.serialize({
							id: '0x' + 'b0'.repeat(32),
							deposit_queue: {
								requests: { id: '0x' + 'd1'.repeat(32), size: '0' },
								processed: { id: '0x' + 'd2'.repeat(32), size: '0' },
							},
							withdrawal_queue: {
								requests: { id: '0x' + 'c1'.repeat(32), size: '0' },
								processed: { id: '0x' + 'c2'.repeat(32), size: '0' },
								withdrawal_txns: { id: '0x' + 'c3'.repeat(32), size: '0' },
								confirmed_txns: { id: '0x' + 'c4'.repeat(32), size: '0' },
							},
							utxo_pool: {
								utxo_records: { id: '0x' + 'a1'.repeat(32), size: '0' },
								spent_utxos: { id: '0x' + 'a2'.repeat(32), size: '0' },
							},
							user_requests: { id: '0x' + 'a3'.repeat(32), size: '0' },
						}).toBytes(),
					},
				},
			} as never);
			// requests bag lookup — not found means confirmed
			getDfSpy.mockRejectedValueOnce(
				Object.assign(new Error('not found'), { code: 'dynamicFieldNotFound' }),
			);

			const result = await client.hashi.view.depositStatus('test-digest');
			expect(result).not.toBeNull();
			expect(result!.status).toBe('confirmed');
			expect(result!.approvalTimestampMs).toBe(5_000n);
			expect(result!.confirmableAtMs).toBe(5_000n + 600_000n);
		});

		it('returns expired status when request object is not found', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: {
					events: [
						{
							eventType: `${PACKAGE_ID}::deposit::DepositRequested`,
							json: {
								request_id: REQUEST_ID,
								utxo_id: { txid: '0x' + 'ab'.repeat(32), vout: 0 },
								amount: '50000',
								derivation_path: TEST_SUI_ADDRESS,
								timestamp_ms: '1000',
							},
						},
					],
				},
			} as never);

			vi.spyOn(DepositRequest, 'get').mockRejectedValueOnce(
				Object.assign(new Error('not found'), { code: 'notExists' }),
			);

			const result = await client.hashi.view.depositStatus('test-digest');
			expect(result).not.toBeNull();
			expect(result!.status).toBe('expired');
		});
	});

	describe('view.withdrawalStatus', () => {
		it('returns null when no withdrawal event is found', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: { events: [] },
			} as never);

			const result = await client.hashi.view.withdrawalStatus('test-digest');
			expect(result).toBeNull();
		});

		it('returns cancelled status when request object is not found', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: {
					events: [
						{
							eventType: `${PACKAGE_ID}::withdrawal_queue::WithdrawalRequested`,
							json: {
								request_id: REQUEST_ID,
								btc_amount: '30000',
								bitcoin_address: Array.from(new Uint8Array(32).fill(0xcc)),
								timestamp_ms: '2000',
								requester_address: TEST_SUI_ADDRESS,
							},
						},
					],
				},
			} as never);

			vi.spyOn(WithdrawalRequest, 'get').mockRejectedValueOnce(
				Object.assign(new Error('not found'), { code: 'notExists' }),
			);

			const result = await client.hashi.view.withdrawalStatus('test-digest');
			expect(result).not.toBeNull();
			expect(result!.status).toBe('cancelled');
			expect(result!.btcTxid).toBeNull();
		});

		it('returns Requested status with null btcTxid when no withdrawal txn linked', async () => {
			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: {
					events: [
						{
							eventType: `${PACKAGE_ID}::withdrawal_queue::WithdrawalRequested`,
							json: {
								request_id: REQUEST_ID,
								btc_amount: '30000',
								bitcoin_address: Array.from(new Uint8Array(20).fill(0xaa)),
								timestamp_ms: '2000',
								requester_address: TEST_SUI_ADDRESS,
							},
						},
					],
				},
			} as never);

			vi.spyOn(WithdrawalRequest, 'get').mockResolvedValueOnce({
				json: {
					status: { $kind: 'Requested' },
					withdrawal_txn_id: null,
				},
			} as never);

			const result = await client.hashi.view.withdrawalStatus('test-digest');
			expect(result).not.toBeNull();
			expect(result!.status).toBe('Requested');
			expect(result!.btcTxid).toBeNull();
			expect(result!.btcAmountSats).toBe(30_000n);
		});

		it('returns current status with btcTxid when withdrawal transaction exists', async () => {
			const BTC_TXID_INTERNAL = '0x' + '99'.repeat(32);
			const BTC_TXID_DISPLAY = reverseTxidBytes(BTC_TXID_INTERNAL);

			vi.spyOn(client.core, 'getTransaction').mockResolvedValueOnce({
				Transaction: {
					events: [
						{
							eventType: `${PACKAGE_ID}::withdrawal_queue::WithdrawalRequested`,
							json: {
								request_id: REQUEST_ID,
								btc_amount: '30000',
								bitcoin_address: Array.from(new Uint8Array(32).fill(0xcc)),
								timestamp_ms: '2000',
								requester_address: TEST_SUI_ADDRESS,
							},
						},
					],
				},
			} as never);

			vi.spyOn(WithdrawalRequest, 'get').mockResolvedValueOnce({
				json: {
					status: { $kind: 'Signed' },
					withdrawal_txn_id: '0x' + 'f0'.repeat(32),
				},
			} as never);

			vi.spyOn(WithdrawalTransaction, 'get').mockResolvedValueOnce({
				json: { txid: BTC_TXID_INTERNAL },
			} as never);

			const result = await client.hashi.view.withdrawalStatus('test-digest');
			expect(result).not.toBeNull();
			expect(result!.status).toBe('Signed');
			expect(result!.btcTxid).toBe(BTC_TXID_DISPLAY);
		});
	});

	describe('view.depositGasEstimate', () => {
		it('returns gas estimate from simulation', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			vi.spyOn(client.core, 'simulateTransaction').mockResolvedValueOnce({
				Transaction: {
					effects: {
						gasUsed: {
							computationCost: '1000',
							storageCost: '500',
							storageRebate: '200',
						},
					},
				},
			} as never);

			const result = await client.hashi.view.depositGasEstimate(TEST_SUI_ADDRESS);
			// (1000 + 500 - 200) * 120 / 100 = 1560
			expect(result.gasEstimateMist).toBe(1560n);
		});

		it('returns 0n when simulation fails', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			vi.spyOn(client.core, 'simulateTransaction').mockRejectedValueOnce(
				new Error('simulation failed'),
			);

			const result = await client.hashi.view.depositGasEstimate(TEST_SUI_ADDRESS);
			expect(result.gasEstimateMist).toBe(0n);
		});
	});

	describe('view.withdrawalFees', () => {
		it('returns fees from governance config without gas when no sender', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);

			const result = await client.hashi.view.withdrawalFees();
			expect(result.withdrawalMinimumSats).toBe(30_000n);
			expect(result.worstCaseNetworkFeeSats).toBe(30_000n - 546n);
			expect(result.gasEstimateMist).toBe(0n);
		});

		it('includes gas estimate when sender is provided', async () => {
			mockHashiWithConfig(WELL_FORMED_CONFIG);
			vi.spyOn(client.core, 'simulateTransaction').mockResolvedValueOnce({
				Transaction: {
					effects: {
						gasUsed: {
							computationCost: '2000',
							storageCost: '1000',
							storageRebate: '500',
						},
					},
				},
			} as never);

			const result = await client.hashi.view.withdrawalFees(TEST_SUI_ADDRESS);
			expect(result.withdrawalMinimumSats).toBe(30_000n);
			// (2000 + 1000 - 500) * 120 / 100 = 3000
			expect(result.gasEstimateMist).toBe(3000n);
		});
	});

	describe('waitForDeposit', () => {
		it('returns immediately when deposit is already confirmed', async () => {
			const statusSpy = vi.spyOn(client.hashi.view, 'depositStatus').mockResolvedValueOnce({
				requestId: REQUEST_ID,
				amountSats: 50_000n,
				recipient: TEST_SUI_ADDRESS,
				btcTxid: '0x' + 'ab'.repeat(32),
				btcVout: 0,
				timestampMs: 1_000n,
				approvalTimestampMs: 2_000n,
				confirmableAtMs: 602_000n,
				status: 'confirmed',
				suiTxDigest: 'test-digest',
			});

			const result = await client.hashi.waitForDeposit('test-digest');
			expect(result.status).toBe('confirmed');
			expect(statusSpy).toHaveBeenCalledTimes(1);
		});

		it('returns when deposit is expired', async () => {
			vi.spyOn(client.hashi.view, 'depositStatus').mockResolvedValueOnce({
				requestId: REQUEST_ID,
				amountSats: 50_000n,
				recipient: TEST_SUI_ADDRESS,
				btcTxid: '0x' + 'ab'.repeat(32),
				btcVout: 0,
				timestampMs: 1_000n,
				approvalTimestampMs: null,
				confirmableAtMs: null,
				status: 'expired',
				suiTxDigest: 'test-digest',
			});

			const result = await client.hashi.waitForDeposit('test-digest');
			expect(result.status).toBe('expired');
		});

		it('throws when deposit is not found', async () => {
			vi.spyOn(client.hashi.view, 'depositStatus').mockResolvedValueOnce(null);

			await expect(client.hashi.waitForDeposit('test-digest')).rejects.toThrow('Deposit not found');
		});

		it('aborts polling when signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(
				client.hashi.waitForDeposit('test-digest', { signal: controller.signal }),
			).rejects.toThrow('Polling aborted');
		});
	});

	describe('waitForWithdrawal', () => {
		it('returns immediately when withdrawal is already confirmed', async () => {
			vi.spyOn(client.hashi.view, 'withdrawalStatus').mockResolvedValueOnce({
				requestId: REQUEST_ID,
				btcAmountSats: 30_000n,
				bitcoinAddress: new Uint8Array(32),
				sender: TEST_SUI_ADDRESS,
				timestampMs: 2_000n,
				status: 'Confirmed',
				suiTxDigest: 'test-digest',
				btcTxid: '0x' + '99'.repeat(32),
			});

			const result = await client.hashi.waitForWithdrawal('test-digest');
			expect(result.status).toBe('Confirmed');
		});

		it('returns when withdrawal is cancelled', async () => {
			vi.spyOn(client.hashi.view, 'withdrawalStatus').mockResolvedValueOnce({
				requestId: REQUEST_ID,
				btcAmountSats: 30_000n,
				bitcoinAddress: new Uint8Array(32),
				sender: TEST_SUI_ADDRESS,
				timestampMs: 2_000n,
				status: 'cancelled',
				suiTxDigest: 'test-digest',
				btcTxid: null,
			});

			const result = await client.hashi.waitForWithdrawal('test-digest');
			expect(result.status).toBe('cancelled');
		});

		it('throws when withdrawal is not found', async () => {
			vi.spyOn(client.hashi.view, 'withdrawalStatus').mockResolvedValueOnce(null);

			await expect(client.hashi.waitForWithdrawal('test-digest')).rejects.toThrow(
				'Withdrawal not found',
			);
		});

		it('aborts polling when signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(
				client.hashi.waitForWithdrawal('test-digest', { signal: controller.signal }),
			).rejects.toThrow('Polling aborted');
		});
	});

	describe('bitcoin (BTC RPC)', () => {
		it('throws when btcRpcUrl is not configured', async () => {
			await expect(client.hashi.bitcoin.lookupVout('txid', 'addr')).rejects.toThrow(
				'btcRpcUrl is required',
			);
		});

		it('throws for lookupAllVouts without btcRpcUrl', async () => {
			await expect(client.hashi.bitcoin.lookupAllVouts('txid', 'addr')).rejects.toThrow(
				'btcRpcUrl is required',
			);
		});

		it('throws for confirmations without btcRpcUrl', async () => {
			await expect(client.hashi.bitcoin.confirmations('txid')).rejects.toThrow(
				'btcRpcUrl is required',
			);
		});
	});

	describe('tx', () => {
		describe('deposit', () => {
			it('composes utxo_id + utxo + deposit for a single UTXO', () => {
				const tx = client.hashi.tx.deposit({
					txid: '0x' + 'ab'.repeat(32),
					utxos: [{ vout: 0, amountSats: 100_000n }],
					recipient: TEST_SUI_ADDRESS,
				});
				expect(tx).toBeInstanceOf(Transaction);

				const { commands } = tx.getData();
				expect(commands).toHaveLength(3);

				expect(commands[0].$kind).toBe('MoveCall');
				expect(commands[0].MoveCall?.function).toBe('utxo_id');

				expect(commands[1].$kind).toBe('MoveCall');
				expect(commands[1].MoveCall?.function).toBe('utxo');

				expect(commands[2].$kind).toBe('MoveCall');
				expect(commands[2].MoveCall?.function).toBe('deposit');
			});

			it('batches multiple UTXOs into one PTB (one triple per UTXO)', () => {
				const tx = client.hashi.tx.deposit({
					txid: '0x' + 'cd'.repeat(32),
					utxos: [
						{ vout: 0, amountSats: 100_000n },
						{ vout: 2, amountSats: 50_000n },
					],
					recipient: TEST_SUI_ADDRESS,
				});

				const { commands } = tx.getData();
				expect(commands).toHaveLength(6);

				const functions = commands.map((c) => c.MoveCall?.function);
				expect(functions).toEqual(['utxo_id', 'utxo', 'deposit', 'utxo_id', 'utxo', 'deposit']);
			});
		});

		describe('cancelWithdrawal', () => {
			it('composes cancel + from_balance + transferObjects', () => {
				const tx = client.hashi.tx.cancelWithdrawal({
					requestId: REQUEST_ID,
					recipient: TEST_SUI_ADDRESS,
				});
				expect(tx).toBeInstanceOf(Transaction);

				const { commands } = tx.getData();
				expect(commands).toHaveLength(3);

				expect(commands[0].$kind).toBe('MoveCall');
				expect(commands[0].MoveCall?.function).toBe('cancel_withdrawal');

				expect(commands[1].$kind).toBe('MoveCall');
				expect(commands[1].MoveCall?.function).toBe('from_balance');
				expect(commands[1].MoveCall?.typeArguments).toEqual([`${PACKAGE_ID}::btc::BTC`]);

				expect(commands[2].$kind).toBe('TransferObjects');
			});
		});

		describe('requestWithdrawal', () => {
			it('composes coinWithBalance + into_balance + request_withdrawal', () => {
				const tx = client.hashi.tx.requestWithdrawal({
					amount: 50_000n,
					bitcoinAddress: new Uint8Array(32),
				});
				expect(tx).toBeInstanceOf(Transaction);

				const { commands } = tx.getData();
				const moveCalls = commands.filter((c) => c.$kind === 'MoveCall');

				const intoBalance = moveCalls.find((c) => c.MoveCall?.function === 'into_balance');
				expect(intoBalance?.MoveCall?.typeArguments).toEqual([`${PACKAGE_ID}::btc::BTC`]);

				expect(moveCalls.some((c) => c.MoveCall?.function === 'request_withdrawal')).toBe(true);
			});
		});
	});
});

describe('HashiClient guardian', () => {
	const GUARDIAN_ORIGIN = 'https://guardian.example';

	/** Curated `/info` body matching the proxy contract (u64s as strings). */
	const INFO_BODY = {
		limiter: {
			state: {
				numTokensAvailableSats: '400000',
				lastUpdatedAtSecs: '1720000000',
				nextSeq: '7',
			},
			config: { refillRateSatsPerSec: '1000', maxBucketCapacitySats: '2000000' },
		},
		gitRevision: 'abc123',
		committeeEpoch: '3',
		btcPubkey: 'deadbeef',
		signingPubKey: 'feedface',
		signedAtMs: '1720000000123',
	};

	/** The parsed limiter matching INFO_BODY, for provider-based tests. */
	const LIMITER: NonNullable<RawGuardianInfo['limiter']> = {
		state: { numTokensAvailableSats: 400_000n, lastUpdatedAtSecs: 1_720_000_000n, nextSeq: 7n },
		config: { refillRateSatsPerSec: 1_000n, maxBucketCapacitySats: 2_000_000n },
	};

	function rawInfo(limiter: RawGuardianInfo['limiter']): RawGuardianInfo {
		return {
			limiter,
			gitRevision: 'abc123',
			committeeEpoch: 3n,
			btcPubkey: 'deadbeef',
			signingPubKey: 'feedface',
			signedAtMs: 1_720_000_000_123n,
		};
	}

	function makeClient(opts?: {
		guardianUrl?: string;
		guardianInfoProvider?: GuardianInfoProvider;
	}) {
		return new SuiGrpcClient({
			network: 'devnet',
			baseUrl: 'https://fullnode.devnet.sui.io:443',
		}).$extend(
			hashi({
				network: 'devnet',
				hashiObjectId: HASHI_OBJECT_ID,
				packageId: PACKAGE_ID,
				bitcoinNetwork: 'regtest',
				...opts,
			}),
		);
	}

	function mockGuardianFetch(body: unknown, init?: { ok?: boolean; status?: number }) {
		return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
			ok: init?.ok ?? true,
			status: init?.status ?? 200,
			json: async () => body,
		} as Response);
	}

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('guardianInfoProvider takes precedence over guardianUrl and on-chain', async () => {
		const provider = vi.fn(async () => rawInfo(LIMITER));
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const getSpy = vi.spyOn(Hashi, 'get');
		const client = makeClient({ guardianInfoProvider: provider, guardianUrl: GUARDIAN_ORIGIN });

		const info = await client.hashi.guardian.info();

		expect(info.limiter).toEqual(LIMITER);
		expect(provider).toHaveBeenCalledOnce();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(getSpy).not.toHaveBeenCalled();
	});

	it('guardianUrl takes precedence over the on-chain config', async () => {
		const fetchSpy = mockGuardianFetch(INFO_BODY);
		const getSpy = vi.spyOn(Hashi, 'get');
		const client = makeClient({ guardianUrl: GUARDIAN_ORIGIN });

		const info = await client.hashi.guardian.info();

		expect(fetchSpy).toHaveBeenCalledWith(`${GUARDIAN_ORIGIN}/info`, {
			headers: { Accept: 'application/json' },
		});
		expect(getSpy).not.toHaveBeenCalled();
		expect(info.limiter?.state.numTokensAvailableSats).toBe(400_000n);
	});

	it('resolves the guardian URL from the on-chain guardian_url config', async () => {
		mockHashiWithConfig([
			...WELL_FORMED_CONFIG,
			{ key: 'guardian_url', value: { $kind: 'String', String: GUARDIAN_ORIGIN } },
		]);
		const fetchSpy = mockGuardianFetch(INFO_BODY);
		const client = makeClient();

		await client.hashi.guardian.info();

		expect(Hashi.get).toHaveBeenCalledOnce();
		expect(fetchSpy).toHaveBeenCalledWith(`${GUARDIAN_ORIGIN}/info`, {
			headers: { Accept: 'application/json' },
		});
	});

	it('throws not-configured when no guardian URL can be resolved', async () => {
		mockHashiWithConfig(WELL_FORMED_CONFIG); // no guardian_url entry
		const client = makeClient();

		const err = await client.hashi.guardian.info().catch((e) => e);
		expect(err).toBeInstanceOf(HashiGuardianError);
		expect(err.code).toBe('not-configured');
	});

	it('re-reads on-chain while guardian_url is absent, then caches it once launch publishes it', async () => {
		// hashi#772 defers `guardian_url` to launch (`finish_publish`), so a client
		// created pre-launch must keep re-reading the chain — never cache the
		// absence and fail forever once the URL appears.
		const client = makeClient();

		// Pre-launch: absent guardian_url → not-configured, re-read (not cached) each call.
		mockHashiWithConfig(WELL_FORMED_CONFIG);
		expect((await client.hashi.guardian.info().catch((e) => e)).code).toBe('not-configured');
		mockHashiWithConfig(WELL_FORMED_CONFIG);
		expect((await client.hashi.guardian.info().catch((e) => e)).code).toBe('not-configured');
		expect(Hashi.get).toHaveBeenCalledTimes(2); // re-read each time, never cached a null

		// Launch publishes guardian_url → the same client resolves and succeeds.
		mockHashiWithConfig([
			...WELL_FORMED_CONFIG,
			{ key: 'guardian_url', value: { $kind: 'String', String: GUARDIAN_ORIGIN } },
		]);
		const fetchSpy = mockGuardianFetch(INFO_BODY);
		const info = await client.hashi.guardian.info();
		expect(info.limiter?.state.numTokensAvailableSats).toBe(400_000n);
		expect(fetchSpy).toHaveBeenCalledWith(`${GUARDIAN_ORIGIN}/info`, {
			headers: { Accept: 'application/json' },
		});
		expect(Hashi.get).toHaveBeenCalledTimes(3); // one more read to pick up the URL

		// Now cached: a later call skips the chain read and hits the guardian directly.
		mockGuardianFetch(INFO_BODY);
		await client.hashi.guardian.info();
		expect(Hashi.get).toHaveBeenCalledTimes(3); // unchanged — URL cached after launch
	});

	it('info() returns limiter: null but limiterStatus()/canWithdraw() throw not-initialized', async () => {
		const client = makeClient({ guardianInfoProvider: async () => rawInfo(null) });

		expect((await client.hashi.guardian.info()).limiter).toBeNull();

		const statusErr = await client.hashi.guardian.limiterStatus().catch((e) => e);
		expect(statusErr).toBeInstanceOf(HashiGuardianError);
		expect(statusErr.code).toBe('not-initialized');

		const withdrawErr = await client.hashi.guardian.canWithdraw(1n).catch((e) => e);
		expect(withdrawErr).toBeInstanceOf(HashiGuardianError);
		expect(withdrawErr.code).toBe('not-initialized');
	});

	it('limiterStatus() projects capacity, fill %, and the refill-to-full ETA', async () => {
		// 100s after lastUpdatedAt: 400_000 + 100*1_000 = 500_000 of 2_000_000 (25%).
		vi.spyOn(Date, 'now').mockReturnValue(1_720_000_100_000);
		const client = makeClient({ guardianInfoProvider: async () => rawInfo(LIMITER) });

		const status = await client.hashi.guardian.limiterStatus();

		expect(status.availableNowSats).toBe(500_000n);
		expect(status.bucketFillPercent).toBe(25);
		// Deficit 1_500_000 / 1_000 sat/s = 1_500s until full.
		expect(status.fullAtSecs).toBe(1_720_001_600n);
	});

	it('canWithdraw() reports allowed and the estimated wait', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_720_000_100_000); // available = 500_000
		const client = makeClient({ guardianInfoProvider: async () => rawInfo(LIMITER) });

		expect(await client.hashi.guardian.canWithdraw(500_000n)).toEqual({
			allowed: true,
			availableNowSats: 500_000n,
			estimatedWaitSecs: 0n,
		});
		expect(await client.hashi.guardian.canWithdraw(700_000n)).toEqual({
			allowed: false,
			availableNowSats: 500_000n,
			estimatedWaitSecs: 200n, // deficit 200_000 / 1_000 sat/s
		});
	});
});
