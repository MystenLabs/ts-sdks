/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import * as data_source from './data_source.js';
import * as consumed_vaas from './deps/0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94/consumed_vaas.js';
import * as _package from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/package.js';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::state';
export const LatestOnly = new MoveStruct({
	name: `${$moduleName}::LatestOnly`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const State = new MoveStruct({
	name: `${$moduleName}::State`,
	fields: {
		id: object.UID,
		governance_data_source: data_source.DataSource,
		stale_price_threshold: bcs.u64(),
		base_update_fee: bcs.u64(),
		fee_recipient_address: bcs.Address,
		last_executed_governance_sequence: bcs.u64(),
		consumed_vaas: consumed_vaas.ConsumedVAAs,
		upgrade_cap: _package.UpgradeCap,
	},
});
export const CurrentDigest = new MoveStruct({
	name: `${$moduleName}::CurrentDigest`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface GetStalePriceThresholdSecsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getStalePriceThresholdSecs(options: GetStalePriceThresholdSecsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'get_stale_price_threshold_secs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetBaseUpdateFeeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getBaseUpdateFee(options: GetBaseUpdateFeeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'get_base_update_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetFeeRecipientOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getFeeRecipient(options: GetFeeRecipientOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'get_fee_recipient',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IsValidDataSourceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function isValidDataSource(options: IsValidDataSourceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::state::State`,
		`${packageAddress}::data_source::DataSource`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'is_valid_data_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IsValidGovernanceDataSourceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function isValidGovernanceDataSource(options: IsValidGovernanceDataSourceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::state::State`,
		`${packageAddress}::data_source::DataSource`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'is_valid_governance_data_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PriceFeedObjectExistsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function priceFeedObjectExists(options: PriceFeedObjectExistsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::state::State`,
		`${packageAddress}::price_identifier::PriceIdentifier`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'price_feed_object_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GovernanceDataSourceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function governanceDataSource(options: GovernanceDataSourceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'governance_data_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetLastExecutedGovernanceSequenceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getLastExecutedGovernanceSequence(
	options: GetLastExecutedGovernanceSequenceOptions,
) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'get_last_executed_governance_sequence',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GovernanceModuleOptions {
	package?: string;
	arguments?: [];
}
export function governanceModule(options: GovernanceModuleOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'governance_module',
		});
}
export interface GovernanceChainOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function governanceChain(options: GovernanceChainOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'governance_chain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GovernanceContractOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function governanceContract(options: GovernanceContractOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'governance_contract',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceInfoObjectIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number[]>];
}
export function getPriceInfoObjectId(options: GetPriceInfoObjectIdOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::state::State`, 'vector<u8>'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'state',
			function: 'get_price_info_object_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
