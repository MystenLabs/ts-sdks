// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { HashiClient, hashi } from '../../src/client.js';
import { NETWORK_CONFIG } from '../../src/constants.js';
import type { BitcoinNetwork, SuiNetwork } from '../../src/types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_DEVNET_RPC = 'https://fullnode.devnet.sui.io:443';

export type ExtendedHashiClient = SuiGrpcClient & { hashi: HashiClient };

/**
 * Localnet target is selected by `HASHI_E2E_SUI_NETWORK=localnet`. The CI
 * workflow exports this alongside the freshly-published package/Hashi-object
 * IDs; locally, leaving it unset (or `=devnet`) falls back to the historical
 * devnet flow that `view.test.ts` and `deposit.test.ts` already document.
 */
export function isLocalnet(): boolean {
	return process.env.HASHI_E2E_SUI_NETWORK === 'localnet';
}

interface ResolvedClientConfig {
	rpcUrl: string;
	network: SuiNetwork;
	packageId: string;
	hashiObjectId: string;
	bitcoinNetwork: BitcoinNetwork;
}

function resolveClientConfig(): ResolvedClientConfig {
	const network = (process.env.HASHI_E2E_SUI_NETWORK ?? 'devnet') as SuiNetwork;
	const rpcUrl = process.env.HASHI_E2E_SUI_RPC_URL ?? DEFAULT_DEVNET_RPC;
	const fallback = NETWORK_CONFIG[network];
	const packageId = process.env.HASHI_E2E_PACKAGE_ID ?? fallback?.packageId;
	const hashiObjectId = process.env.HASHI_E2E_HASHI_OBJECT_ID ?? fallback?.hashiObjectId;
	const bitcoinNetwork = (process.env.HASHI_E2E_BITCOIN_NETWORK ?? fallback?.bitcoinNetwork) as
		| BitcoinNetwork
		| undefined;
	if (!packageId || !hashiObjectId || !bitcoinNetwork) {
		throw new Error(
			`Missing integration-test config for network=${network}. ` +
				'Set HASHI_E2E_PACKAGE_ID, HASHI_E2E_HASHI_OBJECT_ID, and ' +
				'HASHI_E2E_BITCOIN_NETWORK (localnet), or run against a network ' +
				'that has a NETWORK_CONFIG entry (devnet).',
		);
	}
	return { rpcUrl, network, packageId, hashiObjectId, bitcoinNetwork };
}

/**
 * Constructs the SDK client wired to whatever target the env points at.
 * Single source of truth for `new SuiGrpcClient(...).$extend(hashi(...))`
 * so devnet and localnet tests stay byte-identical at the call site.
 */
export function makeClient(): ExtendedHashiClient {
	const cfg = resolveClientConfig();
	return new SuiGrpcClient({ network: cfg.network, baseUrl: cfg.rpcUrl }).$extend(
		hashi({
			network: cfg.network,
			packageId: cfg.packageId,
			hashiObjectId: cfg.hashiObjectId,
			bitcoinNetwork: cfg.bitcoinNetwork,
		}),
	);
}

/**
 * Resolves the test signer. Localnet supplies a PKCS#8 PEM written by
 * `hashi-localnet start` (the genesis-funded user key); devnet supplies a
 * `suiprivkey1…` bech32 string via `.env`. Node's `createPrivateKey` parses
 * the PKCS#8 wrapper and exposes the Ed25519 seed via JWK `d`, which feeds
 * straight into `Ed25519Keypair.fromSecretKey`.
 */
export function makeSigner(): Ed25519Keypair {
	const pemPath = process.env.HASHI_E2E_FUNDED_KEY_PEM;
	if (pemPath) {
		const pem = readFileSync(pemPath, 'utf8');
		const key = createPrivateKey({ key: pem, format: 'pem' });
		const jwk = key.export({ format: 'jwk' }) as { d?: string; kty?: string; crv?: string };
		if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || !jwk.d) {
			throw new Error(
				`Expected an Ed25519 PKCS#8 PEM at ${pemPath}, got jwk=${JSON.stringify(jwk)}`,
			);
		}
		const seed = Buffer.from(jwk.d, 'base64url');
		if (seed.length !== 32) {
			throw new Error(`Expected 32-byte Ed25519 seed at ${pemPath}, got ${seed.length}`);
		}
		return Ed25519Keypair.fromSecretKey(new Uint8Array(seed));
	}
	const bech32 = process.env.HASHI_E2E_SUI_PRIVATE_KEY;
	if (!bech32) {
		throw new Error(
			'No signer available: set HASHI_E2E_FUNDED_KEY_PEM (localnet, written ' +
				'by `hashi-localnet start`) or HASHI_E2E_SUI_PRIVATE_KEY (devnet, bech32).',
		);
	}
	return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(bech32).secretKey);
}

