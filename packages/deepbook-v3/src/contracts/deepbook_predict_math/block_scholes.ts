/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Block Scholes inputs decoded from verified `bs_oracle` updates, for Predict's
 * commit, flush, and settlement fallback.
 *
 * A `ValueUpdate` or `SviUpdate` comes only from `bs_oracle::verify`, which checks
 * Block Scholes' signature over the whole batch, and a caller gets them from the
 * verified batch with `into_value_updates` and `into_svi_updates`. A `BsVol` and a
 * `BsSpot` are built only here, from those updates, so holding one proves the
 * signed values behind it. Like `LazerPrice`, both have `copy` and `drop` but not
 * `store`, so they live within one transaction. Each records the base asset, SVI
 * model, SVI decimals, and expiry it was decoded for, and the consumer checks
 * those against its own oracle binding.
 *
 * Every value is matched by its series id and its own source timestamp, not the
 * batch's. The series ids are the ones Propbook's stores accepted: spot and
 * forward at 1e9, and SVI under the given model at the given decimals, all with
 * millisecond timestamps.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64, U128 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
const $moduleName = '@local-pkg/deepbook_predict_math::block_scholes';
export const BsVol = new MoveStruct({
	name: `${$moduleName}::BsVol`,
	fields: {
		base_asset: bcs.string(),
		svi_model: bcs.string(),
		/** The decimals the SVI tuple was signed at: `9` or `18`. */
		svi_decimals: bcs.u8(),
		expiry_ms: U64,
		/** Source time of `spot` and `forward`, in ms. */
		value_ms: U64,
		/** Spot and forward(expiry), at 1e9. */
		spot: U64,
		forward: U64,
		/** Source time of the SVI tuple, in ms. */
		svi_ms: U64,
		/** SVI `a` magnitude and `b` at 1e18, exactly as signed. */
		a_magnitude: U128,
		a_is_negative: bcs.bool(),
		b: U128,
		/** SVI `rho`, `m`, and `sigma` at 1e9, rounded half up from 18 decimals. */
		rho: i64.I64,
		m: i64.I64,
		sigma: U64,
	},
});
export const BsSpot = new MoveStruct({
	name: `${$moduleName}::BsSpot`,
	fields: {
		base_asset: bcs.string(),
		/** Source time, in ms. */
		source_ms: U64,
		/** At 1e9. */
		spot: U64,
	},
});
export interface VolsArguments {
	values: TransactionArgument;
	svis: TransactionArgument;
	baseAsset: RawTransactionArgument<string>;
	sviModel: RawTransactionArgument<string>;
	sviDecimals: RawTransactionArgument<number>;
	expiriesMs: RawTransactionArgument<Array<number | bigint>>;
}
export interface VolsOptions {
	package?: string;
	arguments:
		| VolsArguments
		| [
				values: TransactionArgument,
				svis: TransactionArgument,
				baseAsset: RawTransactionArgument<string>,
				sviModel: RawTransactionArgument<string>,
				sviDecimals: RawTransactionArgument<number>,
				expiriesMs: RawTransactionArgument<Array<number | bigint>>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Every `BsVol` the updates hold for each of `expiries_ms`: one for each pair of a
 * spot and a forward stamped at the same source time and an SVI tuple, under
 * `base_asset` and, for SVI, `svi_model` at `svi_decimals`. Updates for other
 * series are ignored, so one batch can serve several markets. A combination is
 * left out when a spot or forward is zero or wider than `u64`, or an SVI parameter
 * does not fit Predict's widths, and every combination is left out when
 * `svi_decimals` is neither `9` nor `18`. Nothing here checks Predict's pricing
 * envelope or the source times: the consumer does.
 */
export function vols(options: VolsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [
		'vector<null>',
		'vector<null>',
		'0x1::string::String',
		'0x1::string::String',
		'u8',
		'vector<u64>',
	] satisfies (string | null)[];
	const parameterNames = ['values', 'svis', 'baseAsset', 'sviModel', 'sviDecimals', 'expiriesMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'vols',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VolAtArguments {
	values: TransactionArgument;
	svis: TransactionArgument;
	baseAsset: RawTransactionArgument<string>;
	sviModel: RawTransactionArgument<string>;
	sviDecimals: RawTransactionArgument<number>;
	expiryMs: RawTransactionArgument<number | bigint>;
	valueMs: RawTransactionArgument<number | bigint>;
	sviMs: RawTransactionArgument<number | bigint>;
}
export interface VolAtOptions {
	package?: string;
	arguments:
		| VolAtArguments
		| [
				values: TransactionArgument,
				svis: TransactionArgument,
				baseAsset: RawTransactionArgument<string>,
				sviModel: RawTransactionArgument<string>,
				sviDecimals: RawTransactionArgument<number>,
				expiryMs: RawTransactionArgument<number | bigint>,
				valueMs: RawTransactionArgument<number | bigint>,
				sviMs: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The `BsVol` for `expiry_ms` whose spot and forward are stamped `value_ms` and
 * whose SVI is stamped `svi_ms`, or `none`. The first match `vols` finds.
 */
export function volAt(options: VolAtOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [
		'vector<null>',
		'vector<null>',
		'0x1::string::String',
		'0x1::string::String',
		'u8',
		'u64',
		'u64',
		'u64',
	] satisfies (string | null)[];
	const parameterNames = [
		'values',
		'svis',
		'baseAsset',
		'sviModel',
		'sviDecimals',
		'expiryMs',
		'valueMs',
		'sviMs',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'vol_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotAtArguments {
	values: TransactionArgument;
	baseAsset: RawTransactionArgument<string>;
	sourceMs: RawTransactionArgument<number | bigint>;
}
export interface SpotAtOptions {
	package?: string;
	arguments:
		| SpotAtArguments
		| [
				values: TransactionArgument,
				baseAsset: RawTransactionArgument<string>,
				sourceMs: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The spot of `base_asset` stamped `source_ms`, or `none` when the updates hold
 * none, or it is zero or wider than `u64`. The first match.
 */
export function spotAt(options: SpotAtOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['vector<null>', '0x1::string::String', 'u64'] satisfies (string | null)[];
	const parameterNames = ['values', 'baseAsset', 'sourceMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'spot_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotSidArguments {
	baseAsset: RawTransactionArgument<string>;
}
export interface SpotSidOptions {
	package?: string;
	arguments: SpotSidArguments | [baseAsset: RawTransactionArgument<string>];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The series id of `base_asset`'s spot at 1e9. For PTB construction and keepers
 * that pick a batch's updates.
 */
export function spotSid(options: SpotSidOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['baseAsset'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'spot_sid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ForwardSidArguments {
	baseAsset: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface ForwardSidOptions {
	package?: string;
	arguments:
		| ForwardSidArguments
		| [
				baseAsset: RawTransactionArgument<string>,
				expiryMs: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/** The series id of `base_asset`'s composite forward for `expiry_ms`, at 1e9. */
export function forwardSid(options: ForwardSidOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['0x1::string::String', 'u64'] satisfies (string | null)[];
	const parameterNames = ['baseAsset', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'forward_sid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviSidArguments {
	baseAsset: RawTransactionArgument<string>;
	sviModel: RawTransactionArgument<string>;
	sviDecimals: RawTransactionArgument<number>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface SviSidOptions {
	package?: string;
	arguments:
		| SviSidArguments
		| [
				baseAsset: RawTransactionArgument<string>,
				sviModel: RawTransactionArgument<string>,
				sviDecimals: RawTransactionArgument<number>,
				expiryMs: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * The series id of `base_asset`'s SVI tuple for `expiry_ms` under `svi_model`. The
 * id hashes one decimals value for all five parameters.
 */
export function sviSid(options: SviSidOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = ['0x1::string::String', '0x1::string::String', 'u8', 'u64'] satisfies (
		string | null
	)[];
	const parameterNames = ['baseAsset', 'sviModel', 'sviDecimals', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'svi_sid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BaseAssetArguments {
	vol: TransactionArgument;
}
export interface BaseAssetOptions {
	package?: string;
	arguments: BaseAssetArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function baseAsset(options: BaseAssetOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'base_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviModelArguments {
	vol: TransactionArgument;
}
export interface SviModelOptions {
	package?: string;
	arguments: SviModelArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function sviModel(options: SviModelOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'svi_model',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviDecimalsArguments {
	vol: TransactionArgument;
}
export interface SviDecimalsOptions {
	package?: string;
	arguments: SviDecimalsArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function sviDecimals(options: SviDecimalsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'svi_decimals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryMsArguments {
	vol: TransactionArgument;
}
export interface ExpiryMsOptions {
	package?: string;
	arguments: ExpiryMsArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function expiryMs(options: ExpiryMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'expiry_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValueMsArguments {
	vol: TransactionArgument;
}
export interface ValueMsOptions {
	package?: string;
	arguments: ValueMsArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function valueMs(options: ValueMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'value_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotArguments {
	vol: TransactionArgument;
}
export interface SpotOptions {
	package?: string;
	arguments: SpotArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function spot(options: SpotOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ForwardArguments {
	vol: TransactionArgument;
}
export interface ForwardOptions {
	package?: string;
	arguments: ForwardArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function forward(options: ForwardOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'forward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviMsArguments {
	vol: TransactionArgument;
}
export interface SviMsOptions {
	package?: string;
	arguments: SviMsArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function sviMs(options: SviMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'svi_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AMagnitudeArguments {
	vol: TransactionArgument;
}
export interface AMagnitudeOptions {
	package?: string;
	arguments: AMagnitudeArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function aMagnitude(options: AMagnitudeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'a_magnitude',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AIsNegativeArguments {
	vol: TransactionArgument;
}
export interface AIsNegativeOptions {
	package?: string;
	arguments: AIsNegativeArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function aIsNegative(options: AIsNegativeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'a_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BArguments {
	vol: TransactionArgument;
}
export interface BOptions {
	package?: string;
	arguments: BArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function b(options: BOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'b',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RhoArguments {
	vol: TransactionArgument;
}
export interface RhoOptions {
	package?: string;
	arguments: RhoArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function rho(options: RhoOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'rho',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MArguments {
	vol: TransactionArgument;
}
export interface MOptions {
	package?: string;
	arguments: MArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function m(options: MOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'm',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SigmaArguments {
	vol: TransactionArgument;
}
export interface SigmaOptions {
	package?: string;
	arguments: SigmaArguments | [vol: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function sigma(options: SigmaOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'sigma',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotBaseAssetArguments {
	spot: TransactionArgument;
}
export interface SpotBaseAssetOptions {
	package?: string;
	arguments: SpotBaseAssetArguments | [spot: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function spotBaseAsset(options: SpotBaseAssetOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['spot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'spot_base_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SourceMsArguments {
	spot: TransactionArgument;
}
export interface SourceMsOptions {
	package?: string;
	arguments: SourceMsArguments | [spot: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function sourceMs(options: SourceMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['spot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'source_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotPriceArguments {
	spot: TransactionArgument;
}
export interface SpotPriceOptions {
	package?: string;
	arguments: SpotPriceArguments | [spot: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function spotPrice(options: SpotPriceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['spot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes',
			function: 'spot_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
