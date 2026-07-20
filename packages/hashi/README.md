# @mysten/hashi

[![npm version](https://img.shields.io/npm/v/@mysten/hashi.svg)](https://www.npmjs.com/package/@mysten/hashi)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

TypeScript SDK for the [Hashi](https://github.com/MystenLabs/hashi) protocol. Hashi is a
decentralized Bitcoin collateralization primitive on Sui. Orchestrate native BTC directly from smart
contracts—without centralized balance sheets.

> [!WARNING] **Not production-ready.** This SDK is pre-1.0 and under active development. The API may
> change without notice and only Sui testnet and devnet are wired up. Do not use it in production
> environments yet.

End-user actions only: **deposit**, **request withdrawal**, **cancel withdrawal**.
Operator/committee/relayer calls are intentionally not part of this surface — those tools should
import the generated bindings under `src/contracts/hashi/` directly.

## Install

```bash
pnpm add @mysten/hashi @mysten/sui
```

`@mysten/sui` is a peer dependency.

## Setup

The SDK attaches to any Sui client via `$extend`. After extension, every Hashi method lives under
`client.hashi.*`.

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { hashi } from '@mysten/hashi';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(hashi());

const signer = Ed25519Keypair.fromSecretKey(/* … */);
```

> **Network support.** Sui **testnet** and **devnet** are wired up (Bitcoin **signet** by default).
> Prefer testnet — devnet support is temporary and will be deprecated. Mainnet is not yet deployed;
> `hashi()` will throw until it lands, based on the network of the client it's extending. To target
> a custom or local deployment, pass `hashiObjectId`, `packageId`, and `bitcoinNetwork` explicitly.

> **Optional client options.** `hashi({ ... })` also accepts `btcRpcUrl` — a Bitcoin Core JSON-RPC
> URL, required for the [`client.hashi.bitcoin.*`](#bitcoin-rpc-optional) lookups — and
> `graphqlUrl`, which overrides the Sui GraphQL endpoint used by
> [`transactionHistory`](#transaction-history) (defaults to
> `https://fullnode.{network}.sui.io:443/graphql`).

## Quickstart: Deposit BTC → mint hBTC

1. Derive the unique P2TR Bitcoin deposit address for your Sui address.
2. Send BTC to that address from any wallet.
3. Submit the funding `txid` + `vout` to Hashi for committee confirmation.

The committee watches the Bitcoin chain. Once the funding tx reaches `bitcoinConfirmationThreshold`
confirmations the committee **approves** the deposit; after an additional
`bitcoinDepositTimeDelayMs` safety window elapses the deposit becomes confirmable and `hBTC` is
minted to the `recipient` address. `view.depositStatus(digest).confirmableAtMs` reports that
earliest mint time.

```ts
const recipient = signer.toSuiAddress();

// 1. Get the deposit address.
const btcAddress = await client.hashi.generateDepositAddress({
	suiAddress: recipient,
});

// 2. Send BTC to `btcAddress` from any wallet, then collect the
//    funding tx's display-order txid and the vout that paid the
//    deposit address. (Display-order = the form mempool.space and
//    `bitcoin-cli` show — the SDK reverses internally.)

// 3. Record the deposit on Sui.
const result = await client.hashi.deposit({
	signer,
	txid: '0x<64-hex display-order txid>',
	utxos: [{ vout: 0, amountSats: 100_000n }],
	recipient,
});

if (result.$kind !== 'Transaction') {
	throw new Error(`deposit failed: ${JSON.stringify(result.FailedTransaction)}`);
}
// `hBTC` lands in `recipient`'s balance once the committee confirms.
```

A single funding tx may pay the deposit address on multiple outputs — pass them all in `utxos` and
they're batched into one atomic Sui PTB.

## Quickstart: Request withdrawal (burn hBTC → receive BTC)

Burns `amountSats` of `hBTC` from the signer's balance and enqueues a request for the committee to
send BTC to `bitcoinAddress`. The address is decoded client-side as bech32 (P2WPKH) or bech32m
(P2TR) and must match the client's configured Bitcoin network.

```ts
const result = await client.hashi.requestWithdrawal({
	signer,
	amountSats: 50_000n,
	bitcoinAddress: 'tb1q…', // P2WPKH on signet/testnet, or `tb1p…` for P2TR
});

if (result.$kind !== 'Transaction') {
	throw new Error(`request failed: ${JSON.stringify(result.FailedTransaction)}`);
}

// Pull the request id out of the WithdrawalRequested — needed if
// you later want to cancel.
const evt = result.Transaction.events?.find((e) =>
	e.eventType.endsWith('::withdrawal_queue::WithdrawalRequested'),
);
const requestId = (evt as { json?: { request_id?: string } } | undefined)?.json?.request_id;
```

## Quickstart: Cancel a pending withdrawal

Returns the locked `hBTC` to the signer. Only the original requester can cancel, only while the
request is still `Requested` or `Approved` (not after committee commitment), and only after
`withdrawalCancellationCooldownMs` has elapsed since the request. All three are enforced on-chain.

```ts
await client.hashi.cancelWithdrawal({ signer, requestId });
```

## Tracking a deposit or withdrawal

`deposit` and `requestWithdrawal` resolve to a transaction execution result whose
`Transaction.digest` identifies the submitted Sui tx. Pass that digest to the `view.*Status` readers
for a one-shot check, or to the `waitFor*` helpers to poll until a terminal state.

```ts
const digest = result.Transaction?.digest;

// One-shot status check — returns null if the digest has no Hashi event.
const deposit = await client.hashi.view.depositStatus(digest);
// deposit?.status: "pending" | "confirmed" | "expired" | "unknown"
// deposit?.approvalTimestampMs — when the committee approved (null until approved)
// deposit?.confirmableAtMs — earliest mint time = approval + bitcoinDepositTimeDelayMs
//                            (null until approved)

const withdrawal = await client.hashi.view.withdrawalStatus(digest);
// withdrawal?.status: "Requested" | "Approved" | "Processing"
//                     | "Signed" | "Confirmed" | "cancelled"
```

To block until the committee finishes, use the polling helpers. They resolve on a terminal state —
deposits on `confirmed`/`expired`, withdrawals on `Confirmed`/`cancelled`:

```ts
const info = await client.hashi.waitForDeposit(digest, {
	intervalMs: 15_000, // default
	signal: AbortSignal.timeout(600_000), // optional cancellation
});

const wInfo = await client.hashi.waitForWithdrawal(digest);
// wInfo.btcTxid is populated once the committee commits the Bitcoin tx.
```

## Checking hBTC balance

```ts
const { totalBalance, coinObjectCount } = await client.hashi.view.balance(signer.toSuiAddress());
// totalBalance — hBTC in satoshis; coinObjectCount — number of coin objects held.
```

## Transaction history

`view.transactionHistory` returns a unified, newest-first list of deposits and withdrawals for a Sui
address. Each item is a discriminated union — switch on `kind`:

```ts
const history = await client.hashi.view.transactionHistory(signer.toSuiAddress());

for (const item of history) {
	if (item.kind === 'deposit') {
		console.log(item.btcTxid, item.amountSats, item.approved);
	} else {
		console.log(item.requestId, item.btcAmountSats, item.status);
	}
}
```

Confirmed requests come from the on-chain index; in-flight deposits are discovered via the Sui
GraphQL endpoint (`graphqlUrl`). If GraphQL is unavailable the call still returns the confirmed set.

## Detecting already-used UTXOs

Before submitting a deposit, check whether its outputs were already recorded — re-submitting a
consumed UTXO aborts on-chain.

```ts
const results = await client.hashi.view.findUsedUtxos([
	{ txid: '0x<64-hex display-order txid>', vout: 0 },
]);
// results[0]: { utxoId, inActivePool, inSpentPool, isUsed }
```

## Estimating fees

```ts
// Withdrawal: worst-case BTC network fee + on-chain minimum. Pass a sender
// to also get a dry-run gas estimate.
const fees = await client.hashi.view.withdrawalFees(signer.toSuiAddress());
// { worstCaseNetworkFeeSats, withdrawalMinimumSats, gasEstimateMist }

// Deposit: dry-run gas estimate only.
const { gasEstimateMist } = await client.hashi.view.depositGasEstimate(signer.toSuiAddress());
```

Gas estimation is best-effort — a failed simulation yields `0n` rather than throwing.

## Reading governance state

Governance parameters — the pause flag, deposit/withdrawal minimums, confirmation threshold, deposit
time delay, and cancellation cooldown — are read through `client.hashi.view`, the same namespace as
the balance, status, history, and fee readers above. Prefer `view.all()` when you need 2+ values —
single round-trip, internally consistent snapshot.

```ts
const snap = await client.hashi.view.all();
// { paused, bitcoinDepositMinimum, bitcoinWithdrawalMinimum,
//   bitcoinConfirmationThreshold, bitcoinDepositTimeDelayMs,
//   withdrawalCancellationCooldownMs, worstCaseNetworkFee, ... }
```

## Errors

Direct methods throw typed errors before signing whenever a precondition can be checked client-side.
`instanceof` to distinguish:

| Error                        | Thrown when                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `InvalidParamsError`         | `txid`/`recipient` not 0x-prefixed 32-byte hex, or `utxos` empty/duplicate                                 |
| `InvalidBitcoinAddressError` | `bitcoinAddress` fails bech32(m) decode or HRP mismatches the BTC network                                  |
| `HashiPausedError`           | Governance has paused the operation (`deposit` or `withdraw`)                                              |
| `AmountBelowMinimumError`    | A UTXO or withdrawal amount is below the on-chain minimum                                                  |
| `HashiFetchError`            | The Hashi shared object can't be read or has an unexpected shape                                           |
| `HashiConfigError`           | A governance config entry is missing or malformed                                                          |
| `HashiGuardianError`         | The guardian `/info` can't be resolved, reached, or parsed, or the limiter isn't initialized (see `.code`) |

## Advanced: composable transactions

The direct methods (`deposit`, `requestWithdrawal`, `cancelWithdrawal`) sign and execute in one
call. For sponsored transactions, dry-runs, or bundling Hashi calls into a larger PTB, use the
`tx.*` builders — they return an unsigned `Transaction` and leave signing to the caller.

```ts
const tx = client.hashi.tx.deposit({ txid, utxos, recipient });
// …add more commands to `tx`, then sign and execute via your usual path.
```

Move-call thunks are also available under `client.hashi.call.*` for direct composition into
hand-built PTBs.

## Bitcoin RPC (optional)

When the client is constructed with a `btcRpcUrl`, the `client.hashi.bitcoin.*` namespace reads the
Bitcoin chain directly — useful for finding which output of a funding tx paid your deposit address,
and for checking confirmations before submitting a deposit.

```ts
const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(hashi({ btcRpcUrl: 'http://user:pass@127.0.0.1:8332' }));

// Which output(s) of the funding tx paid the deposit address?
const output = await client.hashi.bitcoin.lookupVout(btcTxid, btcAddress);
const outputs = await client.hashi.bitcoin.lookupAllVouts(btcTxid, btcAddress);
// each result: { vout, amountSats }

// Confirmation count — 0 while the tx is still in the mempool.
const confirmations = await client.hashi.bitcoin.confirmations(btcTxid);
```

Calling any `bitcoin.*` method without `btcRpcUrl` configured throws.

## Guardian rate limiter (optional)

Withdrawals are co-signed by the Hashi **guardian**, which throttles signing with a token-bucket
rate limiter. When the client can resolve a guardian URL — from `guardianUrl`, a custom
`guardianInfoProvider`, or the on-chain `guardian_url` config — the `client.hashi.guardian.*`
namespace reads the guardian's public, read-only `/info` endpoint to surface that limiter's
headroom.

```ts
const client = new SuiGrpcClient({
	network: 'devnet',
	baseUrl: 'https://fullnode.devnet.sui.io:443',
}).$extend(hashi({ guardianUrl: 'https://hashi-guardian-devnet.mystenlabs.com' }));

// Guardian identity + limiter. `limiter` is null before the guardian is provisioned.
const info = await client.hashi.guardian.info();

// Projected capacity now, bucket fill %, and the refill-to-full ETA.
const status = await client.hashi.guardian.limiterStatus();
// { availableNowSats, bucketFillPercent, fullAtSecs, state, config }

// Can the guardian sign a 50,000-sat withdrawal right now?
const check = await client.hashi.guardian.canWithdraw(50_000n);
// { allowed, availableNowSats, estimatedWaitSecs }
```

`guardianUrl` overrides the on-chain `guardian_url`; a `guardianInfoProvider` overrides both (useful
for caching or a custom transport). The on-chain `guardian_url` is only published at launch, so a
client constructed beforehand re-reads the chain on each call until it resolves — throwing
`HashiGuardianError` (`code: "not-configured"`) meanwhile — then caches the URL once found.
`limiterStatus()` and `canWithdraw()` throw `HashiGuardianError` (`code: "not-initialized"`) before
the guardian is provisioned — use `guardian.info()`, whose `limiter` is `null`, to detect that state
without a try/catch.

## Bitcoin address derivation

Each Sui address maps to a unique P2TR Bitcoin deposit address with two script-path leaves: an
immediate 2-of-2 leaf `multi_a(2, guardian, derive(mpc_master, sui_address))`, and a delayed
MPC-only recovery leaf `and_v(v:older(delay), pk(derive(mpc_master, sui_address)))`. The MPC
child-key derivation replicates
`fastcrypto_tbls::threshold_schnorr::key_derivation::derive_verifying_key`; the guardian's BTC key
is read from the on-chain `guardian_btc_public_key` config, and `generateDepositAddress` throws
`HashiConfigError` until the deployment publishes it. See the
[Hashi address-scheme docs](https://mystenlabs.github.io/hashi/design/address-scheme.html) for the
full design.
