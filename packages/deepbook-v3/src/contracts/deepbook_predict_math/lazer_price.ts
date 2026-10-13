/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A Pyth Lazer price decoded from a verified update, for Predict's order-flow
 * commit.
 *
 * A `LazerPrice` is built only from a `pyth_lazer::update::Update`, which only
 * Pyth's verifier produces, so holding one proves a Pyth signature over its feed,
 * channel, timestamps, and price. It has `copy` and `drop` but not `store`, so it
 * lives within one transaction. The decode is Predict v4's queue commit decode: it
 * aborts on an update that does not carry the requested feed or lacks its price,
 * exponent, or feed-update-time property, because the caller then passed the wrong
 * update, and it returns `none` only when the feed has no usable price at that
 * tick: an empty price or update time, or a price that does not normalize to
 * Predict's pricing-safe 1e9 spot.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict_math::lazer_price';
export const LazerPrice = new MoveStruct({
	name: `${$moduleName}::LazerPrice`,
	fields: {
		feed_id: bcs.u32(),
		/**
		 * A Lazer channel id: `channel_fixed_rate_50ms!()`, `channel_fixed_rate_200ms!()`,
		 * or `1` for real-time.
		 */
		channel: bcs.u8(),
		/** The update's timestamp, in µs. */
		envelope_us: U64,
		/** The feed's own update time, in µs. Never after the envelope. */
		generation_us: U64,
		/**
		 * The price normalized to 1e9, rounded down when the source is finer; positive and
		 * at most `u64::MAX / 100`.
		 */
		spot: U64,
	},
});
export interface FromUpdateArguments {
	update: TransactionArgument;
	feedId: RawTransactionArgument<number>;
}
export interface FromUpdateOptions {
	package?: string;
	arguments:
		FromUpdateArguments | [update: TransactionArgument, feedId: RawTransactionArgument<number>];
	config?: {
		predictMathPackageId?: string;
	};
}
/**
 * Decode `feed_id` from a verified Lazer update. `none` when the feed's price or
 * update time is empty at this tick, or its price does not normalize to a
 * pricing-safe spot. Aborts `EFeedMissing` when the update does not carry the feed
 * and `EPropertyNotRequested` when the feed lacks the price, exponent, or
 * update-time property, because the caller then passed the wrong update, and
 * `EGenerationAfterEnvelope` when the feed claims an update time after the
 * envelope that carries it.
 *
 * Uses Lazer's v1 `Update`, which Pyth marked deprecated on Mainnet but still
 * serves; a later library upgrade adds a constructor for v2.
 */
export function fromUpdate(options: FromUpdateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['update', 'feedId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'lazer_price',
			function: 'from_update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeedIdArguments {
	price: TransactionArgument;
}
export interface FeedIdOptions {
	package?: string;
	arguments: FeedIdArguments | [price: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function feedId(options: FeedIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'lazer_price',
			function: 'feed_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ChannelArguments {
	price: TransactionArgument;
}
export interface ChannelOptions {
	package?: string;
	arguments: ChannelArguments | [price: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function channel(options: ChannelOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'lazer_price',
			function: 'channel',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EnvelopeUsArguments {
	price: TransactionArgument;
}
export interface EnvelopeUsOptions {
	package?: string;
	arguments: EnvelopeUsArguments | [price: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function envelopeUs(options: EnvelopeUsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'lazer_price',
			function: 'envelope_us',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerationUsArguments {
	price: TransactionArgument;
}
export interface GenerationUsOptions {
	package?: string;
	arguments: GenerationUsArguments | [price: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function generationUs(options: GenerationUsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'lazer_price',
			function: 'generation_us',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotArguments {
	price: TransactionArgument;
}
export interface SpotOptions {
	package?: string;
	arguments: SpotArguments | [price: TransactionArgument];
	config?: {
		predictMathPackageId?: string;
	};
}
export function spot(options: SpotOptions) {
	const packageAddress =
		options.package ?? options.config?.predictMathPackageId ?? '@local-pkg/deepbook_predict_math';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'lazer_price',
			function: 'spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
