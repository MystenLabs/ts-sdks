/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance from './deps/sui/balance.js';
import * as margin_state from './margin_state.js';
import * as protocol_config from './protocol_config.js';
import * as protocol_fees from './protocol_fees.js';
import * as position_manager from './position_manager.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as rate_limiter from './rate_limiter.js';
import * as vec_map from './deps/sui/vec_map.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@deepbook/margin::margin_pool';
export const MarginPool = new MoveStruct({
	name: `${$moduleName}::MarginPool<phantom Asset>`,
	fields: {
		id: bcs.Address,
		vault: balance.Balance,
		state: margin_state.State,
		config: protocol_config.ProtocolConfig,
		protocol_fees: protocol_fees.ProtocolFees,
		positions: position_manager.PositionManager,
		allowed_deepbook_pools: vec_set.VecSet(bcs.Address),
		rate_limiter: rate_limiter.RateLimiter,
		extra_fields: vec_map.VecMap(bcs.string(), bcs.u64()),
	},
});
export const SupplierCap = new MoveStruct({
	name: `${$moduleName}::SupplierCap`,
	fields: {
		id: bcs.Address,
	},
});
export const MarginPoolCreated = new MoveStruct({
	name: `${$moduleName}::MarginPoolCreated`,
	fields: {
		margin_pool_id: bcs.Address,
		maintainer_cap_id: bcs.Address,
		asset_type: type_name.TypeName,
		config: protocol_config.ProtocolConfig,
		timestamp: bcs.u64(),
	},
});
export const MaintainerFeesWithdrawn = new MoveStruct({
	name: `${$moduleName}::MaintainerFeesWithdrawn`,
	fields: {
		margin_pool_id: bcs.Address,
		margin_pool_cap_id: bcs.Address,
		maintainer_fees: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const ProtocolFeesWithdrawn = new MoveStruct({
	name: `${$moduleName}::ProtocolFeesWithdrawn`,
	fields: {
		margin_pool_id: bcs.Address,
		protocol_fees: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const DeepbookPoolUpdated = new MoveStruct({
	name: `${$moduleName}::DeepbookPoolUpdated`,
	fields: {
		margin_pool_id: bcs.Address,
		deepbook_pool_id: bcs.Address,
		pool_cap_id: bcs.Address,
		enabled: bcs.bool(),
		timestamp: bcs.u64(),
	},
});
export const InterestParamsUpdated = new MoveStruct({
	name: `${$moduleName}::InterestParamsUpdated`,
	fields: {
		margin_pool_id: bcs.Address,
		pool_cap_id: bcs.Address,
		interest_config: protocol_config.InterestConfig,
		timestamp: bcs.u64(),
	},
});
export const MarginPoolConfigUpdated = new MoveStruct({
	name: `${$moduleName}::MarginPoolConfigUpdated`,
	fields: {
		margin_pool_id: bcs.Address,
		pool_cap_id: bcs.Address,
		margin_pool_config: protocol_config.MarginPoolConfig,
		timestamp: bcs.u64(),
	},
});
export const AssetSupplied = new MoveStruct({
	name: `${$moduleName}::AssetSupplied`,
	fields: {
		margin_pool_id: bcs.Address,
		asset_type: type_name.TypeName,
		supplier_cap_id: bcs.Address,
		supply_amount: bcs.u64(),
		supply_shares: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const AssetWithdrawn = new MoveStruct({
	name: `${$moduleName}::AssetWithdrawn`,
	fields: {
		margin_pool_id: bcs.Address,
		asset_type: type_name.TypeName,
		supplier_cap_id: bcs.Address,
		withdraw_amount: bcs.u64(),
		withdraw_shares: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const SupplierCapMinted = new MoveStruct({
	name: `${$moduleName}::SupplierCapMinted`,
	fields: {
		supplier_cap_id: bcs.Address,
		timestamp: bcs.u64(),
	},
});
export const SupplyReferralMinted = new MoveStruct({
	name: `${$moduleName}::SupplyReferralMinted`,
	fields: {
		margin_pool_id: bcs.Address,
		supply_referral_id: bcs.Address,
		owner: bcs.Address,
		timestamp: bcs.u64(),
	},
});
export interface CreateMarginPoolArguments {
	registry: RawTransactionArgument<string>;
	config: TransactionArgument;
	maintainerCap: RawTransactionArgument<string>;
}
export interface CreateMarginPoolOptions {
	package?: string;
	arguments:
		| CreateMarginPoolArguments
		| [
				registry: RawTransactionArgument<string>,
				config: TransactionArgument,
				maintainerCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Creates and registers a new margin pool. If a same asset pool already exists,
 * abort. Sends a `MarginPoolCap` to the pool creator. Returns the created margin
 * pool id.
 */
export function createMarginPool(options: CreateMarginPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'maintainerCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'create_margin_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EnableDeepbookPoolForLoanArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
	marginPoolCap: RawTransactionArgument<string>;
}
export interface EnableDeepbookPoolForLoanOptions {
	package?: string;
	arguments:
		| EnableDeepbookPoolForLoanArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				deepbookPoolId: RawTransactionArgument<string>,
				marginPoolCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Allow a margin manager tied to a deepbook pool to borrow from the margin pool. */
export function enableDeepbookPoolForLoan(options: EnableDeepbookPoolForLoanOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::object::ID', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'registry', 'deepbookPoolId', 'marginPoolCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'enable_deepbook_pool_for_loan',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DisableDeepbookPoolForLoanArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
	marginPoolCap: RawTransactionArgument<string>;
}
export interface DisableDeepbookPoolForLoanOptions {
	package?: string;
	arguments:
		| DisableDeepbookPoolForLoanArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				deepbookPoolId: RawTransactionArgument<string>,
				marginPoolCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Disable a margin manager tied to a deepbook pool from borrowing from the margin
 * pool.
 */
export function disableDeepbookPoolForLoan(options: DisableDeepbookPoolForLoanOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::object::ID', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'registry', 'deepbookPoolId', 'marginPoolCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'disable_deepbook_pool_for_loan',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateInterestParamsArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	interestConfig: TransactionArgument;
	marginPoolCap: RawTransactionArgument<string>;
}
export interface UpdateInterestParamsOptions {
	package?: string;
	arguments:
		| UpdateInterestParamsArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				interestConfig: TransactionArgument,
				marginPoolCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Updates interest params for the margin pool */
export function updateInterestParams(options: UpdateInterestParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'interestConfig', 'marginPoolCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'update_interest_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateMarginPoolConfigArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	marginPoolConfig: TransactionArgument;
	marginPoolCap: RawTransactionArgument<string>;
}
export interface UpdateMarginPoolConfigOptions {
	package?: string;
	arguments:
		| UpdateMarginPoolConfigArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				marginPoolConfig: TransactionArgument,
				marginPoolCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Updates margin pool config */
export function updateMarginPoolConfig(options: UpdateMarginPoolConfigOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'marginPoolConfig', 'marginPoolCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'update_margin_pool_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AdminInjectCapitalArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface AdminInjectCapitalOptions {
	package?: string;
	arguments:
		| AdminInjectCapitalArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Inject capital into the margin pool without minting supplier shares. */
export function adminInjectCapital(options: AdminInjectCapitalOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'admin_inject_capital',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintSupplierCapArguments {
	registry: RawTransactionArgument<string>;
}
export interface MintSupplierCapOptions {
	package?: string;
	arguments: MintSupplierCapArguments | [registry: RawTransactionArgument<string>];
}
/**
 * Mint a new SupplierCap, which is used to supply and withdraw from margin pools.
 * One SupplierCap can be used to supply and withdraw from multiple margin pools.
 */
export function mintSupplierCap(options: MintSupplierCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'mint_supplier_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SupplyArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	supplierCap: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
	referral: RawTransactionArgument<string | null>;
}
export interface SupplyOptions {
	package?: string;
	arguments:
		| SupplyArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				supplierCap: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
				referral: RawTransactionArgument<string | null>,
		  ];
	typeArguments: [string];
}
/**
 * Supply to the margin pool using a SupplierCap. Returns the new supply shares.
 * The `referral` parameter should be the ID of a SupplyReferral object if referral
 * tracking is desired.
 */
export function supply(options: SupplyOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'0x1::option::Option<0x2::object::ID>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'supplierCap', 'coin', 'referral'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	supplierCap: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint | null>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				supplierCap: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string];
}
/** Withdraw from the margin pool using a SupplierCap. Returns the withdrawn coin. */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'supplierCap', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintSupplyReferralArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
}
export interface MintSupplyReferralOptions {
	package?: string;
	arguments:
		| MintSupplyReferralArguments
		| [self: RawTransactionArgument<string>, registry: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Mint a supply referral. */
export function mintSupplyReferral(options: MintSupplyReferralOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'mint_supply_referral',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawReferralFeesArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	referral: RawTransactionArgument<string>;
}
export interface WithdrawReferralFeesOptions {
	package?: string;
	arguments:
		| WithdrawReferralFeesArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				referral: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Withdraw the referral fees. */
export function withdrawReferralFees(options: WithdrawReferralFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'referral'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'withdraw_referral_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AdminWithdrawDefaultReferralFeesArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface AdminWithdrawDefaultReferralFeesOptions {
	package?: string;
	arguments:
		| AdminWithdrawDefaultReferralFeesArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Withdraw the default referral fees (admin only). The default referral at 0x0
 * doesn't have a SupplyReferral object,
 */
export function adminWithdrawDefaultReferralFees(options: AdminWithdrawDefaultReferralFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'admin_withdraw_default_referral_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawMaintainerFeesArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	marginPoolCap: RawTransactionArgument<string>;
}
export interface WithdrawMaintainerFeesOptions {
	package?: string;
	arguments:
		| WithdrawMaintainerFeesArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				marginPoolCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Withdraw the maintainer fees. The `margin_pool_cap` parameter is used to ensure
 * the correct margin pool is being withdrawn from.
 */
export function withdrawMaintainerFees(options: WithdrawMaintainerFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'marginPoolCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'withdraw_maintainer_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawProtocolFeesArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface WithdrawProtocolFeesOptions {
	package?: string;
	arguments:
		| WithdrawProtocolFeesArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Withdraw the protocol fees. */
export function withdrawProtocolFees(options: WithdrawProtocolFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'withdraw_protocol_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IdArguments {
	self: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the ID of the margin pool. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeepbookPoolAllowedArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface DeepbookPoolAllowedOptions {
	package?: string;
	arguments:
		| DeepbookPoolAllowedArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Return whether a margin manager for a given deepbook pool is allowed to borrow
 * from the margin pool.
 */
export function deepbookPoolAllowed(options: DeepbookPoolAllowedOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'deepbook_pool_allowed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TotalSupplyArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalSupplyOptions {
	package?: string;
	arguments: TotalSupplyArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current total supply of the margin pool. */
export function totalSupply(options: TotalSupplyOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TotalSupplyWithInterestArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalSupplyWithInterestOptions {
	package?: string;
	arguments: TotalSupplyWithInterestArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current total supply of the margin pool including accrued interest. */
export function totalSupplyWithInterest(options: TotalSupplyWithInterestOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'total_supply_with_interest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplySharesArguments {
	self: RawTransactionArgument<string>;
}
export interface SupplySharesOptions {
	package?: string;
	arguments: SupplySharesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current total supply shares of the margin pool. */
export function supplyShares(options: SupplySharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'supply_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyRatioArguments {
	self: RawTransactionArgument<string>;
}
export interface SupplyRatioOptions {
	package?: string;
	arguments: SupplyRatioArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current supply ratio of the margin pool. */
export function supplyRatio(options: SupplyRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'supply_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TotalBorrowArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalBorrowOptions {
	package?: string;
	arguments: TotalBorrowArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current total borrow of the margin pool. */
export function totalBorrow(options: TotalBorrowOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'total_borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowSharesArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowSharesOptions {
	package?: string;
	arguments: BorrowSharesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current total borrow shares of the margin pool. */
export function borrowShares(options: BorrowSharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'borrow_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowRatioArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowRatioOptions {
	package?: string;
	arguments: BorrowRatioArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current borrow ratio of the margin pool. */
export function borrowRatio(options: BorrowRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'borrow_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LastUpdateTimestampArguments {
	self: RawTransactionArgument<string>;
}
export interface LastUpdateTimestampOptions {
	package?: string;
	arguments: LastUpdateTimestampArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the last update timestamp of the margin pool. */
export function lastUpdateTimestamp(options: LastUpdateTimestampOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'last_update_timestamp',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyCapArguments {
	self: RawTransactionArgument<string>;
}
export interface SupplyCapOptions {
	package?: string;
	arguments: SupplyCapArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the supply cap of the margin pool. */
export function supplyCap(options: SupplyCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'supply_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProtocolFeesArguments {
	self: RawTransactionArgument<string>;
}
export interface ProtocolFeesOptions {
	package?: string;
	arguments: ProtocolFeesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current protocol fees of the margin pool. */
export function protocolFees(options: ProtocolFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'protocol_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MaxUtilizationRateArguments {
	self: RawTransactionArgument<string>;
}
export interface MaxUtilizationRateOptions {
	package?: string;
	arguments: MaxUtilizationRateArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current max utilization rate of the margin pool. */
export function maxUtilizationRate(options: MaxUtilizationRateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'max_utilization_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProtocolSpreadArguments {
	self: RawTransactionArgument<string>;
}
export interface ProtocolSpreadOptions {
	package?: string;
	arguments: ProtocolSpreadArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current protocol spread of the margin pool. */
export function protocolSpread(options: ProtocolSpreadOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'protocol_spread',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MinBorrowArguments {
	self: RawTransactionArgument<string>;
}
export interface MinBorrowOptions {
	package?: string;
	arguments: MinBorrowArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current min borrow of the margin pool. */
export function minBorrow(options: MinBorrowOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'min_borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InterestRateArguments {
	self: RawTransactionArgument<string>;
}
export interface InterestRateOptions {
	package?: string;
	arguments: InterestRateArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Return the current interest rate of the margin pool. Represented in 9 decimal
 * places.
 */
export function interestRate(options: InterestRateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'interest_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TrueInterestRateArguments {
	self: RawTransactionArgument<string>;
}
export interface TrueInterestRateOptions {
	package?: string;
	arguments: TrueInterestRateArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function trueInterestRate(options: TrueInterestRateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'true_interest_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UserSupplySharesArguments {
	self: RawTransactionArgument<string>;
	supplierCapId: RawTransactionArgument<string>;
}
export interface UserSupplySharesOptions {
	package?: string;
	arguments:
		| UserSupplySharesArguments
		| [self: RawTransactionArgument<string>, supplierCapId: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current user supply shares of the margin pool. */
export function userSupplyShares(options: UserSupplySharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'supplierCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'user_supply_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface VaultBalanceArguments {
	self: RawTransactionArgument<string>;
}
export interface VaultBalanceOptions {
	package?: string;
	arguments: VaultBalanceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current vault balance of the margin pool. */
export function vaultBalance(options: VaultBalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'vault_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UserSupplyAmountArguments {
	self: RawTransactionArgument<string>;
	supplierCapId: RawTransactionArgument<string>;
}
export interface UserSupplyAmountOptions {
	package?: string;
	arguments:
		| UserSupplyAmountArguments
		| [self: RawTransactionArgument<string>, supplierCapId: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the current user supply amount of the margin pool. */
export function userSupplyAmount(options: UserSupplyAmountOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'supplierCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'user_supply_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetAvailableWithdrawalArguments {
	self: RawTransactionArgument<string>;
}
export interface GetAvailableWithdrawalOptions {
	package?: string;
	arguments: GetAvailableWithdrawalArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the maximum amount that can be withdrawn without hitting rate limits */
export function getAvailableWithdrawal(options: GetAvailableWithdrawalOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'get_available_withdrawal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsRateLimitEnabledArguments {
	self: RawTransactionArgument<string>;
}
export interface IsRateLimitEnabledOptions {
	package?: string;
	arguments: IsRateLimitEnabledArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns whether rate limiting is enabled */
export function isRateLimitEnabled(options: IsRateLimitEnabledOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'is_rate_limit_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RateLimitCapacityArguments {
	self: RawTransactionArgument<string>;
}
export interface RateLimitCapacityOptions {
	package?: string;
	arguments: RateLimitCapacityArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the rate limit capacity (max bucket size) */
export function rateLimitCapacity(options: RateLimitCapacityOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'rate_limit_capacity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RateLimitRefillRatePerMsArguments {
	self: RawTransactionArgument<string>;
}
export interface RateLimitRefillRatePerMsOptions {
	package?: string;
	arguments: RateLimitRefillRatePerMsArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the rate limit refill rate per millisecond */
export function rateLimitRefillRatePerMs(options: RateLimitRefillRatePerMsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_pool',
			function: 'rate_limit_refill_rate_per_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
