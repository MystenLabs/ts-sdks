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

> **Immediate trades retire with delayed execution.** `mint`, `mintAmount`, `mintCost` and `redeem`
> work only while the config calls a pre-v4 Predict package. Predict v4 always aborts them
> (`EDelayedExecutionRequired`), and the version watermark bump to 4 retires the older packages.
> From then on orders are queued: see [Queued orders](#queued-orders-delayed-execution). Branch on
> `read.executionMode()` rather than a release date.

## Queued orders (delayed execution)

With delayed execution (Predict v4, DBU-885) an order is placed now and filled later, at Pyth's
signed price for its τ: the Pyth Lazer channel tick at or before placement + the policy delay (800
ms on the 200 ms channel at launch). A keeper, or anyone running the open filler, commits the price
and resolves the order: a fill, or a refund with a reason code. A filled mint stays in the market's
queue as an **Open record**, not in the account. Sell it early with `enqueueSell`, or let the
queue's settlement walk pay it at settlement.

Delayed execution spans three packages. Predict (upgraded to v4) keeps the markets, pricing, cash
and settlement. The order-flow package `deepbook_predict_orders` holds the queue: each market has
one `MarketQueue`, at an ID derived from the package's single `QueueRegistry` and the market
(`client.predict.queueIdFor(marketId)`, or `deriveQueueId(registry, market)`), and its single
`OrderDesk` holds the policy (delay, order fee, capacities). The math library
`deepbook_predict_math` holds the pure pricing math. Every queued-order call goes to
`deepbook_predict_orders`, while a fill still emits Predict's `OrderMinted` or `LiveOrderRedeemed`.

> The Testnet config records delayed execution. The Mainnet config doesn't until the Mainnet rollout
> is synced, and until then the queued surface throws `PredictInputError` there. Pass a `config`
> with `packages.predictDelayedExecution`, `packages.predictOrders`, `objects.orderDesk` and
> `objects.queueRegistry` set (a localnet publish) to use it on a network without a record.

```ts
import { snapStrike } from '@mysten/deepbook-v3/predict';

// Which path is live? 'immediate' | 'awaiting-cutover' | 'delayed' | 'unsupported' | 'retired'.
const mode = await client.predict.read.executionMode();

// The market's queue: the "pricing delayed" gate, τ / deadline / cutoff preview, the order fee,
// and the largest mint the market's spare cash takes now.
const queue = await client.predict.read.queue(desc, myAddress);
queue.stuck; // show "pricing delayed" and stop offering orders
queue.acceptingMints; // and queue.acceptingSells: one side can be full while the other is open
queue.refusal.mint; // the preflight code a mint would get now, or null
queue.maxMint.budget.maxRaw; // "Max right now" for a budget mint, raw USDC

// A strike near the money. Admission refuses an entry price outside the market's band (0.25–0.75
// on both recorded deployments), and once the price moves away from a window's reference, the
// reference strike can sit outside it.
const pricer = await client.predict.read.pricer(desc);
const atm = snapStrike(pricer.strikeAtProbability(0.5)!, tradeable[0].admissionTickSize);
const atmDesc = { ...desc, strike: atm };

// Plan, then queue. `planMint` quotes the order at the current price and turns the slippage into
// the limits the enqueue carries. Slippage is cents per contract, never a percentage: a contract
// pays $1, so 10¢ lets a 42¢ contract fill at up to 52¢, fees included.
const plan = await client.predict.read.planMint(myAddress, atmDesc, {
	amount: 10,
	slippageCents: 10,
});
const { transaction, preview } = await client.predict.tx.enqueuePlan(myAddress, atmDesc, plan);
preview.timing.tauMs; // when it prices
preview.totalDebit; // budget + order fee, debited at enqueue. Unused budget comes back at the fill

// After execution (with events included): the record ID is the handle for everything else.
// Persist it. `waitForOutcome` keeps polling a record the fullnode doesn't show yet.
const { recordId } = client.predict.decode.enqueue(result);
const outcome = await client.predict.read.waitForOutcome(atmDesc, recordId);
outcome.order?.view; // 'filled' (an Open record holding the position) or 'refunded' (with a reason)

// Sell an Open record early: plan it, then queue the sell with the plan's floors.
const sellPlan = await client.predict.read.planSell(myAddress, desc, {
	recordId,
	quantity: 50,
	slippageCents: 10,
});
const sell = await client.predict.tx.enqueuePlan(myAddress, desc, sellPlan);
```

The plan and preview types are exported (`MintPlan`, `SellPlan`, `PlanMintOptions`,
`PlanSellOptions`, `SlippageOptions`, `QueuedOrderPlan`, `QueuedOrderPreview`), so form state can be
typed without `ReturnType`.

#### A purchase form

`read.planMint(owner, market, opts)` returns everything a purchase form shows, for a visitor without
an account too (the quote then comes from the account-free `quote_mint`). `amount` plans an all-in
spend and is the whole debit by default, order fee included (`orderFee: 'exclusive'` charges the fee
on top). `quantity` plans an exact payout instead.

| Form field                     | Plan field                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Lower / upper bound            | `snapStrike(price, market.admissionTickSize, 'down' \| 'up')` before planning |
| Trade balance                  | `balance.available` (null without an account), `balance.covers`               |
| Purchase presets, "Max"        | `maxNow`: the most the market's spare cash and the balance take now           |
| Payout multiple                | `payoutMultiple` (at the current price, order fee included)                   |
| Potential payout               | `potentialPayout`, and `minPayout` at the worst price                         |
| Price per contract             | `pricePerContract`, and `worstPricePerContract` (unsubsidized, plus slippage) |
| Max slippage                   | `slippageCents` in, `slippage.cents` out (`'auto'` sizes it from the model)   |
| Order fee                      | `orderFee`, read from the order desk every time                               |
| "Pricing in about a second"    | `timing.tauMs`, `timing.deadlineMs`                                           |
| Disabled button and its reason | `accepting`, `refusal` (the preflight code a mint would get now)              |

A budget plan's fill buys what the budget buys at τ and is refunded with the order fee returned when
that is below `minPayout`. An exact plan's fill is refunded when the entry probability or the all-in
cost passes its cap. The limits are sized from the price without the fee subsidy, because enqueue
admission checks the order without it and the subsidy can run out before the fill. A budget plan's
payout floor is also checked with an exact quote at that quantity, so it never asks for more than
admission buys. The quote, the payout multiple and `pricePerContract` show the subsidized price the
fill is expected to charge. A budget plan needs a premium of at least 1 USDC, so a smaller budget,
or an amount the order fee takes whole, is refused with `min-premium`. `planSell` returns the sell
side: `proceeds`, `net` (after the order fee, negative when the fee is above the proceeds),
`minProceeds` and `minNet` at the worst price, and the `enqueueSell` options. A `slippageCents` of
0, or a few cents, is accepted but leaves the price little room to move between the quote and τ.
Such an order is often refused at placement (`EOrderFailsLimits`, by the build's dry run or on
chain, where gas is spent) or refunded at the fill, and a refund keeps the order fee. `'auto'` sizes
the room from the model.

- **Preflight, typed.** Each `enqueue*` builder reads the market once and refuses, with a
  `PredictPreflightError` and a `code`, an order the queue or protocol gates would abort: `not-live`
  (the watermark isn't raised, or Predict doesn't allowlist the order-flow package yet), `no-queue`
  (the market's `MarketQueue` isn't created yet), `retired` (a Predict upgrade raised the watermark
  above the Predict code this SDK calls, or the desk's version floor retired the order-flow package
  it calls), `paused`, `stuck`, `past-cutoff`, `queue-full`, `account-cap`, `fee` (prompt a top-up:
  a mint needs a balance above the order fee, a sell at least the fee), `market-cash`,
  `min-premium`, `entry-band`, `below-min-sell`, `record-not-open`, `not-record-owner`. A plan's
  `accepting` and `refusal` run the same preflight on the plan's order, so the form's button never
  enables an order its enqueue refuses. A mint plan also refuses `fee` when the balance doesn't
  cover `totalDebit`, `min-premium` when a budget buys less than the minimum premium without the fee
  subsidy, and `cost-above-payout` when the unsubsidized cost is above the payout, or for a budget,
  about the payout. `tx.enqueuePlan` throws a refused plan's code, and `fee` when the balance now
  escrows less than the plan's budget. It also throws a `PredictInputError` when called with another
  owner, market, strike, side or record than the plan's `target`, since the plan's limits fit only
  that order, and when the order fee rose since the plan, since the plan's debit and a sell's net
  assume its fee. A plan made with `strike: 'reference'` is refused once the reference strike moves.
  When the chain refuses to quote a plan, `planMint` throws a typed refusal where it can tell why:
  `entry-band` for a strike outside the market's entry band, `min-premium` for an order whose
  premium is below 1 USDC. The probability can still leave the band between plan and placement,
  which the chain refuses with `EOrderFailsLimits`. A plan on a market past its expiry throws
  `past-cutoff`, since the chain has no live price to quote. `planSell` throws `record-not-open` for
  a record that isn't Open, and a `PredictInputError` for more than the record holds, since the
  chain can't quote either. Two admission conditions are checked only on chain, at placement: the
  market's SVI age under the order desk's `svi_max_age_ms`, and room in the payout tree for a new
  strike's boundary nodes. A refused order never fails the rest of a transaction. The order's own
  price limits are checked only on chain, at placement (`EOrderFailsLimits`), and the preview runs
  on the local clock, so near the cutoff the chain can still refuse: decode that with
  `describePredictError`. `EOrderFailsLimits` also covers admission: an entry price outside the
  market's band, or a premium below the minimum. `planMint` throws `entry-band` when the strike's
  price is outside the band, before any plan exists, so pick a strike with
  `pricer.strikeAtProbability` and `snapStrike` rather than offering one far from the money.
- **Pricing aborts.** Every quote, plan and enqueue loads the market's live pricer, which aborts in
  Predict's `pricing` module while an oracle input is missing or stale
  (`EBlockScholesPriceUnavailable`, `EBlockScholesPriceStale`, and the SVI and Pyth forms). These
  clear once the oracles write again, usually within seconds, and `describePredictError` gives each
  a "try again" text. The plan's quote can pass and the enqueue still abort, so a submitted order
  can fail this way too: offer a retry rather than an error page.
- **Order states.** `read.order(s)` returns each record with `queue.orderView`: `placed` (with
  `awaitingPrice` once τ passes), `priced` (the committed price and a countdown to the deadline),
  then `filled` or `refunded`. A filler that commits a price and resolves the order in one
  transaction moves it from `placed` straight to `filled`, so a UI can't count on seeing `priced`.
  Report "Filled" only from the record or the `QueuedOrderFilled` event. For an indexer or event
  feed, `decode.queueEvents` + `queue.reduceOrderEvents` build the same states.
- **Refunds.** Keepers refund an unfinished order at its deadline (τ + 5 s). Offer "Refund my order"
  (`tx.refund(m)`) only when `view.canRequestRefund` is true, 5 s past the deadline. It needs no
  account or Pyth key and works during a freeze. Never prepend it to other transactions.
  `queue.REFUND_REASONS` maps each reason to its text and fee treatment: reasons 1 and 2 keep the
  order fee, the rest return it, 8 means the market couldn't pay at the fill, and 9 means the
  account's receive address couldn't take USDC (it is on USDC's deny list, or USDC is paused).
- **Parked funds.** Nothing sends USDC to a denied address. A fill for a denied receive address is
  refused (reason 9), and a refund or change the address can't take stays in its record
  (`RecordFundsParked`, `view.parkedRaw`). Once the address is clear, `tx.claimParked(m, recordId)`
  sends it there. A settled Open record whose payout was skipped (short of cash, or a denied
  address) is paid with `tx.payOpen(m, recordId)`. Both are permissionless: anyone can send them,
  and the USDC goes only to the record's own receive address. Each queue call that can send USDC
  reads Sui's shared `DenyList` (`0x403`) read-only, which the builders add on their own.
- **Big sells.** A sell's cash need above spare cash sets `preview.needsFunding`. By default the
  builder adds `rebalance_expiry_cash` after the enqueue so the market is funded at once
  (`fundMarket: 'auto' | 'always' | 'never'`). A sell still uncovered at the fill is refunded in
  full and its position returns to an Open record.
- **Positions.** A filled mint is an Open record in the market's queue, not a position in the
  account, so `read.positions(owner)` doesn't list it. The SDK has no indexer client, so the app
  supplies record IDs from its enqueue receipts or its indexer, and reads them with `read.orders`.
  `claimSettled` still pays positions minted into the account before delayed execution. Pending
  refunds and proceeds sent to the account show in `read.pendingFunds(owner)` (already counted in
  `read.balance`).
- **The open filler.** `tx.fill(m, { payloads })` verifies signed Lazer payloads with the current
  Lazer package (read from Lazer's `State` per call), commits them and resolves up to `maxOrders`
  records. Anyone with Lazer access can run one.
- **Settlement.** After Predict's `try_settle`, the queue's `settle_step` refunds the orders still
  waiting (reason 5) and then pays each Open record its settled payout to the account's wrapper
  address (`OpenRecordSettled`, 0 for a loser). One call per transaction until it returns
  `queue.SETTLE_PHASE.DONE`. DONE means the walk reached the last record: a record the market
  couldn't pay stays Open with `OpenRecordPayoutSkipped`, for a later `pay_open`. `settle_step` is
  permissionless, so its refund events carry whoever sent the transaction as `sender`.
- **Pure helpers** in the `queue` namespace: the cash-need formulas (ported 1:1 from
  `deepbook_predict_math::math`), `maxMintNow`, `previewTiming`, `orderCutoffMs`, and
  `slippageBand`, a heuristic `Δp ≈ k · φ(Φ⁻¹(p)) · √(h / T)` for sizing `maxProbability` /
  `minProbability` that still needs product sign-off. `queueTx` has the thunks for composing an
  enqueue into your own PTB (`queueTx.enqueueExactCost(toOrdersConfig(cfg), …)`), plus the keeper's
  `createQueue` (registry, desk and market), `commit`, `resolve`, `refund`, `adminRefund`,
  `settleStep`, `payOpen`, `claimParked` and `cleanup`. `SessionsContract` has the `enqueue*`
  session wrappers, which take the `orderDesk` and the `queueRegistry` and need Sessions v3. The
  Testnet `getSessionsConfig` records v3, and the Mainnet one doesn't until its rollout is synced.

#### Queued orders from a session key

A session key trades the owner's account, so plan against the owner and send the plan's raw limits
through the `SessionsContract` wrapper. The session key signs, sends and pays its own gas, and
`decode.enqueue` and `waitForOutcome` work as they do for an owner's enqueue.

```ts
import { Transaction } from '@mysten/sui/transactions';
import { binaryRangeTicks, priceToRaw } from '@mysten/deepbook-v3/predict';
import { SessionsContract, getSessionsConfig } from '@mysten/deepbook-v3/sessions';

const sessions = new SessionsContract(getSessionsConfig('testnet'));
const { objects, underlyings } = client.predict.cfg;
const target = {
	expiryMarketId: tradeable[0].id,
	wrapperId: sessions.deriveAccountWrapperId(owner),
	orderDesk: objects.orderDesk!,
	queueRegistry: objects.queueRegistry!,
	protocolConfig: objects.protocolConfig,
	oracleRegistry: objects.oracleRegistry,
	pythFeed: underlyings.BTC.pythFeed,
	blockScholesValueStore: underlyings.BTC.blockScholesValueStore,
	blockScholesSviStore: underlyings.BTC.blockScholesSviStore,
};
const plan = await client.predict.read.planMint(owner, atmDesc, { amount: 10, slippageCents: 10 });
const { lowerTick, higherTick } = binaryRangeTicks(
	priceToRaw(atm),
	'up',
	priceToRaw(tradeable[0].tickSize),
);
const tx = new Transaction();
tx.add(
	sessions.enqueueExactCost({
		...target,
		lowerTick,
		higherTick,
		maxCost: plan.raw.budget,
		minQuantity: plan.raw.minQuantity,
	}),
);
// Sell an Open record the same way: `enqueueRedeemOpen` with the record's quantity and
// `planSell(owner, …).raw.minProbability` / `.raw.minProceeds`.
```

A revoked or expired key aborts `sessions::ESessionNotAuthorized`, which `describePredictError`
explains along with the other Sessions and account aborts.

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

- **`client.predict.tx`** — `createManager`, `deposit`, `withdraw`, `mint`, `mintAmount`,
  `mintCost`, `redeem`, `claimSettled`, `supplyPlp`, `withdrawPlp`, `cancelSupplyPlp`,
  `cancelWithdrawPlp`, `setBuilderCode`, `unsetBuilderCode`, and for queued orders `enqueuePlan`,
  `enqueueMint`, `enqueueMintAmount`, `enqueueMintCost`, `enqueueSell`, `refund`, `claimParked`,
  `payOpen`, `fill` (see [Queued orders](#queued-orders-delayed-execution)). Market-resolving
  builders (`mint`/`mintAmount`/`mintCost`/`redeem`/`claimSettled`) are async: they resolve the
  market object from `{ underlying, expiryMs, strike, side }` via the on-chain registry (cached per
  client).
- **`client.predict.read`** — `markets()` (summaries of the pool's **active** markets — live and not
  yet settled, so a market past expiry that nobody has settled is still listed and quoting against
  it aborts; filter on `expiryMs` and `mintPaused` before trading: id, expiry, tick size, admission
  tick size, mint-paused, reference price), `market(desc)` (state + live NAV), `price(m)` (anonymous
  both-sides pricing for any strike, one chain call per strike), `pricer(m)` (a **client-side board
  pricer** — one chain read of the resolved pricer, then price every strike locally; see below),
  `quoteMint(owner, m, opts)` / `quoteMintCost(owner, m, opts)` / `quoteRedeem(owner, m, opts)`
  (exact dry-run quotes: real fees from the real code path — and they throw the same typed errors
  the real trade would, so a quote doubles as preflight), `balance(owner)`, `plpBalance(owner)`,
  `pool()`, `feePolicy(m)` (the market's fee snapshot, for `cost`), `positions(owner)` (chain-only
  enumeration of open positions), `hasPosition(owner, marketId, orderId)`, and for queued orders
  `executionMode()`, `queue(m)`, `planMint(owner, m, opts)`, `planSell(owner, m, opts)`,
  `order(m, id)`, `orders(m, ids)`, `waitForOutcome(m, id)`, `quoteSell(owner, m, opts)`,
  `pendingFunds(owner)`, `lazerPackages()`. All reads run over the client's `simulateTransaction`;
  no indexer required.
- **`client.predict.decode`** — pure execution-result decoders (no network): `mint`, `redeem`,
  `claim`, `createManager`, `deposit`, `withdraw`, `plpRequest`, `plpCancel`, `builderCode`. Each
  singular form throws unless exactly one matching event is present; `mints`, `redeems` and `claims`
  are the plural forms for batched PTBs and return every receipt (the other decoders have no
  plural). Execute transactions with events included and pass the result; receipts come back in SDK
  units with raw bigints alongside. Decoding uses the events' canonical BCS bytes, so it is
  transport-independent. The queue decoders (`enqueue`, `queueEvents`, `cohortCommits`,
  `queuedFills`, `queuedRefunds`, `openRecordPayouts`, `marketPayoutsCompleted`, `queueOps`) match
  the order-flow package's `queue_events` against its original ID
  (`packages.predictOrdersV1 ?? predictOrders`). `expiryPnlRealized` matches against
  `packages.predictDelayedExecution`, the Predict version that introduced it, and `policyUpdates`
  decodes the desk's `DelayedExecutionPolicyUpdated` and Predict's `FlushOperatorUpdated` and
  `OrderFlowUpdated`. `realizedPnlRaw` sums `expiryPnlRealized` receipts into the pool's gross
  realized P&L.
- **PTB composition** — each `client.predict.tx.*` builder returns a finished `Transaction`, so to
  put a Predict call into a PTB you are building, use the generated move-call bindings `/predict`
  exports: one namespace of transaction thunks per Predict module (`plpMoveCalls`,
  `expiryMarketMoveCalls`, `predictAccountMoveCalls`, `protocolConfigMoveCalls`,
  `registryMoveCalls`, `builderCodeMoveCalls`, `marketManagerMoveCalls`, `pricingMoveCalls`,
  `rangeCodecMoveCalls`, `adminMoveCalls` and the cap modules) plus the event layouts
  (`vaultEvents`, `orderEvents`, `configEvents`, `builderCodeEvents`). The order-flow package's
  bindings are `queueMoveCalls`, `deskMoveCalls`, `orderQueueMoveCalls`,
  `delayedExecutionConfigMoveCalls` and `queueEvents`, and the math library's are
  `predictMathMoveCalls` and `lazerPriceMoveCalls`. Pass `config: toGeneratedConfig(cfg)` — the flat
  config slice the bindings resolve the shared objects against, or `toOrdersConfig(cfg)` for the
  order-flow package, which adds it and its desk — and give owner-authorized calls
  `auth: tx.add(generateAuth(cfg))`, the hot-potato `Auth` the account calls consume. The account
  itself (create, deposit, share) is `@mysten/deepbook-v3/account`'s `accountRegistryMoveCalls` /
  `accountMoveCalls`. Also exported:
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

- **`cost`** — the deployed FEE math as an exact integer port, so an all-in quote costs no chain
  call: `mintCost` (what a mint debits), `mintCostForBudget` (the `mint_exact_cost` budget search),
  `redeemLiveProceeds` (what a live close credits), plus the components they are built from. See
  below.

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

## Client-side cost (`cost`)

`pricing` gives the contract's probability; `cost` turns it into what the chain actually debits and
credits, with no chain call at all — no `devInspect`, no dry run. It is an exact integer port of the
deployed fee path: the per-boundary Bernoulli trading fee and its expiry ramp, the builder cut, the
sponsor subsidy, the congestion surcharge, and the inventory-impact charge and rebate, each rounded
the way the contract rounds it.

```ts
import { cost } from '@mysten/deepbook-v3/predict';

const pricer = await client.predict.read.pricer({ underlying: 'BTC', expiryMs });
const shape = {
	fees: await client.predict.read.feePolicy({ underlying: 'BTC', expiryMs }), // the market's own
	expiryMs,
	probabilities: { pricer, lower: 105_000, upper: null }, // an UP order at $105k
};

// 1. What does 100 USDC of payout cost me, all in?
cost.mintCost({ ...shape, quantity: 100 }).cost; // premium + fees, in USDC
cost.mintCost({ ...shape, quantity: 100 }).costPerContract; // all-in price, 0..1

// 2. I want to spend exactly $50 — how much payout is that? (`mint_exact_cost`, client-side)
const sized = cost.mintCostForBudget({ ...shape, budget: 50 });
sized.quantity; // a lot-rounded fill whose ALL-IN cost fits $50
sized.cost; // actual all-in debit, ≤ 50
sized.costPerContract; // all-in price per $1 payout
sized.payoutMultiple; // maximum payout / actual all-in cost
sized.effectiveBudget; // min(budget, accountBalance), if balance was supplied
sized.unspentBudget; // requested budget - actual cost, including any balance-cap shortfall
sized.fees; // trading, subsidy, builder, penalty, impact

// 3. What would closing this position credit me?
const close = cost.redeemLiveProceeds({
	...shape,
	closeQuantity: 40,
	positionQuantity: 100, // optional; validates the close and reports the remaining payout
});
close.proceeds; // net credit, including any inventory rebate
close.gross; // value before fees and rebate
close.proceedsPerContract; // net credit / closed payout
close.remainingQuantity; // 60; null if positionQuantity was omitted
close.fees; // trading, builder, penalty, impactRebate
close.raw.proceeds; // exact integer amount for min_proceeds (before your slippage buffer)
close.raw.probability; // raw 1e9 probability for min_probability
```

**Local preview or simulation?** If you already call `read.quoteRedeem`, you do not need a second
quote for the same close. Use the local helper when a changing input needs an immediate preview; use
the simulation to check the actual trade before submission.

| API                                                          | Returns                                                      | Reads the chain?                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `cost.mintCost`                                              | Cost and fee breakdown for an exact payout quantity          | No; uses the supplied snapshot                                               |
| `cost.mintCostForBudget`                                     | The same result, with quantity sized within an all-in budget | No; uses the supplied snapshot                                               |
| `cost.redeemLiveProceeds`                                    | Net proceeds, gross value, closed quantity and fee breakdown | No; uses the supplied snapshot                                               |
| `read.quoteMint` / `read.quoteMintCost` / `read.quoteRedeem` | A simulated trade receipt, including cost or proceeds        | Yes; executes the transaction in simulation against account and market state |

The `cost` functions return synchronously. Their top-level amounts are human-readable numbers; `raw`
carries integer amounts as bigints. `quantity` is the mint's maximum potential payout; it is not
profit. `payoutMultiple` uses the all-in cost, so it includes fee drag. Ratios and human-readable
numbers are for display; use raw bigints for amount bounds. `remainingQuantity` uses the supplied
`positionQuantity`, and a partial close's replacement order ID comes from the execution receipt.

These calculations do not check account ownership or the on-chain position size (they can validate a
supplied `positionQuantity`), pauses, the no-trade window, oracle freshness or available cash
backing. A simulation checks the execution path, but its quote can still change before submission;
keep the transaction's `maxCost` / `minProceeds` slippage bounds.

**Why the budget form exists.** Every fee is charged _on top of_ the premium, and `mintAmount` sizes
on premium alone — so "spend exactly $X" means quoting, subtracting an estimated fee load, padding
it so the mint does not abort, and systematically underspending. `mintCostForBudget` runs the same
lot search the contract's `mint_exact_cost` runs, over the same cost function, so it returns the
fill that entrypoint would size. On v2 deployments, use
`tx.mintCost(owner, market, { spend: 50, minQuantity })` to let the chain size the fill against the
same all-in budget. When only the budget binds, one more lot would exceed it. The maximum-payout
bound or the lot cap can leave a larger remainder. If the budget fill costs more than its payout,
the contract uses a best-effort step-down search. Integer rounding makes that condition nonmonotone:
the fallback can miss a larger admissible fill or throw for `minQuantity` even when another fill
would satisfy it. The SDK preserves that behavior.

**What is exact, and what you must supply.** The integer arithmetic matches the contract when all
inputs match: probabilities, fee policy, builder attribution, sponsor balance, congestion, book
state and timestamp. The local float pricer introduces an approximation (~1e-4). You can instead
pass `{ lowerUp, higherUp }` as raw 1e9 bigints; `read.price` returns decimal numbers, so convert
its `up` value with the exported `probabilityToRaw` helper first. `exactProbabilities: true` only
means raw probabilities were supplied. It does not verify their source or certify current chain
state.

When `inventoryImpactMaxRate` is nonzero, `book` is required; omitting it throws instead of quoting
a zero charge or rebate. The congestion rate defaults to zero (disabled in the shipped template);
when enabled, supply `penaltyRate`, calculated by `cost.congestionPenaltyRate` from the market's
gas-price EWMA and the transaction's gas price. Supply `builderCode`, `feeIncentiveBalance` and, for
account-capped budget sizing, `accountBalance` to reflect the account being quoted. The fee
**policy** is a per-market snapshot taken at creation: read it with `read.feePolicy(market)`, one
object read. Don't use `cost.SHIPPED_FEE_POLICY` for a live market. It is the code default, and
neither recorded deployment's template matches it: both charge about twice its trading fee, ramp the
fee to 3× over the last 60 s and admit entries in 25%–75%.

Invalid raw domains (including negative amounts/rates, probabilities outside `[0, 1e9]`, and invalid
lot sizes) throw `PredictInputError` before arithmetic. Supplied book totals must also be
consistent, and enabled inventory impact requires a positive scale.

Admission is enforced locally too: the entry-probability band, the `min_premium` floor, the lot
grid, and the "a contract may never cost more than it can pay out" bound each throw the
`PredictInputError` naming the abort the chain would have raised. `read.quoteMint` /
`read.quoteRedeem` remain the authoritative pre-trade quote — they run the real code path against
real account state; `cost` is what you reach for when you cannot afford a round trip per keystroke.

The components are exported too (`tradingFee`, `builderFee`, `feeIncentiveSubsidy`,
`congestionPenaltyRate`, `mintInventoryImpact`, `closeInventoryImpact`, `expiryFeeMultiplier`,
`bernoulliFeeRate`), along with `decodeOrderRange` / `orderStrikes` for feeding a position from
`read.positions` straight into `redeemLiveProceeds`.

## Networks & deployments

Two deployments are recorded. `getDeployment(network)` names each one and the source commit of its
initial deployment; subsequent package upgrades come from `Published.toml`:

| Network   | Deployment                 | Chain id   | Source commit | `quoteCoinType`                                                                                                            |
| --------- | -------------------------- | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `mainnet` | `deepbook-predict-mainnet` | `35834a8a` | `7b169bde`    | Circle native USDC — `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`                      |
| `testnet` | `deepbook-predict-testnet` | `4c78adac` | `4d752fb8`    | mintable test coin, displays as `DUSDC` — `0xc028557a1ed49e42ed091e115aedefd70a442b184c18fbec5c48d5b6c0b8c184::usdc::USDC` |

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

Mainnet runs Predict **v3** and Testnet Predict **v4**, both built from the same sources; Sessions
is **v2** on both. The Published.toml records are in deepbookv3 through PR #1321. `packages.predict`
and `sessionsPackageId` are the current Move-call targets; `packages.predictV1` and
`sessionsPackageIdV1` retain the original IDs for existing struct types, events and dynamic-field
keys. Custom upgraded configs must supply both IDs. The v1 fallback is only for custom deployments
that have never been upgraded. A type first introduced in a later version uses that version's
defining ID, and version numbers do not line up across networks, so check the defining ID on each
one. For example, `MintRange` was introduced in v2 on both networks, and
`vault_events::UsdcAddedToPlp` is defined by Mainnet v3 (`0x08fa3ef1…`) and Testnet v3
(`0xb5155d4c…`). The Testnet ID is one version behind that network's current call target.

**Adding USDC to the pool without minting PLP:** `plpMoveCalls.addUsdcToPlp` wraps
`add_usdc_to_plp`, which pays a `Coin<USDC>` into the pool's idle cash and mints nothing in return.
Any caller can use it, and the whole amount accrues to existing PLP holders. The chain rejects the
contribution when the pool has no PLP supply yet, the payment is under 10 USDC, a flush is in
flight, or pool cash after the contribution would exceed 10 USDC per PLP. `client.predict` has no
builder or decoder for this entrypoint. Match `UsdcAddedToPlp` against its defining ID, not
`predictV1`.

**All-in budget mint (v2 and later):** `spend` caps the debit including all trade fees, and
`minQuantity` is the minimum payout quantity accepted. It may spend less than the budget because of
lot rounding, balance limits or the contract's sizing constraints. Network gas is separate.
`mintAmount` retains its existing premium-only budget semantics.

```ts
const quote = await client.predict.read.quoteMintCost(myAddress, desc, {
	spend: 100,
	minQuantity: 0,
});
// Render quote.cost, quote.quantity, and quote.fees (including inventoryImpact).
const tx = await client.predict.tx.mintCost(myAddress, desc, {
	spend: 100,
	minQuantity: Number((quote.quantity * 0.99).toFixed(6)), // 1% payout slippage
});
```

`read.quoteMintCost` simulates the actual budget mint with the owner's current balance and fees; it
requires an existing funded account. Sessions callers can compose `SessionsContract.mintExactCost`
with a live pricer using raw Move units. The generated `expiryMarketMoveCalls` also exposes
`quoteMintExactCostForAccount` for lower-level PTBs. These entrypoints require v2 or later. Both
recorded deployments qualify, but a custom deployment still on v1 does not.

An expired market stays in `read.markets()` until someone settles it — the list is the pool's
live-and-not-yet-settled set, not a tradeable set. On either network, check `expiryMs` against the
clock (and `mintPaused`) before quoting rather than assuming the list is tradeable.

## Notes

- **Account positions are enumerable on-chain**: `read.positions(owner)` lists every open position
  (market + order id) straight from the account's position table — one round trip warm, no indexer.
  With delayed execution a filled order is an Open record in the market's queue instead, which this
  list doesn't include (see [Queued orders](#queued-orders-delayed-execution)). Persisting
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
