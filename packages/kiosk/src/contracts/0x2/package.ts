/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::package';
export const Publisher = new MoveStruct({
	name: `${$moduleName}::Publisher`,
	fields: {
		id: bcs.Address,
		package: bcs.string(),
		module_name: bcs.string(),
	},
});
export const UpgradeCap = new MoveStruct({
	name: `${$moduleName}::UpgradeCap`,
	fields: {
		id: bcs.Address,
		package: bcs.Address,
		version: bcs.u64(),
		policy: bcs.u8(),
	},
});
export const UpgradeTicket = new MoveStruct({
	name: `${$moduleName}::UpgradeTicket`,
	fields: {
		cap: bcs.Address,
		package: bcs.Address,
		policy: bcs.u8(),
		digest: bcs.vector(bcs.u8()),
	},
});
export const UpgradeReceipt = new MoveStruct({
	name: `${$moduleName}::UpgradeReceipt`,
	fields: {
		cap: bcs.Address,
		package: bcs.Address,
	},
});
export interface ClaimOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function claim<T0 extends BcsType<any>>(options: ClaimOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'claim',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimAndKeepOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function claimAndKeep<T0 extends BcsType<any>>(options: ClaimAndKeepOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'claim_and_keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BurnPublisherOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function burnPublisher(options: BurnPublisherOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::Publisher`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'burn_publisher',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface FromPackageOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function fromPackage(options: FromPackageOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::Publisher`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'from_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FromModuleOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function fromModule(options: FromModuleOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::Publisher`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'from_module',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PublishedModuleOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function publishedModule(options: PublishedModuleOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::Publisher`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'published_module',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PublishedPackageOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function publishedPackage(options: PublishedPackageOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::Publisher`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'published_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UpgradePackageOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function upgradePackage(options: UpgradePackageOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeCap`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'upgrade_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface VersionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function version(options: VersionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeCap`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UpgradePolicyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function upgradePolicy(options: UpgradePolicyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeCap`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'upgrade_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface TicketPackageOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function ticketPackage(options: TicketPackageOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeTicket`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'ticket_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface TicketPolicyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function ticketPolicy(options: TicketPolicyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeTicket`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'ticket_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ReceiptCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function receiptCap(options: ReceiptCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeReceipt`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'receipt_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ReceiptPackageOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function receiptPackage(options: ReceiptPackageOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeReceipt`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'receipt_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface TicketDigestOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function ticketDigest(options: TicketDigestOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeTicket`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'ticket_digest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CompatiblePolicyOptions {
	package?: string;
	arguments?: [];
}
export function compatiblePolicy(options: CompatiblePolicyOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'compatible_policy',
		});
}
export interface AdditivePolicyOptions {
	package?: string;
	arguments?: [];
}
export function additivePolicy(options: AdditivePolicyOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'additive_policy',
		});
}
export interface DepOnlyPolicyOptions {
	package?: string;
	arguments?: [];
}
export function depOnlyPolicy(options: DepOnlyPolicyOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'dep_only_policy',
		});
}
export interface OnlyAdditiveUpgradesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function onlyAdditiveUpgrades(options: OnlyAdditiveUpgradesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeCap`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'only_additive_upgrades',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface OnlyDepUpgradesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function onlyDepUpgrades(options: OnlyDepUpgradesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeCap`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'only_dep_upgrades',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface MakeImmutableOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function makeImmutable(options: MakeImmutableOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::package::UpgradeCap`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'make_immutable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface AuthorizeUpgradeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number[]>,
	];
}
export function authorizeUpgrade(options: AuthorizeUpgradeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::package::UpgradeCap`,
		'u8',
		'vector<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'authorize_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CommitUpgradeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function commitUpgrade(options: CommitUpgradeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::package::UpgradeCap`,
		`${packageAddress}::package::UpgradeReceipt`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'commit_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
