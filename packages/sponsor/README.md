# @mysten-incubation/sponsor

Primitives for building gas-sponsorship flows on Sui. You are the **sponsor operator**: you bring a
`Signer` (the sponsor) and a policy for what you'll pay for, and `createSponsor` takes a user's
transaction, fills in the gas, validates it against that policy, and adds the sponsor's signature.
The hard part — _validating what you're sponsoring_ — is handled by a pluggable pipeline backed by
the [`@mysten/wallet-sdk` transaction analyzer](https://www.npmjs.com/package/@mysten/wallet-sdk).

The transaction comes from your user; you decide what's allowed and cover the gas.

> **Incubation package.** APIs may change without notice. The examples below are type-checked
> (`test/examples.ts`).

## Install

```sh
npm install @mysten-incubation/sponsor @mysten/sui
```

## Quick start

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createSponsor, defaults, gasBudget, allowedPackages } from '@mysten-incubation/sponsor';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});

const sponsor = createSponsor({
	signer: Ed25519Keypair.fromSecretKey(process.env.SPONSOR_KEY!),
	client,
	// `defaults()` keeps the baseline (see Defaults).
	validate: [defaults(), gasBudget({ max: 50_000_000n }), allowedPackages(['0xabc'])],
});
```

## How gas works

The sponsor pays gas from its **address balance** — the empty gas payment (`setGasPayment([])`)
draws from the sponsor's on-chain SUI balance rather than from specific gas coins. This has two
benefits:

- **The sponsor can sign and execute in parallel.** Address-balance gas doesn't lock specific coin
  objects, so concurrent sponsored transactions don't contend for gas coins. (A _sender_ that reuses
  its own versioned objects — coins — across rapid transactions still has to serialize those, but
  that's the sender's concern, not the sponsor's.)
- **The network sets a bounded expiration.** Resolving address-balance gas makes the fullnode attach
  a short `ValidDuring` expiration (valid through the next epoch), which `boundedExpiration()`
  verifies — so a signed sponsored transaction can't linger.

You fund the address balance by depositing SUI into it (e.g. a one-time
`0x2::coin::send_funds(coin, sponsorAddress)`); the faucet only hands out coin objects, not address
balance.

Because gas is the sponsor's, **a sponsored transaction must never use the gas coin** (`tx.gas`).
`gasCoinNotUsed()` (a default) enforces this — when the user needs SUI, they spend their own with
`tx.coin({ balance, useGasCoin: false })`.

## Defaults

If you pass no `validate`, the sponsor runs `defaults()` — `validSender()`,
`onlyAddressBalanceGas()`, `gasCoinNotUsed()`, `onlySenderWithdrawals()`, `simulationSucceeds()`,
and `boundedExpiration()`. Once you add your own validators they no longer run automatically; drop
them back in as one entry (the `validate` array flattens nested arrays):

```ts
createSponsor({ signer, client }); // runs defaults()
createSponsor({ signer, client, validate: [defaults(), allowedPackages(['0xabc'])] });
```

Each default guards something real: `validSender()` requires a sender and stops a caller from
sponsoring their own transaction; `onlyAddressBalanceGas()` and `gasCoinNotUsed()` stop a caller
from spending the sponsor's gas (its address balance pays, and the gas coin is the sponsor's);
`onlySenderWithdrawals()` rejects any `FundsWithdrawal` input that isn't the sender's — including
one from the sponsor's **address balance** (the same balance that pays gas — a direct drain the
gas-coin check can't see, since the withdrawal is an _input_, not a command argument);
`simulationSucceeds()` avoids paying for a transaction that aborts; and `boundedExpiration()` caps
how long the signed transaction stays valid.

Two things the defaults **don't** do, by design — handle them at your service boundary:

- **No gas ceiling.** A legitimate but expensive transaction can cost up to the protocol max. Add
  `gasBudget({ max })` for a cap, and rate-limit / authenticate callers.
- **No execution guarantee.** `simulationSucceeds()` is a dry-run; on-chain state can shift before
  execution, so a later-aborting sponsored transaction can still charge the sponsor gas.

Keep `defaults()` unless you're deliberately replacing those checks.

For **offline-only signing** — no dry-run — use validators that read only `data` (no
`transactionResponse`). Nothing depends on simulation, so the sponsor never simulates:

```ts
createSponsor({ signer, client, validate: [validSender(), gasCoinNotUsed()] });
```

## What `transaction` is

The sponsor methods take a `transaction` that is anything `Transaction.from` accepts:

```ts
type TransactionInput = Transaction | Uint8Array | string; // a Transaction, built bytes, base64, or JSON
```

When you also pass a `userSignature`, the bytes are already final (the user signed them), so that
form must be the exact bytes — a `Uint8Array` or a base64 string (not a `Transaction` or JSON). The
sponsor never rebuilds them (so the user's signature stays valid). The sender is already part of
those bytes, so there's no `sender` parameter in this flow. `userSignature` may be a single string
or an array (e.g. multiple required signers).

## The primitives

A `Sponsor` has three members:

- **`sponsor.address`** — the sponsor's address.
- **`sponsor.signTransaction({ transaction, sender?, userSignature?, validationOptions? })`** — set
  the gas data (sponsor as gas owner, address-balance gas), build, validate, and add the sponsor's
  signature. Returns `{ $kind: 'Signed', bytes, sponsorSignature, digest, signatures? }`, or
  `{ $kind: 'Rejected', issues, reason }` if a validator declined. `validationOptions` carries any
  request-scoped options your validators read (see
  [Request-scoped options](#request-scoped-options)) — required only when a validator declares a
  required one.
- **`sponsor.signAndExecuteTransaction({ transaction, userSignature, validationOptions? })`** —
  `signTransaction` + execute. Returns `{ $kind: 'Rejected', … }` (never executed) or the execution
  result (`{ $kind: 'Transaction', … }` / `{ $kind: 'FailedTransaction', … }`).

Validation rejection is **returned, not thrown** — `switch (result.$kind)` to handle every outcome,
the same way you handle `Transaction` vs `FailedTransaction`. (Genuine errors — network, malformed
input — still throw.)

In the examples below, `userSigner` is the user's `Signer`. In a dApp, the user signs via dapp-kit's
`signTransaction` instead.

### The client builds the transaction (recommended)

Prefer having the client build the transaction so the user can sign before the sponsor does — the
sponsor then knows exactly what it's co-signing, and there's no half-signed transaction waiting on a
user. The client sets the **sender**, the **gas owner to the sponsor**, and the **gas payment to
`[]`** (address-balance gas). The user signs those final bytes, and the sponsor co-signs and
executes:

```ts
transaction.setSender(userAddress);
transaction.setGasOwner(sponsor.address); // gas is paid by the sponsor…
transaction.setGasPayment([]); // …from its address balance (no specific gas coins)
const bytes = await transaction.build({ client });

