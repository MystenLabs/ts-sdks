/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
export interface VersionOptions {
	package?: string;
	arguments?: [];
}
/** Returns the current version of the auction contract */
export function version(options: VersionOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'version',
		});
}
export interface BidExtendTimeOptions {
	package?: string;
	arguments?: [];
}
/** Returns the bid extend time in seconds */
export function bidExtendTime(options: BidExtendTimeOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'bid_extend_time',
		});
}
export interface MaxPercentageOptions {
	package?: string;
	arguments?: [];
}
/** Returns the maximum percentage value */
export function maxPercentage(options: MaxPercentageOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'max_percentage',
		});
}
export interface MinBidIncreasePercentageOptions {
	package?: string;
	arguments?: [];
}
/** Returns the minimum bid increase percentage */
export function minBidIncreasePercentage(options: MinBidIncreasePercentageOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'min_bid_increase_percentage',
		});
}
export interface DefaultFeePercentageOptions {
	package?: string;
	arguments?: [];
}
/** Returns the default service fee percentage */
export function defaultFeePercentage(options: DefaultFeePercentageOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'default_fee_percentage',
		});
}
export interface MinAuctionTimeOptions {
	package?: string;
	arguments?: [];
}
/** Returns the minimum auction time */
export function minAuctionTime(options: MinAuctionTimeOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'min_auction_time',
		});
}
export interface MaxAuctionTimeOptions {
	package?: string;
	arguments?: [];
}
/** Returns the maximum auction time */
export function maxAuctionTime(options: MaxAuctionTimeOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'max_auction_time',
		});
}
