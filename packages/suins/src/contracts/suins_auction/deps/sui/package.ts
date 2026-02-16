/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Functions for operating on Move packages from within Move:
 *
 * - Creating proof-of-publish objects from one-time witnesses
 * - Administering package upgrades through upgrade policies.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::package';
export const UpgradeCap = new MoveStruct({
	name: `${$moduleName}::UpgradeCap`,
	fields: {
		id: bcs.Address,
		/** (Mutable) ID of the package that can be upgraded. */
		package: bcs.Address,
		/**
		 * (Mutable) The number of upgrades that have been applied successively to the
		 * original package. Initially 0.
		 */
		version: bcs.u64(),
		/** What kind of upgrades are allowed. */
		policy: bcs.u8(),
	},
});
export const Publisher = new MoveStruct({
	name: `${$moduleName}::Publisher`,
	fields: {
		id: bcs.Address,
		package: bcs.string(),
		module_name: bcs.string(),
	},
});
export const UpgradeTicket = new MoveStruct({
	name: `${$moduleName}::UpgradeTicket`,
	fields: {
		/** (Immutable) ID of the `UpgradeCap` this originated from. */
		cap: bcs.Address,
		/** (Immutable) ID of the package that can be upgraded. */
		package: bcs.Address,
		/** (Immutable) The policy regarding what kind of upgrade this ticket permits. */
		policy: bcs.u8(),
		/**
		 * (Immutable) SHA256 digest of the bytecode and transitive dependencies that will
		 * be used in the upgrade.
		 */
		digest: bcs.vector(bcs.u8()),
	},
});
export const UpgradeReceipt = new MoveStruct({
	name: `${$moduleName}::UpgradeReceipt`,
	fields: {
		/** (Immutable) ID of the `UpgradeCap` this originated from. */
		cap: bcs.Address,
		/** (Immutable) ID of the package after it was upgraded. */
		package: bcs.Address,
	},
});
export interface ClaimArguments<OTW extends BcsType<any>> {
	otw: RawTransactionArgument<OTW>;
}
export interface ClaimOptions<OTW extends BcsType<any>> {
	package: string;
	arguments: ClaimArguments<OTW> | [otw: RawTransactionArgument<OTW>];
	typeArguments: [string];
}
/**
 * Claim a Publisher object. Requires a One-Time-Witness to prove ownership. Due to
 * this constraint there can be only one Publisher object per module but multiple
 * per package (!).
 */
