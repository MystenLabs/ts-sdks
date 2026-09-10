# DeepBook Predict (`@mysten/deepbook-v3/predict`)

TypeScript SDK for DeepBook Predict — binary and range markets on Sui. Builds ready-to-sign
transactions and reads on-chain state through your Sui client. The SDK never signs and never touches
keys: every `tx.*` method returns a `Transaction` for your wallet (dapp-kit) or signer to execute.

## Install

```sh
npm i @mysten/deepbook-v3 @mysten/sui
```

`@mysten/sui` is a peer dependency.

> Two deployments are recorded, **testnet** and **mainnet**: `predict({ network })` and
> `getConfig(network)` resolve either, and any other network throws. They settle in different coins
> that share one Move module path — read `quoteCoinType` from the config rather than assuming a
> symbol or a type. See [Networks & deployments](#networks--deployments).

## Quickstart

The SDK registers as a client extension — `$extend` it onto your `SuiClient`/`SuiGrpcClient`, then
reach it at `client.predict.*`:

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { predict } from '@mysten/deepbook-v3/predict';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(predict({ network: 'testnet' }));

// One-time: create your Predict account (a shared AccountWrapper).
const createTx = client.predict.tx.createManager();

// Fund it: pulls the deployment's quote coin (`client.predict.cfg.quoteCoinType`) from your
// address (coin objects and/or address balance).
const depositTx = client.predict.tx.deposit(myAddress, 250); // $250

// Cash out: lands in your quote-coin address balance by default (no coin-object churn).
// Pass { toCoinObject: true } if you need a discrete Coin<T> instead.
const withdrawTx = client.predict.tx.withdraw(myAddress, 100); // $100

// Pick a market. `read.markets()` lists ACTIVE markets — live and not yet settled — which
// includes a market past its expiry that nobody has settled yet; quoting against one aborts.
// Expiries are absolute timestamps, so never hardcode one: filter on `expiryMs`, leaving
// room to quote, sign and land (and clear the pre-expiry no-trade window).
const markets = await client.predict.read.markets();
// -> [{ id, expiryMs, tickSize, admissionTickSize, mintPaused, referencePrice }, ...]
const tradeable = markets.filter((m) => Number(m.expiryMs) > Date.now() + 30_000 && !m.mintPaused);
const expiryMs = tradeable[0].expiryMs;

// Describe the position once and reuse it — quoting and minting take the same descriptor.
const desc = { underlying: 'BTC', expiryMs, strike: 'reference', side: 'up' } as const;

// Quote before you trade: dry-runs your exact mint, real fees, real account.
const q = await client.predict.read.quoteMint(myAddress, desc, { quantity: 50 });
q.entryProbability; // your fill (0..1 per $1 payout)
q.cost; // exact all-in debit

// Trade. `maxCost` is your ceiling on the all-in debit — pass the quote plus a buffer,
// rounded to 6 decimals, since raw amounts are integers at that scale.
const mintTx = await client.predict.tx.mint(myAddress, desc, {
	quantity: 50,
	maxCost: Math.ceil(q.cost * 1.01 * 1e6) / 1e6,
});
// -> sign & execute any of these with your wallet / dapp-kit / signer

// Anonymous board price (no account needed): both sides of any strike.
const { up, down } = await client.predict.read.price({
	underlying: 'BTC',
	expiryMs,
	strike: 'reference',
});

// Decode the receipt from the execution result (execute with events included):
const receipt = client.predict.decode.mint(mintResult);
receipt.orderId; // PERSIST THIS — needed to redeem/claim later
receipt.entryProbability; // your fill price (0..1 per $1 payout)
receipt.premium; // exact cost breakdown
receipt.fees;

// Read: one market's live state (+ NAV) and the pool.
const market = await client.predict.read.market({ underlying: 'BTC', expiryMs });
console.log(market?.nav, market?.tickSize, market?.mintPaused);
const pool = await client.predict.read.pool();
```

## ⚠ Slippage defaults are UNCAPPED

`mint` mirrors the chain's semantics: when you omit `maxCost` and `maxProbability`, the mint is
**uncapped** — if the price moves between your quote and execution, the position can cost up to your
full account balance. **Call `read.quoteMint` and pass its `cost` (plus your buffer) as `maxCost`.**
The same applies to `redeem`: the deployed `redeem_live` DOES take `min_probability` /
`min_proceeds` floors, but the facade's `tx.redeem` does not surface them and always sends `0`
(uncapped). `read.quoteRedeem` first, close fast. The floors are reachable through `/sessions`:
`SessionsContract.redeemLive` takes `minProbability` / `minProceeds` (raw units —
`probabilityToRaw`, `usdcToRaw`) plus a `pricer` from `loadLivePricer`, and is signed by a session
key the owner has authorized (see the README's `/sessions` section).

## Units

Everything human-facing is decimal; everything on-chain is scaled integers. The facade converts
**inputs** exactly (string/bigint math — no floats on the money path in). Read outputs typed
`number` are display values: above 2^53 raw they lose low-digit precision — quotes and receipts
carry a `raw` block of `bigint`s alongside, and `plpBalance` / `pool().plpTotalSupply` are raw
`bigint` already.

Amounts are in the deployment's quote coin — `getConfig(network).quoteCoinType`: Circle native USDC
on mainnet, a mintable 6-decimal test coin on testnet. Both are `…::usdc::USDC`, so only the package
address tells them apart; read the type, never assume a symbol.

| Concept                                     | You pass / receive                                             | On-chain raw                          |
| ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| Amounts (deposit, spend, maxCost, balances) | USD decimal number or string (`12.5`, `"12.5"`)                | ×1e6 (quote coin)                     |
| `quantity`                                  | **max payout** in USD; positions pay $1 per contract at expiry | ×1e6, in $0.01 lots                   |
| `strike`                                    | USD (`105_000`)                                                | ×1e9, must land on the admission grid |
| `maxProbability`                            | 0..1 (`0.35` = 35¢ per $1 contract)                            | ×1e9                                  |
| PLP shares (`withdrawPlp`, `plpBalance`)    | raw `bigint` shares                                            | 6-decimal coin                        |

`side: "up"` wins if the settlement price is above the strike; `"down"` below; `"range"` (see
[Range positions](#range-positions)) if it lands inside `(lower, upper]`.

Trading closes slightly before expiry: the protocol enforces a short pre-expiry no-trade window
(`no_trade_window_ms` on the live `ProtocolConfig`, 2 s on both recorded deployments), so a mint or
redeem submitted inside it aborts `ETradeWindowClosed` rather than filling. Treat the last seconds
of a window as untradeable rather than retrying, and when choosing a market from `read.markets()`
leave enough of the window to quote, sign and land — a quote taken seconds before expiry executes
inside the window.

## Reference-price markets (Polymarket-style windows)

Each market carries an on-chain **reference price** — derived from the exact previous-window oracle
observation, so consecutive windows chain naturally (the prior window's settlement observation
anchors the next window's strike). Build an up/down board straight from discovery, and trade at the
anchor with `strike: "reference"`:

```ts
const markets = await client.predict.read.markets();
// each market: "BTC above $<referencePrice>?  ↑ / ↓"

const tx = await client.predict.tx.mint(
	myAddress,
	{ underlying: 'BTC', expiryMs: markets[0].expiryMs, strike: 'reference', side: 'up' },
	{ quantity: 25, maxCost: 15 },
);
```

The reference tick is read fresh at build time (it is unset briefly at the start of a window until
the keeper seeds it — you get a clean `PredictInputError` rather than a chain abort). Numeric
strikes away from the reference remain fully supported.

### Numeric strikes must sit on the admission grid

New mint strikes must be a whole multiple of the market's **`admissionTickSize`** — a step
deliberately coarser than `tickSize`, and it is configured per cadence (both recorded deployments
run `$1` against a `$0.01` tick on their enabled cadences, 1m and 5m). Always read it off the market
rather than assuming a value. The market's `referencePrice` is the one finite strike the chain
admits off-grid. `read.markets()` and `read.market()` both report `admissionTickSize`, so a board
can be built from it directly:

```ts
const m = (await client.predict.read.markets())[0];
const strike = Math.round(target / m.admissionTickSize) * m.admissionTickSize;
```

An off-grid numeric strike throws `PredictInputError` at build time rather than aborting on chain
with `EInvalidAdmissionTick`.

### Range positions

`MarketDescriptor` has a third arm: `{ underlying, expiryMs, side: 'range', lower, upper }`. It pays
$1 per contract when the settlement price lands inside `(lower, upper]` — left-open, right-closed,
the same convention as the on-chain range key. Both bounds are USD strikes that must be finite, on
the tick grid, with `lower < upper`, and **each is admission-grid checked** exactly like a binary
numeric strike. `strike: 'reference'` is binary-only — a range has no single reference strike — and
`read.price` is binary-only too; price a range locally with `pricer.range(lower, upper)`.

```ts
const tx = await client.predict.tx.mint(
	myAddress,
	{ underlying: 'BTC', expiryMs, side: 'range', lower: 104_000, upper: 106_000 },
	{ quantity: 25, maxCost: 10 },
);
```

## What's in the box

- **`client.predict.tx`** — `createManager`, `deposit`, `withdraw`, `mint`, `mintAmount`, `redeem`,
  `claimSettled`, `supplyPlp`, `withdrawPlp`, `cancelSupplyPlp`, `cancelWithdrawPlp`,
  `setBuilderCode`, `unsetBuilderCode`. Market-resolving builders
  (`mint`/`mintAmount`/`redeem`/`claimSettled`) are async: they resolve the market object from
  `{ underlying, expiryMs, strike, side }` via the on-chain registry (cached per client).
- **`client.predict.read`** — `markets()` (summaries of the pool's **active** markets — live and not
  yet settled, so a market past expiry that nobody has settled is still listed and quoting against
  it aborts; filter on `expiryMs` and `mintPaused` before trading: id, expiry, tick size, admission
  tick size, mint-paused, reference price), `market(desc)` (state + live NAV), `price(m)` (anonymous
  both-sides pricing for any strike, one chain call per strike), `pricer(m)` (a **client-side board
  pricer** — one chain read of the resolved pricer, then price every strike locally; see below),
  `quoteMint(owner, m, opts)` / `quoteRedeem(owner, m, opts)` (exact dry-run quotes: real fees from
  the real code path — and they throw the same typed errors the real trade would, so a quote doubles
  as preflight), `balance(owner)`, `plpBalance(owner)`, `pool()`, `positions(owner)` (chain-only
  enumeration of open positions), `hasPosition(owner, marketId, orderId)`. All reads run over the
  client's `simulateTransaction`; no indexer required.
- **`client.predict.decode`** — pure execution-result decoders (no network): `mint`, `redeem`,
  `claim`, `createManager`, `deposit`, `withdraw`, `plpRequest`, `plpCancel`, `builderCode`. Each
  singular form throws unless exactly one matching event is present; `mints`, `redeems` and `claims`
  are the plural forms for batched PTBs and return every receipt (the other decoders have no
  plural). Execute transactions with events included and pass the result; receipts come back in SDK
  units with raw bigints alongside. Decoding uses the events' canonical BCS bytes, so it is
  transport-independent.
- **PTB composition** — each `client.predict.tx.*` builder returns a finished `Transaction`, so to
  put a Predict call into a PTB you are building, use the generated move-call bindings `/predict`
  exports: one namespace of transaction thunks per Predict module (`plpMoveCalls`,
  `expiryMarketMoveCalls`, `predictAccountMoveCalls`, `protocolConfigMoveCalls`,
  `registryMoveCalls`, `builderCodeMoveCalls`, `marketManagerMoveCalls`, `pricingMoveCalls`,
  `rangeCodecMoveCalls`, `adminMoveCalls` and the cap modules) plus the event layouts
  (`vaultEvents`, `orderEvents`, `configEvents`, `builderCodeEvents`). Pass
  `config: toGeneratedConfig(cfg)` — the flat config slice the bindings resolve the shared objects
  against — and give owner-authorized calls `auth: tx.add(generateAuth(cfg))`, the hot-potato `Auth`
  the account calls consume. The account itself (create, deposit, share) is
  `@mysten/deepbook-v3/account`'s `accountRegistryMoveCalls` / `accountMoveCalls`. Also exported:
  `loadLivePricer(toGeneratedConfig(cfg), { expiryMarketId, ...cfg.underlyings[sym] })` — the
  `pricer` every live trade call borrows, which the `/sessions` Predict wrappers take as a PTB
  result — and `deriveAccountWrapperId(cfg, owner)`.

  ```ts
  // Create an account, fund it, and queue a PLP supply — one PTB, one signature.
  const config = toGeneratedConfig(cfg);
  const wrapper = tx.add(accountRegistryMoveCalls._new({ config }));
  tx.add(
  	accountMoveCalls.depositFunds({
  		config,
  		arguments: { wrapper, auth: tx.add(generateAuth(cfg)), coin },
  		typeArguments: [cfg.quoteCoinType],
  	}),
  );
  tx.add(
  	plpMoveCalls.requestSupply({
  		config,
  		arguments: { wrapper, auth: tx.add(generateAuth(cfg)), amount, minPlpOut },
  	}),
  );
  tx.add(accountMoveCalls.share({ config, arguments: { self: wrapper } }));
  ```

- **Typed errors** — invalid inputs throw `PredictInputError` before the chain sees them; failed
  simulations throw `PredictMoveError` with the decoded Move abort (`module`, `code`, `abortName`).

## Client-side pricing (`read.pricer` + `pricing`)

`read.price` runs the deployed SVI math on-chain and is authoritative, but it costs one chain call
per strike. To paint a whole board — every strike, both sides, implied strikes — instantly, read the
resolved pricer **once** and compute the rest locally:

```ts
const pricer = await client.predict.read.pricer({ underlying: 'BTC', expiryMs });
pricer.up(105_000); // P(settle > $105,000), 0..1
pricer.down(105_000); // = 1 − up
pricer.range(104_000, 106_000); // P(strike in (104k, 106k])
pricer.strikeAtProbability(0.25); // the strike whose UP price is 25¢
pricer.forward; // the forward it prices against
```

`read.pricer` does a single simulate of the chain's `load_live_pricer` and decodes the returned
`Pricer` — so the forward selection (Pyth-vs-Block-Scholes) and the SVI roll-down already happened
on-chain; the client only evaluates the digital. It throws the same typed stale-oracle/expired
`PredictMoveError` that `read.price` would when the chain itself cannot quote.

The math is a faithful float port of the deployed `pricing::compute_nd2` (SVI with the skew
correction, signed params, and the remaining-time roll-down). It agrees with the chain closely —
within ~1e-4 in probability, up to ~1e-4 near ATM where the chain's fixed-point truncation dominates
(`test/predict/testnet/pricing.test.ts` bounds it live). The pure functions are exported under a
`pricing` namespace for callers who already hold their own oracle inputs (e.g. a live feed) and want
zero chain calls:

```ts
import { pricing } from '@mysten/deepbook-v3/predict';

// From a rolled SVI surface + resolved forward you already have:
const inputs = { forward, svi: { a, b, rho, m, sigma } };
pricing.upProbability(inputs, strike);
pricing.strikeAtProbability(inputs, 0.25);
pricing.boardPricer(inputs); // same shape as read.pricer's return

// Or resolve raw feed data yourself (Strategy-2, matching the on-chain steps):
const fwd = pricing.forward(pythSpot, bsSpot, bsForward); // Pyth re-anchored by the BS basis
const rolled = pricing.rollDown(rawSvi, remainingMs, anchorTteMs); // decay a, b toward expiry
```

## Networks & deployments

Two deployments are recorded. `getDeployment(network)` names each one and the deepbookv3 commit its
ids were generated at:

| Network   | Deployment                 | Chain id   | Source commit | `quoteCoinType`                                                                                                            |
| --------- | -------------------------- | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `mainnet` | `deepbook-predict-mainnet` | `35834a8a` | `14a7e8f8`    | Circle native USDC — `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`                      |
| `testnet` | `deepbook-predict-testnet` | `4c78adac` | `a928bd2d`    | mintable test coin, displays as `DUSDC` — `0xc028557a1ed49e42ed091e115aedefd70a442b184c18fbec5c48d5b6c0b8c184::usdc::USDC` |

Object ids for both are baked into the SDK — `MAINNET_CONFIG` / `TESTNET_CONFIG`, with
`MAINNET_DEPLOYMENT` / `TESTNET_DEPLOYMENT` and `MAINNET_UNITS` / `TESTNET_UNITS` alongside — and
are regenerated, with a release, whenever a deployment moves. `getConfig`, `getDeployment` and
`getUnits` resolve both networks and throw on any other; `getAccountConfig` (`/account`) and
`getSessionsConfig` (`/sessions`) read slices of the same generated record, so the three subpaths
cannot address different deployments. Units are identical on both (`$0.01` lots, 6 quote decimals,
1e9 fixed-point scale).

Move-call targets resolve from the config's package ids, so a deployment of your own is addressed by
passing `config` — `predict({ network, config })` or
`new PredictClient({ client, network, config })` — and `network` is then not consulted.

An expired market stays in `read.markets()` until someone settles it — the list is the pool's
live-and-not-yet-settled set, not a tradeable set. On either network, check `expiryMs` against the
clock (and `mintPaused`) before quoting rather than assuming the list is tradeable.

## Notes

- **Positions are enumerable on-chain**: `read.positions(owner)` lists every open position (market +
  order id) straight from the account's position table — one round trip warm, no indexer. Persisting
  `decode.mint(result).orderId` and applying `decode.redeem(result).replacementOrderId` is still the
  fastest hot path, with `read.positions` as the fresh-start/recovery source and `read.hasPosition`
  as the cheap validator.
- PLP supply/withdraw are queued and fill at the next pool flush; cancels take the queue `index` —
  get it from `decode.plpRequest(result).index`.
- **Both take an optional price floor**, and default to none:
  `supplyPlp(owner, amountUsdc, { minPlpOut })` (`PlpSupplyOptions`, raw `bigint` shares; omitted →
  `0n`) and `withdrawPlp(owner, shares, { minUsdcOut })` (`PlpWithdrawOptions`, USD decimals as
  `number | string`, measured after the protocol's withdraw fee; omitted → no floor). Each floors
  the flush's MARK for the whole request rather than naming a quantity — a flush quoting less
  declines instead of filling smaller. What a miss costs is the deployment's
  `lp_request_limit_flush_attempts`: the deployed value is one on both recorded deployments, so the
  first flush below the floor cancels the request and refunds it, and re-queueing is a fresh
  transaction (three is the configurable maximum, not the default). Leave the floor off and the
  request takes whatever mark the flush quotes.
- **First-time funding in one PTB**: `deposit(owner, amount, { create: true })` creates the wrapper,
  deposits through the fresh handle and shares it last. `owner` must be the transaction signer (the
  wrapper is derived from the sender), and it aborts if the account already exists — the builder
  does no chain read, so gate on `wrapperIdFor(owner)` + a `getObject`, or fall back to `deposit`
  without the flag on that abort.
- `claimSettled` closes the order in full — the deployed entrypoint takes no quantity.
- **`withdraw` lands in your address balance by default** (`0x2::coin::send_funds`), not a coin
  object — it merges into the versionless accumulator `deposit` already draws from, so the round
  trip never accretes stray `Coin<USDC>` objects. `read.balance(owner)` reflects the account's
  internal custody balance; use the client's `getBalance(owner)` for the wallet-side USDC total
  (coin objects + address balance). Pass `withdraw(owner, amt, { toCoinObject: true })` for a
  discrete coin (wallets/explorers that only render coin objects, or same-PTB composition).

## Development

These commands run against the whole `@mysten/deepbook-v3` package, not just Predict — the offline
lane covers spot, margin, `/account`, `/sessions` and `/predict` together.

```sh
pnpm install
pnpm --filter @mysten/deepbook-v3 test      # offline suite, every subpath — what CI runs
pnpm --filter @mysten/deepbook-v3 test:e2e  # live-testnet smoke: reads + deployed-surface arity guards
pnpm --filter @mysten/deepbook-v3 build     # ESM + d.ts via tsdown
```

To run only the Predict tests: `pnpm --filter @mysten/deepbook-v3 vitest run test/predict`.
