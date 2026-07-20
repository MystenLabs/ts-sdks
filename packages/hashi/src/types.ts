// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export type BitcoinNetwork = 'mainnet' | 'testnet' | 'signet' | 'regtest';

export type SuiNetwork = 'devnet' | 'testnet' | 'mainnet' | 'localnet';

export interface NetworkConfig {
	hashiObjectId: string;
	packageId: string;
	bitcoinNetwork: BitcoinNetwork;
}

export interface HashiClientOptions<Name = string> {
	name?: Name;
	/** Sui network — determines Hashi object IDs and default Bitcoin network. */
	network: SuiNetwork;
	/** Override the auto-resolved Hashi shared object ID (for custom/local deployments). */
	hashiObjectId?: string;
	/** Override the auto-resolved Hashi package ID (for custom/local deployments). */
	packageId?: string;
	/** Override the auto-resolved Bitcoin network for address encoding. */
	bitcoinNetwork?: BitcoinNetwork;
	/** Optional Bitcoin Core JSON-RPC URL for UTXO lookups and confirmation checks. */
	btcRpcUrl?: string;
	/** Override the Sui GraphQL endpoint URL (defaults to `https://fullnode.{network}.sui.io:443/graphql`). */
	graphqlUrl?: string;
	/** Guardian origin URL (e.g. `https://hashi-guardian-devnet.mystenlabs.com`); the SDK appends `/info`. Takes precedence over the on-chain `guardian_url` config. */
	guardianUrl?: string;
	/** Custom guardian-info source. When set, the SDK calls this instead of fetching `/info` — useful for caching, tests, or bespoke transports. */
	guardianInfoProvider?: GuardianInfoProvider;
}

/**
 * Frozen snapshot of every governance-controlled protocol parameter, returned
 * by `HashiClient.view.all()`. Fields are `readonly` because the snapshot is
 * a point-in-time read from chain — mutating it locally cannot change on-chain
 * state. `depositMinimum` is a Move-side alias of `bitcoinDepositMinimum`;
 * `worstCaseNetworkFee` is derived as `bitcoinWithdrawalMinimum - 546` (the
 * dust relay floor) and is always ≥ 1.
 *
 * The three `guardian*` fields are `null` on deployments where the guardian
 * config hasn't been written yet (pre-feature chains or in-flight rollouts).
 * `guardianBtcPublicKey` is required for {@link HashiClient.generateDepositAddress}
 * to succeed.
 */
export interface GovernanceConfig {
	readonly paused: boolean;
	readonly bitcoinChainId: string;
	readonly bitcoinDepositMinimum: bigint;
	readonly bitcoinWithdrawalMinimum: bigint;
	readonly bitcoinConfirmationThreshold: bigint;
	readonly withdrawalCancellationCooldownMs: bigint;
	readonly bitcoinDepositTimeDelayMs: bigint;
	readonly depositMinimum: bigint;
	readonly worstCaseNetworkFee: bigint;
	/** Guardian gRPC/HTTP endpoint from on-chain config. `null` if unset. */
	readonly guardianUrl: string | null;
	/**
	 * Guardian's Ed25519 attestation key (32 bytes), used to verify signed
	 * `GetGuardianInfo` responses. `null` if unset.
	 */
	readonly guardianPublicKey: Uint8Array | null;
	/**
	 * Guardian's BIP-340 x-only secp256k1 BTC public key (32 bytes), the
	 * `pk1` slot of the immediate 2-of-2 leaf in the on-chain deposit-address
	 * descriptor. `null` if unset (deposit-address derivation will fail).
	 */
	readonly guardianBtcPublicKey: Uint8Array | null;
}

/**
 * A single UTXO output within a Bitcoin transaction used to fund a deposit.
 * `vout` is the output index (Bitcoin u32); `amountSats` must be ≥ the
 * on-chain deposit minimum (enforced at deposit time).
 */
export interface UtxoOutput {
	readonly vout: number;
	readonly amountSats: bigint;
}

/** Parameters for `HashiClient.deposit()` — one Bitcoin txid, one or more outputs paying the deposit address. */
export interface DepositParams {
	/**
	 * 0x-prefixed 32-byte Bitcoin txid of the funding transaction, in
	 * **display byte order** — the form mempool.space, blockstream.info,
	 * and `bitcoin-cli` show. The SDK reverses to internal byte order
	 * before recording on-chain (see `reverseTxidBytes` in `util.ts`).
	 */
	readonly txid: string;
	/** UTXOs from `txid` that paid the deposit address (one per output to the address). */
	readonly utxos: readonly UtxoOutput[];
	/**
	 * Sui address that derived the deposit address and will receive the minted
	 * hBTC. Becomes the `derivation_path` of every `Utxo` built in the PTB.
	 */
	readonly recipient: string;
}