const { signature: userSignature } = await userSigner.signTransaction(bytes);
const result = await sponsor.signAndExecuteTransaction({ transaction: bytes, userSignature });

// Three outcomes, not two — switch on `$kind`:
switch (result.$kind) {
	case 'Rejected': // a validator declined; the sponsor never signed or executed
		throw new Error(result.issues.map((issue) => issue.message).join('; '));
	case 'FailedTransaction': // executed on-chain but aborted — the sponsor still paid gas
		throw new Error(`Transaction failed on-chain: ${result.FailedTransaction.digest}`);
	case 'Transaction': // executed successfully
		return result.Transaction.digest;
}
```

`signAndExecuteTransaction` has **three** outcomes: a policy `Rejected` (never executed), a
`FailedTransaction` (executed but aborted on-chain — note the sponsor's gas is spent either way),
and a successful `Transaction`. The non-obvious one is `FailedTransaction`: a result that isn't
`Rejected` still isn't necessarily a success. `signTransaction` (no execution) is simpler — just
`Signed` or `Rejected`.

### The sponsor builds the transaction

Alternatively, hand the sponsor the user's commands. The sponsor sets itself as gas owner, builds
(address-balance gas, and — unless you pinned one — a dry-run-estimated budget), validates, and
signs. The user then signs the returned bytes, and both signatures execute together. `sender` is
optional — it's applied only when the transaction doesn't already set one (e.g. bare commands):

```ts
const result = await sponsor.signTransaction({
	transaction,
	sender: userAddress, // optional — only used if `transaction` has no sender
});
if (result.$kind === 'Rejected') {
	throw new Error(result.issues.map((issue) => issue.message).join('; '));
}