export function claim<OTW extends BcsType<any>>(options: ClaimOptions<OTW>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['otw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'claim',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimAndKeepArguments<OTW extends BcsType<any>> {
	otw: RawTransactionArgument<OTW>;
}
export interface ClaimAndKeepOptions<OTW extends BcsType<any>> {
	package: string;
	arguments: ClaimAndKeepArguments<OTW> | [otw: RawTransactionArgument<OTW>];
	typeArguments: [string];
}
/**
 * Claim a Publisher object and send it to transaction sender. Since this function
 * can only be called in the module initializer, the sender is the publisher.
 */
export function claimAndKeep<OTW extends BcsType<any>>(options: ClaimAndKeepOptions<OTW>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['otw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'claim_and_keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BurnPublisherArguments {
	self: RawTransactionArgument<string>;
}
export interface BurnPublisherOptions {
	package: string;
	arguments: BurnPublisherArguments | [self: RawTransactionArgument<string>];
}
/**
 * Destroy a Publisher object effectively removing all privileges associated with
 * it.
 */
export function burnPublisher(options: BurnPublisherOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'burn_publisher',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromPackageArguments {
	self: RawTransactionArgument<string>;
}
export interface FromPackageOptions {
	package: string;
	arguments: FromPackageArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether type belongs to the same package as the publisher object. */
export function fromPackage(options: FromPackageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'from_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FromModuleArguments {
	self: RawTransactionArgument<string>;
}
export interface FromModuleOptions {
	package: string;
	arguments: FromModuleArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether a type belongs to the same module as the publisher object. */
export function fromModule(options: FromModuleOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'from_module',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PublishedModuleArguments {
	self: RawTransactionArgument<string>;
}
export interface PublishedModuleOptions {
	package: string;
	arguments: PublishedModuleArguments | [self: RawTransactionArgument<string>];
}
/** Read the name of the module. */
export function publishedModule(options: PublishedModuleOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'published_module',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PublishedPackageArguments {
	self: RawTransactionArgument<string>;
}
export interface PublishedPackageOptions {
	package: string;
	arguments: PublishedPackageArguments | [self: RawTransactionArgument<string>];
}
/** Read the package address string. */
export function publishedPackage(options: PublishedPackageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'published_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpgradePackageArguments {
	cap: RawTransactionArgument<string>;
}
export interface UpgradePackageOptions {
	package: string;
	arguments: UpgradePackageArguments | [cap: RawTransactionArgument<string>];
}
/**
 * The ID of the package that this cap authorizes upgrades for. Can be `0x0` if the
 * cap cannot currently authorize an upgrade because there is already a pending
 * upgrade in the transaction. Otherwise guaranteed to be the latest version of any
 * given package.
 */
export function upgradePackage(options: UpgradePackageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'upgrade_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VersionArguments {
	cap: RawTransactionArgument<string>;
}
export interface VersionOptions {
	package: string;
	arguments: VersionArguments | [cap: RawTransactionArgument<string>];
}
/**
 * The most recent version of the package, increments by one for each successfully
 * applied upgrade.
 */
export function version(options: VersionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpgradePolicyArguments {
	cap: RawTransactionArgument<string>;
}
export interface UpgradePolicyOptions {
	package: string;
	arguments: UpgradePolicyArguments | [cap: RawTransactionArgument<string>];
}
/** The most permissive kind of upgrade currently supported by this `cap`. */
export function upgradePolicy(options: UpgradePolicyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'upgrade_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TicketPackageArguments {
	ticket: RawTransactionArgument<string>;
}
export interface TicketPackageOptions {
	package: string;
	arguments: TicketPackageArguments | [ticket: RawTransactionArgument<string>];
}
/** The package that this ticket is authorized to upgrade */
export function ticketPackage(options: TicketPackageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['ticket'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'ticket_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TicketPolicyArguments {
	ticket: RawTransactionArgument<string>;
}
export interface TicketPolicyOptions {
	package: string;
	arguments: TicketPolicyArguments | [ticket: RawTransactionArgument<string>];
}
/** The kind of upgrade that this ticket authorizes. */
export function ticketPolicy(options: TicketPolicyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['ticket'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'ticket_policy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiptCapArguments {
	receipt: RawTransactionArgument<string>;
}
export interface ReceiptCapOptions {
	package: string;
	arguments: ReceiptCapArguments | [receipt: RawTransactionArgument<string>];
}
/** ID of the `UpgradeCap` that this `receipt` should be used to update. */
export function receiptCap(options: ReceiptCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'receipt_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiptPackageArguments {
	receipt: RawTransactionArgument<string>;
}
export interface ReceiptPackageOptions {
	package: string;
	arguments: ReceiptPackageArguments | [receipt: RawTransactionArgument<string>];
}
/**
 * ID of the package that was upgraded to: the latest version of the package, as of
 * the upgrade represented by this `receipt`.
 */
export function receiptPackage(options: ReceiptPackageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'receipt_package',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TicketDigestArguments {
	ticket: RawTransactionArgument<string>;
}
export interface TicketDigestOptions {
	package: string;
	arguments: TicketDigestArguments | [ticket: RawTransactionArgument<string>];
}
/**
 * A hash of the package contents for the new version of the package. This ticket
 * only authorizes an upgrade to a package that matches this digest. A package's
 * contents are identified by two things:
 *
 * - modules: [[u8]] a list of the package's module contents
 * - deps: [[u8; 32]] a list of 32 byte ObjectIDs of the package's transitive
 *   dependencies
 *
 * A package's digest is calculated as:
 *
 * sha3_256(sort(modules ++ deps))
 */
export function ticketDigest(options: TicketDigestOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['ticket'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'ticket_digest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CompatiblePolicyOptions {
	package: string;
	arguments?: [];
}
/** Expose the constants representing various upgrade policies */
export function compatiblePolicy(options: CompatiblePolicyOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'compatible_policy',
		});
}
export interface AdditivePolicyOptions {
	package: string;
	arguments?: [];
}
export function additivePolicy(options: AdditivePolicyOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'additive_policy',
		});
}
export interface DepOnlyPolicyOptions {
	package: string;
	arguments?: [];
}
export function depOnlyPolicy(options: DepOnlyPolicyOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'dep_only_policy',
		});
}
export interface OnlyAdditiveUpgradesArguments {
	cap: RawTransactionArgument<string>;
}
export interface OnlyAdditiveUpgradesOptions {
	package: string;
	arguments: OnlyAdditiveUpgradesArguments | [cap: RawTransactionArgument<string>];
}
/**
 * Restrict upgrades through this upgrade `cap` to just add code, or change
 * dependencies.
 */
export function onlyAdditiveUpgrades(options: OnlyAdditiveUpgradesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'only_additive_upgrades',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OnlyDepUpgradesArguments {
	cap: RawTransactionArgument<string>;
}
export interface OnlyDepUpgradesOptions {
	package: string;
	arguments: OnlyDepUpgradesArguments | [cap: RawTransactionArgument<string>];
}
/** Restrict upgrades through this upgrade `cap` to just change dependencies. */
export function onlyDepUpgrades(options: OnlyDepUpgradesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'only_dep_upgrades',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakeImmutableArguments {
	cap: RawTransactionArgument<string>;
}
export interface MakeImmutableOptions {
	package: string;
	arguments: MakeImmutableArguments | [cap: RawTransactionArgument<string>];
}
/** Discard the `UpgradeCap` to make a package immutable. */
export function makeImmutable(options: MakeImmutableOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'make_immutable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizeUpgradeArguments {
	cap: RawTransactionArgument<string>;
	policy: RawTransactionArgument<number>;
	digest: RawTransactionArgument<number[]>;
}
export interface AuthorizeUpgradeOptions {
	package: string;
	arguments:
		| AuthorizeUpgradeArguments
		| [
				cap: RawTransactionArgument<string>,
				policy: RawTransactionArgument<number>,
				digest: RawTransactionArgument<number[]>,
		  ];
}
/**
 * Issue a ticket authorizing an upgrade to a particular new bytecode (identified
 * by its digest). A ticket will only be issued if one has not already been issued,
 * and if the `policy` requested is at least as restrictive as the policy set out
 * by the `cap`.
 *
 * The `digest` supplied and the `policy` will both be checked by validators when
 * running the upgrade. I.e. the bytecode supplied in the upgrade must have a
 * matching digest, and the changes relative to the parent package must be
 * compatible with the policy in the ticket for the upgrade to succeed.
 */
export function authorizeUpgrade(options: AuthorizeUpgradeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u8', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['cap', 'policy', 'digest'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'authorize_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CommitUpgradeArguments {
	cap: RawTransactionArgument<string>;
	receipt: RawTransactionArgument<string>;
}
export interface CommitUpgradeOptions {
	package: string;
	arguments:
		| CommitUpgradeArguments
		| [cap: RawTransactionArgument<string>, receipt: RawTransactionArgument<string>];
}
/** Consume an `UpgradeReceipt` to update its `UpgradeCap`, finalizing the upgrade. */
export function commitUpgrade(options: CommitUpgradeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['cap', 'receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'package',
			function: 'commit_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
