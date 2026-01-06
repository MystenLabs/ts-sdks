/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance_1 from './balance.js';
import * as url from './url.js';
const $moduleName = '0x2::coin';
export const Coin = new MoveStruct({
	name: `${$moduleName}::Coin`,
	fields: {
		id: bcs.Address,
		balance: balance_1.Balance,
	},
});
export const CoinMetadata = new MoveStruct({
	name: `${$moduleName}::CoinMetadata`,
	fields: {
		id: bcs.Address,
		decimals: bcs.u8(),
		name: bcs.string(),
		symbol: bcs.string(),
		description: bcs.string(),
		icon_url: bcs.option(url.Url),
	},
});
export const RegulatedCoinMetadata = new MoveStruct({
	name: `${$moduleName}::RegulatedCoinMetadata`,
	fields: {
		id: bcs.Address,
		coin_metadata_object: bcs.Address,
		deny_cap_object: bcs.Address,
	},
});
export const TreasuryCap = new MoveStruct({
	name: `${$moduleName}::TreasuryCap`,
	fields: {
		id: bcs.Address,
		total_supply: balance_1.Supply,
	},
});
export const DenyCapV2 = new MoveStruct({
	name: `${$moduleName}::DenyCapV2`,
	fields: {
		id: bcs.Address,
		allow_global_pause: bcs.bool(),
	},
});
export const CurrencyCreated = new MoveStruct({
	name: `${$moduleName}::CurrencyCreated`,
	fields: {
		decimals: bcs.u8(),
	},
});
export const DenyCap = new MoveStruct({
	name: `${$moduleName}::DenyCap`,
	fields: {
		id: bcs.Address,
	},
});
export interface TotalSupplyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function totalSupply(options: TotalSupplyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TreasuryIntoSupplyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function treasuryIntoSupply(options: TreasuryIntoSupplyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'treasury_into_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyImmutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function supplyImmut(options: SupplyImmutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'supply_immut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function supplyMut(options: SupplyMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'supply_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ValueOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function value(options: ValueOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function balance(options: BalanceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function balanceMut(options: BalanceMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'balance_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FromBalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function fromBalance(options: FromBalanceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::balance::Balance<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'from_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IntoBalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function intoBalance(options: IntoBalanceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'into_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TakeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function take(options: TakeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::balance::Balance<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'take',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function put(options: PutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::balance::Balance<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'put',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RedeemFundsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function redeemFunds(options: RedeemFundsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::funds_accumulator::Withdrawal<${packageAddress}::balance::Balance<${options.typeArguments[0]}>>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'redeem_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SendFundsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function sendFunds(options: SendFundsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'send_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface JoinOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function join(options: JoinOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SplitOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function split(options: SplitOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DivideIntoNOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function divideIntoN(options: DivideIntoNOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'divide_into_n',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ZeroOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function zero(options: ZeroOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'zero',
			typeArguments: options.typeArguments,
		});
}
export interface DestroyZeroOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function destroyZero(options: DestroyZeroOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'destroy_zero',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CreateCurrencyOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<string | null>,
	];
	typeArguments: [string];
}
export function createCurrency<T0 extends BcsType<any>>(options: CreateCurrencyOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		`0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<${packageAddress}::url::Url>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'create_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CreateRegulatedCurrencyV2Options<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<string | null>,
		RawTransactionArgument<boolean>,
	];
	typeArguments: [string];
}
export function createRegulatedCurrencyV2<T0 extends BcsType<any>>(
	options: CreateRegulatedCurrencyV2Options<T0>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		`0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<${packageAddress}::url::Url>`,
		'bool',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'create_regulated_currency_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateRegulatedCurrencyToV2Options {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<boolean>];
	typeArguments: [string];
}
export function migrateRegulatedCurrencyToV2(options: MigrateRegulatedCurrencyToV2Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCap<${options.typeArguments[0]}>`,
		'bool',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'migrate_regulated_currency_to_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MintOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function mint(options: MintOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'mint',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MintBalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
export function mintBalance(options: MintBalanceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'mint_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BurnOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function burn(options: BurnOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2AddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListV2Add(options: DenyListV2AddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCapV2<${options.typeArguments[0]}>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2RemoveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListV2Remove(options: DenyListV2RemoveOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCapV2<${options.typeArguments[0]}>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2ContainsCurrentEpochOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListV2ContainsCurrentEpoch(options: DenyListV2ContainsCurrentEpochOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::deny_list::DenyList`, 'address'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_contains_current_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2ContainsNextEpochOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListV2ContainsNextEpoch(options: DenyListV2ContainsNextEpochOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::deny_list::DenyList`, 'address'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_contains_next_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2EnableGlobalPauseOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListV2EnableGlobalPause(options: DenyListV2EnableGlobalPauseOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCapV2<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_enable_global_pause',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2DisableGlobalPauseOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListV2DisableGlobalPause(options: DenyListV2DisableGlobalPauseOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCapV2<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_disable_global_pause',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2IsGlobalPauseEnabledCurrentEpochOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function denyListV2IsGlobalPauseEnabledCurrentEpoch(
	options: DenyListV2IsGlobalPauseEnabledCurrentEpochOptions,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::deny_list::DenyList`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_is_global_pause_enabled_current_epoch',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2IsGlobalPauseEnabledNextEpochOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function denyListV2IsGlobalPauseEnabledNextEpoch(
	options: DenyListV2IsGlobalPauseEnabledNextEpochOptions,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::deny_list::DenyList`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_is_global_pause_enabled_next_epoch',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MintAndTransferOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function mintAndTransfer(options: MintAndTransferOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		'u64',
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'mint_and_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateNameOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function updateName(options: UpdateNameOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateSymbolOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function updateSymbol(options: UpdateSymbolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::ascii::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_symbol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateDescriptionOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function updateDescription(options: UpdateDescriptionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateIconUrlOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function updateIconUrl(options: UpdateIconUrlOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::ascii::String',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetDecimalsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getDecimals(options: GetDecimalsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_decimals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetNameOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getName(options: GetNameOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetSymbolOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getSymbol(options: GetSymbolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_symbol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetDescriptionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getDescription(options: GetDescriptionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetIconUrlOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getIconUrl(options: GetIconUrlOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::CoinMetadata<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function supply(options: SupplyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::TreasuryCap<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CreateRegulatedCurrencyOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<string | null>,
	];
	typeArguments: [string];
}
export function createRegulatedCurrency<T0 extends BcsType<any>>(
	options: CreateRegulatedCurrencyOptions<T0>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		`0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<${packageAddress}::url::Url>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'create_regulated_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListAddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListAdd(options: DenyListAddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCap<${options.typeArguments[0]}>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListRemoveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListRemove(options: DenyListRemoveOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::deny_list::DenyList`,
		`${packageAddress}::coin::DenyCap<${options.typeArguments[0]}>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListContainsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyListContains(options: DenyListContainsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::deny_list::DenyList`, 'address'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