const { signature: userSignature } = await userSigner.signTransaction(result.bytes);
await client.core.executeTransaction({
	transaction: result.bytes,
	signatures: [userSignature, result.sponsorSignature],
});
```

### A user transaction

A sponsored transaction operates on the **user's** objects, never the gas coin. When the user spends
SUI, source it from their own balance with `useGasCoin: false`:

```ts
function userPayment(amount: bigint) {
	const tx = new Transaction();
	const coin = tx.coin({ balance: amount, useGasCoin: false });
	tx.transferObjects([coin], recipient);
	return tx;
}
```

## Gas & unresolved transactions

When the sponsor builds the transaction, what you pass to `signTransaction` can be **unresolved** —
unresolved object inputs and no gas budget are fine. The sponsor sets itself as gas owner with
address-balance gas and calls `build({ client })`, which in one pass resolves object inputs, sets
the gas price and expiration, and — unless the transaction already pins one (`tx.setGasBudget(…)`) —
**estimates the gas budget by dry-running**. Validation then runs on the _built_ transaction, so
`gasBudget({ max })` checks the resolved budget and analyzers see the exact bytes that get signed.

(When the client builds, it's the opposite: the user already built and signed final bytes, so they
must be resolved — the sponsor never rebuilds them.)

## Over the network

The methods are transport-agnostic: they take a transaction / bytes / base64 and signature strings,
and return `bytes: Uint8Array` plus signature strings. You own the HTTP shape — serialize binary
fields as base64. With the recommended flow, the client builds and signs, then sends the bytes and
signature; the sponsor validates, co-signs, and executes. Every outcome is a `$kind`, so no
try/catch is needed for a policy rejection:

```ts
import { toBase64 } from '@mysten/sui/utils';

// Server handler — wire it into your framework's route however you like.
async function handleSponsorRequest(body: { transaction: string; userSignature: string }) {
	const result = await sponsor.signAndExecuteTransaction({
		transaction: body.transaction,
		userSignature: body.userSignature,
	});
	switch (result.$kind) {
		case 'Rejected':
			return { ok: false as const, issues: result.issues };
		case 'FailedTransaction':
			return { ok: false as const, issues: [{ message: 'Transaction failed on-chain.' }] };
		case 'Transaction':
			return { ok: true as const, digest: result.Transaction.digest };
	}
}

// Client — build with the sponsor as gas owner, sign, send the bytes + signature.
transaction.setSender(userAddress);
transaction.setGasOwner(sponsor.address);
transaction.setGasPayment([]);
const bytes = await transaction.build({ client });
const { signature } = await userSigner.signTransaction(bytes);

const res = await handleSponsorRequest({ transaction: toBase64(bytes), userSignature: signature });
if (!res.ok) throw new Error(res.issues.map((issue) => issue.message).join('; '));
```

Need per-request context (an auth token, a tenant id)? Validators read it from `options`, and the
sponsor requires it — typed — on `signTransaction`. See
[Request-scoped options](#request-scoped-options). Handle anti-replay / rate limiting in your
service.

## Custom validators

A validator **is an analyzer** — just `createAnalyzer(...)` — whose result is the issues it found.
It declares the analyzers it reads via `dependencies` and reports one of three outcomes:

- **pass** — `{ result: null }` (or `{ result: [] }`);
- **reject** — `{ result: [{ code, message }] }`: the transaction is well-formed but violates policy
  → `POLICY_REJECTED`;
- **couldn't analyze** — `{ issues: [{ message }] }` or `throw`: the analyzer itself couldn't decide
  (a failed lookup, an unreachable service) → `ANALYSIS_FAILED`. This is the analyzer framework's
  own channel, so it propagates — dependents don't run.

Reporting findings as the `result` (rather than via `issues`) is what keeps "violates policy"
distinct from "couldn't be checked". There's no built-in "the sponsor must be paid" rule —
value-flow policy is app-specific, so write it over the built-in `balanceFlows` analyzer (signed
per-address deltas: **negative = value left the owner, positive = arrived**):

```ts
import { analyzers, createAnalyzer } from '@mysten-incubation/sponsor';

