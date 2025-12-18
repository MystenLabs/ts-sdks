/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::governance_action';
export const GovernanceAction = new MoveStruct({
	name: `${$moduleName}::GovernanceAction`,
	fields: {
		value: bcs.u8(),
	},
});
export interface FromU8Options {
	package?: string;
	arguments: [RawTransactionArgument<number>];
}
export function fromU8(options: FromU8Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['u8'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'from_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetValueOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getValue(options: GetValueOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::governance_action::GovernanceAction`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'get_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface NewContractUpgradeOptions {
	package?: string;
	arguments?: [];
}
export function newContractUpgrade(options: NewContractUpgradeOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'new_contract_upgrade',
		});
}
export interface NewSetGovernanceDataSourceOptions {
	package?: string;
	arguments?: [];
}
export function newSetGovernanceDataSource(options: NewSetGovernanceDataSourceOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'new_set_governance_data_source',
		});
}
export interface NewSetDataSourcesOptions {
	package?: string;
	arguments?: [];
}
export function newSetDataSources(options: NewSetDataSourcesOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'new_set_data_sources',
		});
}
export interface NewSetUpdateFeeOptions {
	package?: string;
	arguments?: [];
}
export function newSetUpdateFee(options: NewSetUpdateFeeOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'new_set_update_fee',
		});
}
export interface NewSetStalePriceThresholdOptions {
	package?: string;
	arguments?: [];
}
export function newSetStalePriceThreshold(options: NewSetStalePriceThresholdOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'new_set_stale_price_threshold',
		});
}
export interface NewSetFeeRecipientOptions {
	package?: string;
	arguments?: [];
}
export function newSetFeeRecipient(options: NewSetFeeRecipientOptions = {}) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_action',
			function: 'new_set_fee_recipient',
		});
}