/** Parameters for `HashiClient.requestWithdrawal()`. */
export interface WithdrawalParams {
	/** Amount in satoshis to withdraw. Must be ≥ the on-chain withdrawal minimum. */
	readonly amountSats: bigint;
	/**
	 * Recipient Bitcoin address. Bech32 for P2WPKH (`bc1q…`, `tb1q…`) or
	 * bech32m for P2TR (`bc1p…`, `tb1p…`). Decoded client-side into a witness
	 * program and must match the client's configured Bitcoin network.
	 */
	readonly bitcoinAddress: string;
}

/** Parameters for `HashiClient.cancelWithdrawal()`. */
export interface CancelWithdrawalParams {
	/** 0x-prefixed 32-byte object ID of the pending withdrawal request. */
	readonly requestId: string;
}

// ---------------------------------------------------------------------------
// View-layer types — returned by `HashiClient.view.*` read methods.
// ---------------------------------------------------------------------------

/**
 * Identifies a single Bitcoin UTXO by its funding transaction and output
 * index. `txid` is in **display byte order** — the form mempool.space,
 * blockstream.info, and `bitcoin-cli` show.
 */
export interface UtxoId {
	/** 0x-prefixed 32-byte Bitcoin txid in display byte order. */
	readonly txid: string;
	/** Output index within the Bitcoin transaction (u32). */
	readonly vout: number;
}

/**
 * Result of checking a single UTXO against the on-chain `UtxoPool` bags.
 * `inActivePool` means the UTXO is live (confirmed deposit, not yet
 * consumed by a withdrawal); `inSpentPool` means it was consumed.
 */
export interface UtxoUsageResult {
	readonly utxoId: UtxoId;
	readonly inActivePool: boolean;
	readonly inSpentPool: boolean;
	/** Convenience: `inActivePool || inSpentPool`. */
	readonly isUsed: boolean;
}

/** Discriminated union of deposit and withdrawal history entries. */
export type TransactionHistoryItem = DepositHistoryItem | WithdrawalHistoryItem;

export interface DepositHistoryItem {
	readonly kind: 'deposit';
	readonly requestId: string;
	readonly sender: string;
	readonly timestampMs: bigint;
	readonly suiTxDigest: string;
	readonly amountSats: bigint;
	/** Bitcoin txid of the funding transaction, in display byte order. */
	readonly btcTxid: string;
	/** Output index within the funding transaction. */
	readonly btcVout: number;
	/** `true` once the committee has approved the deposit. */
	readonly approved: boolean;
	readonly approvalTimestampMs: bigint | null;
	/** Earliest wall-clock time (ms since epoch) at which the deposit can be confirmed. `null` until approved. */
	readonly confirmableAtMs: bigint | null;
}

export type WithdrawalStatus = 'Requested' | 'Approved' | 'Processing' | 'Signed' | 'Confirmed';

