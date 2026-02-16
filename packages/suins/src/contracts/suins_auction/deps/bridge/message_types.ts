/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
export interface TokenOptions {
	package: string;
	arguments?: [];
}
export function token(options: TokenOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message_types',
			function: 'token',
		});
}
export interface CommitteeBlocklistOptions {
	package: string;
	arguments?: [];
}
export function committeeBlocklist(options: CommitteeBlocklistOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message_types',
			function: 'committee_blocklist',
		});
}
export interface EmergencyOpOptions {
	package: string;
	arguments?: [];
}
export function emergencyOp(options: EmergencyOpOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message_types',
			function: 'emergency_op',
		});
}
export interface UpdateBridgeLimitOptions {
	package: string;
	arguments?: [];
}
export function updateBridgeLimit(options: UpdateBridgeLimitOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message_types',
			function: 'update_bridge_limit',
		});
}
export interface UpdateAssetPriceOptions {
	package: string;
	arguments?: [];
}
export function updateAssetPrice(options: UpdateAssetPriceOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message_types',
			function: 'update_asset_price',
		});
}
export interface AddTokensOnSuiOptions {
	package: string;
	arguments?: [];
}
export function addTokensOnSui(options: AddTokensOnSuiOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message_types',
			function: 'add_tokens_on_sui',
		});
}