const requireSponsorPayment = createAnalyzer({
	dependencies: { balanceFlows: analyzers.balanceFlows },
	analyze:
		() =>
		({ balanceFlows }) => {
			const received =
				balanceFlows.sponsor
					?.filter((flow) => flow.coinType === USDC)
					.reduce((sum, flow) => sum + flow.amount, 0n) ?? 0n;

			return received < 10_000n
				? { result: [{ code: 'UNDERPAID', message: `Sponsor received ${received}, needs 10000.` }] }
				: { result: null };
		},
});
```

The most useful built-in analyzer is **`data`** — the parsed transaction (sender, gas data,
commands, expiration), which most validators read. Alongside it: `balanceFlows` (signed value
deltas), `transactionResponse` (the dry-run, incl. effects), `commands`, `moveFunctions`, `objects`,
`coins`, `inputs`, and `bytes` — plus the sponsor's `currentEpoch`, and any others the analyzer
package adds (see [`@mysten/wallet-sdk`](https://www.npmjs.com/package/@mysten/wallet-sdk) for the
full set). All are re-exported as `analyzers` (with `currentEpoch` and `createAnalyzer` alongside).
A failed analyzer never reaches your `analyze`: it short-circuits to an `ANALYSIS_FAILED` rejection.

## Loading data, and sharing it across validators

An analyzer receives the same `options` the sponsor passes to `analyze` — including **`client`** —
so it can load on-chain data. And because the framework runs each analyzer once and shares its
result, several validators read it for the cost of one fetch:

```ts
import { analyzers, createAnalyzer } from '@mysten-incubation/sponsor';

// Loads the *sponsor's* SUI balance via options.client (the gas owner is the sponsor)…
const sponsorBalance = createAnalyzer({
	dependencies: { data: analyzers.data },
	analyze:
		(options) =>
		async ({ data }) => {
			const { balance } = await options.client.core.getBalance({ owner: data.gasData.owner ?? '' });
			return { result: BigInt(balance.balance) };
		},
});

// …read by two validators; the `getBalance` call still runs only once.
const sponsorCanCoverGas = createAnalyzer({
	dependencies: { sponsorBalance, data: analyzers.data },
	analyze:
		() =>
		({ sponsorBalance, data }) =>
			sponsorBalance >= BigInt(data.gasData.budget ?? 0)
				? { result: null }
				: {
						result: [{ code: 'SPONSOR_UNDERFUNDED', message: 'Sponsor balance cannot cover gas.' }],
					},
});
const sponsorKeepsReserve = createAnalyzer({
	dependencies: { sponsorBalance },
	analyze:
		() =>
		({ sponsorBalance }) =>
			sponsorBalance >= 1_000_000_000n
				? { result: null }
				: { result: [{ code: 'RESERVE_LOW', message: 'Sponsor reserve below 1 SUI.' }] },
});

createSponsor({ signer, client, validate: [sponsorCanCoverGas, sponsorKeepsReserve] });
```

## Request-scoped options

A validator reads request inputs — an auth token, a tenant id — straight off `options`.
`createSponsor` **infers** them and requires them, typed, under `validationOptions` on
`signTransaction` (required only when the option itself is required) — no opaque metadata bag:

```ts
const authChecked = createAnalyzer({
	analyze: (options: { authToken: string }) => () =>
		isValidToken(options.authToken)
			? { result: null }
			: { result: [{ code: 'BAD_AUTH', message: 'Invalid auth token.' }] },
});

const sponsor = createSponsor({ signer, client, validate: [authChecked] });