export interface WithdrawalHistoryItem {
	readonly kind: 'withdrawal';
	readonly requestId: string;
	readonly sender: string;
	readonly btcAmountSats: bigint;
	/** Raw witness program bytes of the destination Bitcoin address. */
	readonly bitcoinAddress: Uint8Array;
	readonly timestampMs: bigint;
	readonly suiTxDigest: string;
	readonly status: WithdrawalStatus;
	/** Object ID of the linked `WithdrawalTransaction`, if one exists. */
	readonly withdrawalTxnId: string | null;
	/** Bitcoin txid from the `WithdrawalTransaction`, in display byte order. `null` until the committee commits. */
	readonly btcTxid: string | null;
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export interface HbtcBalance {
	/** Total hBTC balance in satoshis. */
	readonly totalBalance: bigint;
	/** Number of coin objects held. */
	readonly coinObjectCount: number;
}

// ---------------------------------------------------------------------------
// Deposit status (by Sui tx digest)
// ---------------------------------------------------------------------------

export type DepositStatus = 'pending' | 'confirmed' | 'expired' | 'unknown';

export interface DepositInfo {
	/** Unique request ID on-chain. */
	readonly requestId: string;
	/** Deposit amount in satoshis. */
	readonly amountSats: bigint;
	/** Recipient Sui address (derivation path). */
	readonly recipient: string | null;
	/** Bitcoin transaction ID (display byte order). */
	readonly btcTxid: string;
	/** Bitcoin output index. */
	readonly btcVout: number;
	/** Request timestamp (ms since epoch). */
	readonly timestampMs: bigint;
	/** Timestamp (ms since epoch) when the committee approved this deposit. `null` if not yet approved. */
	readonly approvalTimestampMs: bigint | null;
	/** Earliest wall-clock time (ms since epoch) at which the deposit can be confirmed. `null` until approved or if the config could not be read. */
	readonly confirmableAtMs: bigint | null;
	/** Current deposit status. */
	readonly status: DepositStatus;
	/** Sui transaction digest that created this request. */
	readonly suiTxDigest: string;
}

// ---------------------------------------------------------------------------
// Withdrawal status (by Sui tx digest)
// ---------------------------------------------------------------------------

export interface WithdrawalInfo {
	/** Unique request ID on-chain. */
	readonly requestId: string;
	/** Withdrawal amount in satoshis. */
	readonly btcAmountSats: bigint;
	/** Raw witness program bytes of the destination Bitcoin address. */
	readonly bitcoinAddress: Uint8Array;
	/** Sui address of the requester. */
	readonly sender: string;
	/** Request timestamp (ms since epoch). */
	readonly timestampMs: bigint;
	/** Current withdrawal status. */
	readonly status: WithdrawalStatus | 'cancelled';
	/** Sui transaction digest that created this request. */
	readonly suiTxDigest: string;
	/** Bitcoin txid from the `WithdrawalTransaction`, in display byte order. `null` until the committee commits. */
	readonly btcTxid: string | null;
}

// ---------------------------------------------------------------------------
// Fee estimation
// ---------------------------------------------------------------------------

export interface DepositFees {
	/** Estimated gas cost in MIST. */
	readonly gasEstimateMist: bigint;
}

export interface WithdrawalFees {
	/** Worst-case BTC network fee in satoshis. */
	readonly worstCaseNetworkFeeSats: bigint;
	/** Minimum withdrawal amount in satoshis. */
	readonly withdrawalMinimumSats: bigint;
	/** Estimated gas cost in MIST (`0n` if `sender` was not provided). */
	readonly gasEstimateMist: bigint;
}

// ---------------------------------------------------------------------------
// Polling options
// ---------------------------------------------------------------------------

export interface WaitOptions {
	/** Polling interval in milliseconds (default: 15_000). */
	readonly intervalMs?: number;
	/** Abort signal to cancel polling. */
	readonly signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Bitcoin RPC
// ---------------------------------------------------------------------------

export interface UtxoLookupResult {
	/** Output index. */
	readonly vout: number;
	/** Amount in satoshis. */
	readonly amountSats: bigint;
}

// ---------------------------------------------------------------------------
// Guardian rate limiter
// ---------------------------------------------------------------------------

export interface GuardianLimiterState {
	/** Available tokens in satoshis at the snapshot instant. */
	readonly numTokensAvailableSats: bigint;
	/** Unix seconds when the bucket was last updated. */
	readonly lastUpdatedAtSecs: bigint;
	/** Next expected withdrawal sequence number. */
	readonly nextSeq: bigint;
}

export interface GuardianLimiterConfig {
	/** Token refill rate in satoshis per second. */
	readonly refillRateSatsPerSec: bigint;
	/** Maximum bucket capacity in satoshis. */
	readonly maxBucketCapacitySats: bigint;
}

/** Raw limiter state + config, as returned by the guardian `/info` endpoint. */
export interface GuardianLimiterRaw {
	readonly state: GuardianLimiterState;
	readonly config: GuardianLimiterConfig;
}

/**
 * Curated guardian identity + limiter, parsed from `GET {guardianUrl}/info`.
 * `limiter` is `null` until the guardian is provisioned/activated.
 */
export interface RawGuardianInfo {
	readonly limiter: GuardianLimiterRaw | null;
	/** Guardian build git revision (untrusted, enclave-self-reported). */
	readonly gitRevision: string;
	/** Current committee epoch; `null` before the guardian is initialized. */
	readonly committeeEpoch: bigint | null;
	/** Guardian x-only 32-byte BTC pubkey (hex); `null` before provisioning. */
	readonly btcPubkey: string | null;
	/** Guardian ed25519 32-byte signing pubkey (hex). */
	readonly signingPubKey: string;
	/** `GuardianInfo` signing timestamp (ms since epoch); `null` if absent. */
	readonly signedAtMs: bigint | null;
}

/** Pluggable source for {@link RawGuardianInfo}; see `HashiClientOptions.guardianInfoProvider`. */
export type GuardianInfoProvider = () => Promise<RawGuardianInfo>;

/** Derived limiter view returned by `client.hashi.guardian.limiterStatus()`. */
export interface GuardianLimiterSnapshot {
	readonly state: GuardianLimiterState;
	readonly config: GuardianLimiterConfig;
	/** Projected available tokens (sats), accounting for refill since `lastUpdatedAtSecs`. */
	readonly availableNowSats: bigint;
	/** Bucket fill as a percentage in [0, 100]. */
	readonly bucketFillPercent: number;
	/** Unix seconds at which the bucket refills to full (assuming no withdrawals). `null` if already full or the refill rate is 0. */
	readonly fullAtSecs: bigint | null;
}

/** Result of `client.hashi.guardian.canWithdraw(amountSats)`. */
export interface GuardianWithdrawCheck {
	readonly allowed: boolean;
	/** Current available capacity in sats. */
	readonly availableNowSats: bigint;
	/** Seconds until `amountSats` is available; `0n` if available now; `null` if it exceeds max capacity (or the refill rate is 0). */
	readonly estimatedWaitSecs: bigint | null;
}