/**
 * Invokes the `hashi-localnet` Rust CLI from the hashi repo checkout. The CI workflow
 * sets `HASHI_E2E_LOCALNET_BIN` to its absolute path and `HASHI_E2E_LOCALNET_DATA_DIR`
 * to the state dir; we always inject `--data-dir` so callers can't forget it.
 *
 * `--data-dir` is a *per-subcommand* flag in clap (each of `start`, `stop`,
 * `mine`, `faucet-sui`, `faucet-btc`, `deposit`, … defines its own), not a
 * top-level flag — so it must appear *after* the subcommand. Putting it
 * before the subcommand fails with `error: unexpected argument '--data-dir'`.
 */
export async function localnetCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
	const bin = process.env.HASHI_E2E_LOCALNET_BIN;
	const dataDir = process.env.HASHI_E2E_LOCALNET_DATA_DIR;
	if (!bin || !dataDir) {
		throw new Error(
			'HASHI_E2E_LOCALNET_BIN and HASHI_E2E_LOCALNET_DATA_DIR must be set on localnet',
		);
	}
	if (args.length === 0) {
		throw new Error('localnetCli requires at least a subcommand');
	}
	const [subcommand, ...rest] = args;
	return execFileAsync(bin, [subcommand, '--data-dir', dataDir, ...rest]);
}

interface BtcRpcOptions {
	/** Wallet name to scope the RPC against (e.g. "test"). */
	wallet?: string;
}

let btcRpcRequestId = 0;

/**
 * Calls Bitcoin Core JSON-RPC against the local regtest node. Reads URL/creds
 * from env (`HASHI_E2E_BTC_RPC_URL`, `HASHI_E2E_BTC_RPC_USER`,
 * `HASHI_E2E_BTC_RPC_PASS`). Pass `wallet` to target a specific wallet endpoint.
 */
export async function btcRpc<T = unknown>(
	method: string,
	params: unknown[] = [],
	opts: BtcRpcOptions = {},
): Promise<T> {
	const url = process.env.HASHI_E2E_BTC_RPC_URL;
	const user = process.env.HASHI_E2E_BTC_RPC_USER;
	const pass = process.env.HASHI_E2E_BTC_RPC_PASS;
	if (!url || !user || !pass) {
		throw new Error(
			'Bitcoin RPC env not configured: set HASHI_E2E_BTC_RPC_URL/USER/PASS (localnet).',
		);
	}
	const target = opts.wallet ? `${url}/wallet/${opts.wallet}` : url;
	const auth = Buffer.from(`${user}:${pass}`).toString('base64');
	const resp = await fetch(target, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
		body: JSON.stringify({ jsonrpc: '1.0', id: ++btcRpcRequestId, method, params }),
	});
	const body = (await resp.json()) as { result?: T; error?: { message: string } | null };
	if (body.error) throw new Error(`bitcoin RPC ${method} failed: ${body.error.message}`);
	return body.result as T;
}

/**
 * Fetches a Sui address's balance of a given coin type via the gRPC client.
 *
 * Uses gRPC `state.getBalance` rather than JSON-RPC `suix_getBalance` so a
 * read issued immediately after a `signAndExecuteTransaction` returns the
 * post-tx state. The JSON-RPC indexer can lag a committed checkpoint by a
 * few hundred milliseconds on localnet — long enough for the previous
 * implementation to fail withdrawal-lifecycle's "balance dropped after
 * requestWithdrawal" assertion (PR #11 run 25099701367).
 */
export async function fetchCoinBalance(
	client: ExtendedHashiClient,
	address: string,
	coinType: string,
): Promise<bigint> {
	const { balance } = await client.core.getBalance({ owner: address, coinType });
	return BigInt(balance.balance);
}

/** Default per-test SUI gas allocation: 1000 SUI in MIST. Plenty of headroom. */
const DEFAULT_FAUCET_AMOUNT_MIST = 1_000_000_000_000n;

/**
 * Localnet-only — generates a fresh Ed25519 keypair and funds its Sui
 * address with gas via `hashi-localnet faucet-sui`. Each test that needs
 * a signer should call this in `beforeAll` so concurrent integration test
 * files don't share a sender (no gas-object races, no hBTC cross-talk
 * between tests). The genesis-funded keypair stays the faucet source —
 * no test should sign with it directly.
 */
