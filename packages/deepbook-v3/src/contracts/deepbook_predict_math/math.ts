/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pure pricing math for Predict, moved out of `deepbook_predict` so the package
 * stays under Sui's object-size limit.
 *
 * Every function takes and returns primitives (and `fixed_math` values) and reads
 * no state, so it cannot move value or see an object. Each body is Predict's own
 * code, moved unchanged: SVI evaluation and the roll-down, the pricing-safe input
 * bounds and minimum-variance checks as booleans, the Bernoulli trading-fee curve
 * with its expiry ramp, the inventory-impact potential, premium sizing, the
 * builder fee, and the order-flow cash-need formulas. Predict keeps every abort:
 * where a check here fails, it returns a boolean or `none`, and Predict asserts
 * with its own error code.
 */

import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface RollDownArguments {
	value: RawTransactionArgument<number | bigint>;
	remainingMs: RawTransactionArgument<number | bigint>;
	anchorTteMs: RawTransactionArgument<number | bigint>;
}
export interface RollDownOptions {
	package?: string;
	arguments:
		| RollDownArguments
		| [
				value: RawTransactionArgument<number | bigint>,
				remainingMs: RawTransactionArgument<number | bigint>,
				anchorTteMs: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Scale one 1e9-scaled SVI magnitude down by the fraction of anchored time
 * remaining, returning it at 1e18.
 *
 * The roll-down result is kept at 1e18 because the fraction is applied to values
 * that are themselves tiny on short-dated surfaces: a 1e9 floor here costs up to a
 * whole raw unit of `a`, and a short-dated `a` is only about ten raw units, so the
 * truncation alone moves the digital by percent-scale amounts. At 1e18 the same
 * floor is a billionth of that.
 *
 * The `u256` intermediate keeps the product exact for any `expiry_ms` rather than
 * relying on a bound on the anchored horizon. The result is at most
 * `value * 1e9 < 2^64 * 1e9`, so narrowing to `u128` never truncates.
 */
export function rollDown(options: RollDownOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['value', 'remainingMs', 'anchorTteMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'roll_down',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DigitalArguments {
	aMagnitude: RawTransactionArgument<number | bigint>;
	aIsNegative: RawTransactionArgument<boolean>;
	b: RawTransactionArgument<number | bigint>;
	rho: TransactionArgument;
	m: TransactionArgument;
	sigma: RawTransactionArgument<number | bigint>;
	forward: RawTransactionArgument<number | bigint>;
	strike: RawTransactionArgument<number | bigint>;
}
export interface DigitalOptions {
	package?: string;
	arguments:
		| DigitalArguments
		| [
				aMagnitude: RawTransactionArgument<number | bigint>,
				aIsNegative: RawTransactionArgument<boolean>,
				b: RawTransactionArgument<number | bigint>,
				rho: TransactionArgument,
				m: TransactionArgument,
				sigma: RawTransactionArgument<number | bigint>,
				forward: RawTransactionArgument<number | bigint>,
				strike: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The adjusted UP digital for `strike` on a rolled SVI surface (`a` and `b` at
 * 1e18, `rho`, `m`, and `sigma` at 1e9) and `forward`:
 *
 * - k = ln(strike / forward)
 * - w(k) = a + b * (rho * (k - m) + sqrt((k - m)^2 + sigma^2))
 * - d2 = -((k + w(k) / 2) / sqrt(w(k)))
 * - price = N(d2) - phi(d2) * w'(k) / (2 * sqrt(w(k)))
 *
 * Returns the price and `0`, or `none` and the code Predict aborts with where the
 * formula is undefined: a zero forward, a negative inner term, or a non-positive
 * variance.
 */
export function digital(options: DigitalOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u128', 'bool', 'u128', null, null, 'u64', 'u64', 'u64'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'aMagnitude',
		'aIsNegative',
		'b',
		'rho',
		'm',
		'sigma',
		'forward',
		'strike',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'digital',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VarPositiveArguments {
	aMagnitude: RawTransactionArgument<number | bigint>;
	aIsNegative: RawTransactionArgument<boolean>;
	b: RawTransactionArgument<number | bigint>;
	rho: TransactionArgument;
	sigma: RawTransactionArgument<number | bigint>;
}
export interface VarPositiveOptions {
	package?: string;
	arguments:
		| VarPositiveArguments
		| [
				aMagnitude: RawTransactionArgument<number | bigint>,
				aIsNegative: RawTransactionArgument<boolean>,
				b: RawTransactionArgument<number | bigint>,
				rho: TransactionArgument,
				sigma: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Whether a rolled surface's minimum total variance over all strikes is positive,
 * at the 1e18 the rolled `a` and `b` are carried in.
 */
export function varPositive(options: VarPositiveOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u128', 'bool', 'u128', null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['aMagnitude', 'aIsNegative', 'b', 'rho', 'sigma'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'var_positive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InputsOkArguments {
	spot: RawTransactionArgument<number | bigint>;
	forward: RawTransactionArgument<number | bigint>;
	b: RawTransactionArgument<number | bigint>;
	rho: TransactionArgument;
	m: TransactionArgument;
	sigma: RawTransactionArgument<number | bigint>;
}
export interface InputsOkOptions {
	package?: string;
	arguments:
		| InputsOkArguments
		| [
				spot: RawTransactionArgument<number | bigint>,
				forward: RawTransactionArgument<number | bigint>,
				b: RawTransactionArgument<number | bigint>,
				rho: TransactionArgument,
				m: TransactionArgument,
				sigma: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Whether raw Block Scholes inputs fit Predict's pricing-safe envelope: a positive
 * spot and forward, `forward <= max_spot` and `forward <= 100 *  spot`, and SVI
 * `b`, `|rho|`, `|m|`, and `sigma` within their bounds. `a` carries no bound of
 * its own: only total variance has to be positive (`raw_var_ok`), and every
 * downstream use of `a` fits its provider width.
 */
export function inputsOk(options: InputsOkOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64', 'u64', null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['spot', 'forward', 'b', 'rho', 'm', 'sigma'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'inputs_ok',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawVarOkArguments {
	a: TransactionArgument;
	b: RawTransactionArgument<number | bigint>;
	rho: TransactionArgument;
	sigma: RawTransactionArgument<number | bigint>;
}
export interface RawVarOkOptions {
	package?: string;
	arguments:
		| RawVarOkArguments
		| [
				a: TransactionArgument,
				b: RawTransactionArgument<number | bigint>,
				rho: TransactionArgument,
				sigma: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Whether a raw SVI tuple's minimum total variance
 * `a + b * sigma * sqrt(1 -  rho^2)` is positive, compared rather than summed: `a`
 * reaches `u64::MAX`, where the sum would leave `u64`.
 */
export function rawVarOk(options: RawVarOkOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null, 'u64', null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['a', 'b', 'rho', 'sigma'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'raw_var_ok',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LegFeeArguments {
	baseFee: RawTransactionArgument<number | bigint>;
	minFee: RawTransactionArgument<number | bigint>;
	windowMs: RawTransactionArgument<number | bigint>;
	maxMultiplier: RawTransactionArgument<number | bigint>;
	probability: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	timeToExpiryMs: RawTransactionArgument<number | bigint>;
}
export interface LegFeeOptions {
	package?: string;
	arguments:
		| LegFeeArguments
		| [
				baseFee: RawTransactionArgument<number | bigint>,
				minFee: RawTransactionArgument<number | bigint>,
				windowMs: RawTransactionArgument<number | bigint>,
				maxMultiplier: RawTransactionArgument<number | bigint>,
				probability: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				timeToExpiryMs: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * One finite leg's trading fee: `max(bernoulli(p), min_fee) * ramp * quantity`,
 * each product rounded down. `bernoulli(p) = base_fee * sqrt(p * (1 - p))`, zero
 * at `p = 0` or `1`; the caller checks `p <= 1`. The ramp is 1 at or beyond
 * `window_ms` to expiry and rises linearly to `max_multiplier` at expiry, rounded
 * down so the trader keeps the ramp dust.
 */
export function legFee(options: LegFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64', 'u64', 'u64', 'u64', 'u64', 'u64'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'baseFee',
		'minFee',
		'windowMs',
		'maxMultiplier',
		'probability',
		'quantity',
		'timeToExpiryMs',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'leg_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PotentialArguments {
	maxRate: RawTransactionArgument<number | bigint>;
	scale: RawTransactionArgument<number | bigint>;
	liability: RawTransactionArgument<number | bigint>;
}
export interface PotentialOptions {
	package?: string;
	arguments:
		| PotentialArguments
		| [
				maxRate: RawTransactionArgument<number | bigint>,
				scale: RawTransactionArgument<number | bigint>,
				liability: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The inventory-impact potential of `liability`: the marginal rate rises linearly
 * from zero to `max_rate` over `scale`, then stays capped:
 *
 * `phi(L) = r_max * L^2 / (2B)` for `L <= B` `phi(L) = phi(B) + r_max * (L - B)`
 * for `L > B`.
 *
 * Defined by this exact sequence of rounded integer operations, so charges and
 * rebates, which always subtract two evaluations, telescope exactly.
 */
export function potential(options: PotentialOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['maxRate', 'scale', 'liability'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'potential',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxQtyArguments {
	probability: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	lot: RawTransactionArgument<number | bigint>;
	maxLots: RawTransactionArgument<number | bigint>;
}
export interface MaxQtyOptions {
	package?: string;
	arguments:
		| MaxQtyArguments
		| [
				probability: RawTransactionArgument<number | bigint>,
				maxPremium: RawTransactionArgument<number | bigint>,
				lot: RawTransactionArgument<number | bigint>,
				maxLots: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The largest whole number of `lot`s, at most `max_lots`, whose premium
 * `mul_down(probability, quantity)` fits `max_premium`, as a quantity. The probe
 * is the premium mint admission charges, so the result is exact, and an oversized
 * budget saturates at `max_lots` instead of aborting.
 */
export function maxQty(options: MaxQtyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['probability', 'maxPremium', 'lot', 'maxLots'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'max_qty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BuilderFeeArguments {
	feeAmount: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	multiplier: RawTransactionArgument<number | bigint>;
	maxRate: RawTransactionArgument<number | bigint>;
}
export interface BuilderFeeOptions {
	package?: string;
	arguments:
		| BuilderFeeArguments
		| [
				feeAmount: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				multiplier: RawTransactionArgument<number | bigint>,
				maxRate: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The builder fee on a trade with a builder code: `fee_amount * multiplier`,
 * capped at `quantity * max_rate`, each rounded down.
 */
export function builderFee(options: BuilderFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['feeAmount', 'quantity', 'multiplier', 'maxRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'builder_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NeedQtyArguments {
	quantity: RawTransactionArgument<number | bigint>;
	p: RawTransactionArgument<number | bigint>;
}
export interface NeedQtyOptions {
	package?: string;
	arguments:
		| NeedQtyArguments
		| [
				quantity: RawTransactionArgument<number | bigint>,
				p: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Exact-quantity mint cash need: `ceil(quantity * (1 - p)) + 1`, where `p` is the
 * market's minimum entry probability: a fill pays at least `p` per contract into
 * market cash.
 */
export function needQty(options: NeedQtyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['quantity', 'p'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'need_qty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NeedBudgetArguments {
	budget: RawTransactionArgument<number | bigint>;
	p: RawTransactionArgument<number | bigint>;
}
export interface NeedBudgetOptions {
	package?: string;
	arguments:
		| NeedBudgetArguments
		| [budget: RawTransactionArgument<number | bigint>, p: RawTransactionArgument<number | bigint>];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Budget mint cash need: `ceil((budget + 1) * (1 / p - 1)) + 1`. The `budget + 1`
 * covers premiums rounding down, which lets a fill buy up to `1 /  p` raw units
 * more than `budget / p`.
 */
export function needBudget(options: NeedBudgetOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['budget', 'p'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'need_budget',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NeedSellArguments {
	closeQuantity: RawTransactionArgument<number | bigint>;
	lambda: RawTransactionArgument<number | bigint>;
}
export interface NeedSellOptions {
	package?: string;
	arguments:
		| NeedSellArguments
		| [
				closeQuantity: RawTransactionArgument<number | bigint>,
				lambda: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Sell cash need: `ceil(close_quantity * (1 - lambda)) + 1`. A close lowers payout
 * liability by at least `lambda * close_quantity` and pays at most
 * `close_quantity`.
 */
export function needSell(options: NeedSellOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['closeQuantity', 'lambda'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'need_sell',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderTermsArguments {
	orderId: RawTransactionArgument<number | bigint>;
}
export interface OrderTermsOptions {
	package?: string;
	arguments: OrderTermsArguments | [orderId: RawTransactionArgument<number | bigint>];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Decode a packed Predict order ID into `(lower_tick, higher_tick, quantity)`,
 * with the quantity in USDC base units. For the order-flow companion's sell sizing
 * and remainder checks over order IDs Predict issued: it validates nothing. The
 * layout is Predict's frozen order-ID encoding: 30-bit ticks at bits 70 and 40,
 * and a 32-bit count of 10_000-unit lots at bit 100.
 */
export function orderTerms(options: OrderTermsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['u256'] satisfies (string | null)[];
	const parameterNames = ['orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'order_terms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