// `validationOptions.authToken` is now a required, typed argument:
await sponsor.signAndExecuteTransaction({
	transaction,
	userSignature,
	validationOptions: { authToken },
});
```

## How it runs

`createSponsor` makes every validator a dependency of **`sponsor.analyzer`**, and validation is just
`analyze({ check: sponsor.analyzer }, { transaction, client })`. The analyzer framework then gives,
for free:

- **Lazy** — only analyzers some validator depends on run, so cost tracks your policy. `defaults()`
  includes `simulationSucceeds`, so the default config _does_ dry-run; drop it (or use only
  validators that read `data`) and the sponsor **never simulates**. There's no "offline phase" to
  declare — it falls out of the dependency graph.
- **Deduped** — `data` / `balanceFlows` etc. resolve once even when many validators (and a host
  graph) depend on them.
- **Propagated** — a failed analyzer becomes an `ANALYSIS_FAILED` rejection rather than reaching a
  validator with a broken value.

When validation fails, the sponsor never signs and the method **returns**
`{ $kind: 'Rejected', issues, reason }` — `issues` lists every reason, and `reason` is
`'POLICY_REJECTED'` or `'ANALYSIS_FAILED'`. To turn a rejection into a thrown error, the exported
`SponsorValidationError` class takes `(issues, reason)`.

**`sponsor.analyzer`** is also the composable handle: drop it into any other `analyze()` graph and
it contributes `SponsorRejection | null`, deduping its analyzers with that graph.

## Built-in validators

| Validator                      | Reads                  | Rejects when…                                             |
| ------------------------------ | ---------------------- | --------------------------------------------------------- |
| `validSender()`                | `data`                 | the sender is unset, or is the gas owner (sponsor)        |
| `onlyAddressBalanceGas()`      | `data`                 | the gas payment isn't empty (`[]`)†                       |
| `gasCoinNotUsed()`             | `data`                 | a command uses the gas coin (`tx.gas`)                    |
| `onlySenderWithdrawals()`      | `data`                 | a `FundsWithdrawal` input isn't the sender's              |
| `userSignatureMatchesSender()` | `bytes`, `data`        | a supplied user signature isn't a valid sender signature‡ |
| `gasBudget({ min?, max? })`    | `data`                 | the gas budget is unset or outside the range              |
| `allowedPackages([...])`       | `data`                 | a MoveCall targets a package outside the allowlist        |
| `allowedFunctions([...])`      | `data`                 | a MoveCall targets a function outside the allowlist       |
| `simulationSucceeds()`         | `transactionResponse`  | the dry-run succeeds but the transaction would abort\*    |
| `boundedExpiration()`          | `data`, `currentEpoch` | the expiration is missing or beyond the next epoch        |

\* The dry-run itself _succeeding_ but reporting an aborting transaction is a **policy** rejection
(`TRANSACTION_WOULD_FAIL`) — the bytes are executable and would still cost the sponsor gas (landing
a failed transaction with a digest) if submitted. The dry-run _failing to run at all_ (an
unreachable node, unresolvable objects) is instead surfaced as `ANALYSIS_FAILED`, with the
underlying error detail (see [Result variants](#the-primitives)).

† Address-balance gas (an empty payment) is how the sponsor pays from its own balance rather than
from nominated gas coins; the sponsor-builds flow always sets this, so this validator mainly guards
user-supplied bytes.

‡ Verifies (via `@mysten/sui`'s `isValidTransactionSignature`) that **every** supplied user
signature is cryptographically valid over the bytes **and** resolves to the sender — caught before
the sponsor co-signs, rather than only at execution (all supplied signatures are attached to
execution, so one that isn't the sender's would be rejected on-chain after the sponsor signed). A
malformed, invalid, or wrong-signer signature is rejected as `USER_SIGNATURE_INVALID`; the sender
match is key-type aware (a zkLogin key matches either its legacy or current address). An
_environmental_ failure during verification (e.g. a zkLogin JWK/epoch lookup throwing) isn't a
validation result — it surfaces as `ANALYSIS_FAILED`, so a network blip is never reported as a bad
signature. Passes when no user signature was supplied (the sponsor-builds flow). The signature is
read from the request, not from `validationOptions`.

`defaults()` bundles `validSender()` + `onlyAddressBalanceGas()` + `gasCoinNotUsed()` +
`onlySenderWithdrawals()` + `simulationSucceeds()` + `boundedExpiration()` (see
[Defaults](#defaults)).

## Timing-attack mitigation

Optionally insert random delays to blunt TOCTOU / sandwich manipulation of on-chain state between
signing and execution:

```ts
createSponsor({
	signer,
	client,
	delay: {
		beforeSimulate: { min: 50, max: 200 }, // ms (or a fixed number) before the analysis is resolved
		beforeExecute: { min: 50, max: 200 }, // before executing
		// random: () => 0.5,                 // override the RNG (e.g. in tests)
	},
});
```

This is mitigation, not prevention. `beforeSimulate` runs once before the analysis resolves (where
simulation, if any, happens). Default is off.