export async function freshFundedSigner(
	opts: { suiAmountMist?: bigint } = {},
): Promise<Ed25519Keypair> {
	const keypair = Ed25519Keypair.generate();
	const amount = opts.suiAmountMist ?? DEFAULT_FAUCET_AMOUNT_MIST;
	await localnetCli(['faucet-sui', keypair.toSuiAddress(), '--amount', String(amount)]);
	return keypair;
}

export function btcCoinType(): string {
	const cfg = resolveClientConfig();
	return `${cfg.packageId}::btc::BTC`;
}

export interface FundedUtxo {
	/** 0x-prefixed display-order Bitcoin txid. */
	readonly txid: string;
	readonly vout: number;
	readonly amountSats: bigint;
}

/**
 * Localnet-only — derive the deposit address for `suiAddress`, send a
 * funding tx to it from the pre-mined `test` wallet, mine enough blocks
 * to clear the on-chain confirmation threshold, and return the resulting
 * UTXO in the exact shape the SDK's `deposit()` accepts.
 *
 * Padding: `bitcoinDepositMinimum + 100_000` sats — leaves headroom for
 * governance changes without tripping `AmountBelowMinimumError`.
 */
export async function fundDepositOnLocalnet(
	client: ExtendedHashiClient,
	suiAddress: string,
): Promise<{ funded: FundedUtxo; depositAddress: string }> {
	const depositAddress = await client.hashi.generateDepositAddress({ suiAddress });
	const minDepositSats = await client.hashi.view.bitcoinDepositMinimum();
	const amountSats = minDepositSats + 100_000n;
	const amountBtc = Number(amountSats) / 1e8;

	const txid = await btcRpc<string>('sendtoaddress', [depositAddress, amountBtc], {
		wallet: 'test',
	});

	const threshold = await client.hashi.view.bitcoinConfirmationThreshold();
	await localnetCli(['mine', '--blocks', String(Number(threshold) + 1)]);

	interface RawTxOut {
		n: number;
		value: number;
		scriptPubKey: { address?: string };
	}
	const tx = await btcRpc<{ vout: RawTxOut[] }>('getrawtransaction', [txid, true], {
		wallet: 'test',
	});
	const out = tx.vout.find((v) => v.scriptPubKey.address === depositAddress);
	if (!out) {
		throw new Error(`localnet funding tx ${txid} did not contain an output for ${depositAddress}`);
	}
	return {
		funded: {
			txid: `0x${txid}`,
			vout: out.n,
			amountSats: BigInt(Math.round(out.value * 1e8)),
		},
		depositAddress,
	};
}

/**
 * Polls a Sui address's coin balance until it reaches `target` or the
 * deadline expires. Returns the final balance on success; throws with
 * the last observed value on timeout.
 */
export async function waitForCoinBalance(
	client: ExtendedHashiClient,
	address: string,
	coinType: string,
	target: bigint,
	opts: { timeoutMs: number; intervalMs: number },
): Promise<bigint> {
	const deadline = Date.now() + opts.timeoutMs;
	let last = 0n;
	for (;;) {
		last = await fetchCoinBalance(client, address, coinType);
		if (last >= target) return last;
		if (Date.now() >= deadline) {
			throw new Error(
				`coin balance did not reach target within ${opts.timeoutMs} ms — ` +
					`address=${address}, coin=${coinType}, target=${target}, last=${last}`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
	}
}

/**
 * Polls until the balance equals `expected` exactly. Use after a transaction
 * that should leave a known balance (e.g. the post-`requestWithdrawal` lock)
 * — Sui's balance index updates a beat after `signAndExecuteTransaction`
 * returns, so a same-tick read can briefly return the pre-tx value.
 */
export async function waitForCoinBalanceExact(
	client: ExtendedHashiClient,
	address: string,
	coinType: string,
	expected: bigint,
	opts: { timeoutMs: number; intervalMs: number },
): Promise<bigint> {
	const deadline = Date.now() + opts.timeoutMs;
	let last = 0n;
	for (;;) {
		last = await fetchCoinBalance(client, address, coinType);
		if (last === expected) return last;
		if (Date.now() >= deadline) {
			throw new Error(
				`coin balance did not reach ${expected} within ${opts.timeoutMs} ms — ` +
					`address=${address}, coin=${coinType}, last=${last}`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
	}
}
