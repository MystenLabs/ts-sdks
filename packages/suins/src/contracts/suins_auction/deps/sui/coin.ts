/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `Coin` type - platform wide representation of fungible tokens and
 * coins. `Coin` can be described as a secure wrapper around `Balance` type.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance_1 from './balance.js';
import * as url from './url.js';
const $moduleName = '0x2::coin';
export const Coin = new MoveStruct({
	name: `${$moduleName}::Coin<phantom T>`,
	fields: {
		id: bcs.Address,
		balance: balance_1.Balance,
	},
});
export const CoinMetadata = new MoveStruct({
	name: `${$moduleName}::CoinMetadata<phantom T>`,
	fields: {
		id: bcs.Address,
		/**
		 * Number of decimal places the coin uses. A coin with `value ` N and `decimals` D
		 * should be shown as N / 10^D E.g., a coin with `value` 7002 and decimals 3 should
		 * be displayed as 7.002 This is metadata for display usage only.
		 */
		decimals: bcs.u8(),
		/** Name for the token */
		name: bcs.string(),
		/** Symbol for the token */
		symbol: bcs.string(),
		/** Description of the token */
		description: bcs.string(),
		/** URL for the token logo */
		icon_url: bcs.option(url.Url),
	},
});
export const RegulatedCoinMetadata = new MoveStruct({
	name: `${$moduleName}::RegulatedCoinMetadata<phantom T>`,
	fields: {
		id: bcs.Address,
		/** The ID of the coin's CoinMetadata object. */
		coin_metadata_object: bcs.Address,
		/** The ID of the coin's DenyCap object. */
		deny_cap_object: bcs.Address,
	},
});
export const TreasuryCap = new MoveStruct({
	name: `${$moduleName}::TreasuryCap<phantom T>`,
	fields: {
		id: bcs.Address,
		total_supply: balance_1.Supply,
	},
});
export const DenyCapV2 = new MoveStruct({
	name: `${$moduleName}::DenyCapV2<phantom T>`,
	fields: {
		id: bcs.Address,
		allow_global_pause: bcs.bool(),
	},
});
export const CurrencyCreated = new MoveStruct({
	name: `${$moduleName}::CurrencyCreated<phantom T>`,
	fields: {
		decimals: bcs.u8(),
	},
});
export const DenyCap = new MoveStruct({
	name: `${$moduleName}::DenyCap<phantom T>`,
	fields: {
		id: bcs.Address,
	},
});
export interface TotalSupplyArguments {
	cap: RawTransactionArgument<string>;
}
export interface TotalSupplyOptions {
	package: string;
	arguments: TotalSupplyArguments | [cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the total number of `T`'s in circulation. */
export function totalSupply(options: TotalSupplyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TreasuryIntoSupplyArguments {
	treasury: RawTransactionArgument<string>;
}
export interface TreasuryIntoSupplyOptions {
	package: string;
	arguments: TreasuryIntoSupplyArguments | [treasury: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Unwrap `TreasuryCap` getting the `Supply`.
 *
 * Operation is irreversible. Supply cannot be converted into a `TreasuryCap` due
 * to different security guarantees (TreasuryCap can be created only once for a
 * type)
 */
export function treasuryIntoSupply(options: TreasuryIntoSupplyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['treasury'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'treasury_into_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyImmutArguments {
	treasury: RawTransactionArgument<string>;
}
export interface SupplyImmutOptions {
	package: string;
	arguments: SupplyImmutArguments | [treasury: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get immutable reference to the treasury's `Supply`. */
export function supplyImmut(options: SupplyImmutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['treasury'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'supply_immut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyMutArguments {
	treasury: RawTransactionArgument<string>;
}
export interface SupplyMutOptions {
	package: string;
	arguments: SupplyMutArguments | [treasury: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get mutable reference to the treasury's `Supply`. */
export function supplyMut(options: SupplyMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['treasury'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'supply_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ValueArguments {
	self: RawTransactionArgument<string>;
}
export interface ValueOptions {
	package: string;
	arguments: ValueArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Public getter for the coin's value */
export function value(options: ValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceArguments {
	coin: RawTransactionArgument<string>;
}
export interface BalanceOptions {
	package: string;
	arguments: BalanceArguments | [coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get immutable reference to the balance of a coin. */
export function balance(options: BalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceMutArguments {
	coin: RawTransactionArgument<string>;
}
export interface BalanceMutOptions {
	package: string;
	arguments: BalanceMutArguments | [coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get a mutable reference to the balance of a coin. */
export function balanceMut(options: BalanceMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'balance_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FromBalanceArguments {
	balance: RawTransactionArgument<string>;
}
export interface FromBalanceOptions {
	package: string;
	arguments: FromBalanceArguments | [balance: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Wrap a balance into a Coin to make it transferable. */
export function fromBalance(options: FromBalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'from_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IntoBalanceArguments {
	coin: RawTransactionArgument<string>;
}
export interface IntoBalanceOptions {
	package: string;
	arguments: IntoBalanceArguments | [coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destruct a Coin wrapper and keep the balance. */
export function intoBalance(options: IntoBalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'into_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TakeArguments {
	balance: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface TakeOptions {
	package: string;
	arguments:
		| TakeArguments
		| [balance: RawTransactionArgument<string>, value: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/** Take a `Coin` worth of `value` from `Balance`. Aborts if `value > balance.value` */
export function take(options: TakeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['balance', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'take',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PutArguments {
	balance: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface PutOptions {
	package: string;
	arguments:
		| PutArguments
		| [balance: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Put a `Coin<T>` to the `Balance<T>`. */
export function put(options: PutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['balance', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'put',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RedeemFundsArguments {
	withdrawal: RawTransactionArgument<string>;
}
export interface RedeemFundsOptions {
	package: string;
	arguments: RedeemFundsArguments | [withdrawal: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Redeem a `Withdrawal<Balance<T>>` and create a `Coin<T>` from the withdrawn
 * Balance<T>.
 */
export function redeemFunds(options: RedeemFundsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['withdrawal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'redeem_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SendFundsArguments {
	coin: RawTransactionArgument<string>;
	recipient: RawTransactionArgument<string>;
}
export interface SendFundsOptions {
	package: string;
	arguments:
		| SendFundsArguments
		| [coin: RawTransactionArgument<string>, recipient: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Send a coin to an address balance */
export function sendFunds(options: SendFundsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['coin', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'send_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface JoinArguments {
	self: RawTransactionArgument<string>;
	c: RawTransactionArgument<string>;
}
export interface JoinOptions {
	package: string;
	arguments:
		| JoinArguments
		| [self: RawTransactionArgument<string>, c: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Consume the coin `c` and add its value to `self`. Aborts if
 * `c.value + self.value > U64_MAX`
 */
export function join(options: JoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'c'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SplitArguments {
	self: RawTransactionArgument<string>;
	splitAmount: RawTransactionArgument<number | bigint>;
}
export interface SplitOptions {
	package: string;
	arguments:
		| SplitArguments
		| [self: RawTransactionArgument<string>, splitAmount: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Split coin `self` to two coins, one with balance `split_amount`, and the
 * remaining balance is left is `self`.
 */
export function split(options: SplitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'splitAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DivideIntoNArguments {
	self: RawTransactionArgument<string>;
	n: RawTransactionArgument<number | bigint>;
}
export interface DivideIntoNOptions {
	package: string;
	arguments:
		| DivideIntoNArguments
		| [self: RawTransactionArgument<string>, n: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Split coin `self` into `n - 1` coins with equal balances. The remainder is left
 * in `self`. Return newly created coins.
 */
export function divideIntoN(options: DivideIntoNOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'n'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'divide_into_n',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ZeroOptions {
	package: string;
	arguments?: [];
	typeArguments: [string];
}
/**
 * Make any Coin with a zero value. Useful for placeholding bids/payments or
 * preemptively making empty balances.
 */
export function zero(options: ZeroOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'zero',
			typeArguments: options.typeArguments,
		});
}
export interface DestroyZeroArguments {
	c: RawTransactionArgument<string>;
}
export interface DestroyZeroOptions {
	package: string;
	arguments: DestroyZeroArguments | [c: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destroy a coin with value zero */
export function destroyZero(options: DestroyZeroOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['c'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'destroy_zero',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateCurrencyArguments<T extends BcsType<any>> {
	witness: RawTransactionArgument<T>;
	decimals: RawTransactionArgument<number>;
	symbol: RawTransactionArgument<number[]>;
	name: RawTransactionArgument<number[]>;
	description: RawTransactionArgument<number[]>;
	iconUrl: RawTransactionArgument<string | null>;
}
export interface CreateCurrencyOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| CreateCurrencyArguments<T>
		| [
				witness: RawTransactionArgument<T>,
				decimals: RawTransactionArgument<number>,
				symbol: RawTransactionArgument<number[]>,
				name: RawTransactionArgument<number[]>,
				description: RawTransactionArgument<number[]>,
				iconUrl: RawTransactionArgument<string | null>,
		  ];
	typeArguments: [string];
}
/**
 * Create a new currency type `T` as and return the `TreasuryCap` for `T` to the
 * caller. Can only be called with a `one-time-witness` type, ensuring that there's
 * only one `TreasuryCap` per `T`.
 */
export function createCurrency<T extends BcsType<any>>(options: CreateCurrencyOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'0x1::option::Option<null>',
	] satisfies (string | null)[];
	const parameterNames = ['witness', 'decimals', 'symbol', 'name', 'description', 'iconUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'create_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateRegulatedCurrencyV2Arguments<T extends BcsType<any>> {
	witness: RawTransactionArgument<T>;
	decimals: RawTransactionArgument<number>;
	symbol: RawTransactionArgument<number[]>;
	name: RawTransactionArgument<number[]>;
	description: RawTransactionArgument<number[]>;
	iconUrl: RawTransactionArgument<string | null>;
	allowGlobalPause: RawTransactionArgument<boolean>;
}
export interface CreateRegulatedCurrencyV2Options<T extends BcsType<any>> {
	package: string;
	arguments:
		| CreateRegulatedCurrencyV2Arguments<T>
		| [
				witness: RawTransactionArgument<T>,
				decimals: RawTransactionArgument<number>,
				symbol: RawTransactionArgument<number[]>,
				name: RawTransactionArgument<number[]>,
				description: RawTransactionArgument<number[]>,
				iconUrl: RawTransactionArgument<string | null>,
				allowGlobalPause: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string];
}
/**
 * This creates a new currency, via `create_currency`, but with an extra capability
 * that allows for specific addresses to have their coins frozen. When an address
 * is added to the deny list, it is immediately unable to interact with the
 * currency's coin as input objects. Additionally at the start of the next epoch,
 * they will be unable to receive the currency's coin. The `allow_global_pause`
 * flag enables an additional API that will cause all addresses to be denied. Note
 * however, that this doesn't affect per-address entries of the deny list and will
 * not change the result of the "contains" APIs.
 */
export function createRegulatedCurrencyV2<T extends BcsType<any>>(
	options: CreateRegulatedCurrencyV2Options<T>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'0x1::option::Option<null>',
		'bool',
	] satisfies (string | null)[];
	const parameterNames = [
		'witness',
		'decimals',
		'symbol',
		'name',
		'description',
		'iconUrl',
		'allowGlobalPause',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'create_regulated_currency_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateRegulatedCurrencyToV2Arguments {
	cap: RawTransactionArgument<string>;
	allowGlobalPause: RawTransactionArgument<boolean>;
}
export interface MigrateRegulatedCurrencyToV2Options {
	package: string;
	arguments:
		| MigrateRegulatedCurrencyToV2Arguments
		| [cap: RawTransactionArgument<string>, allowGlobalPause: RawTransactionArgument<boolean>];
	typeArguments: [string];
}
/**
 * Given the `DenyCap` for a regulated currency, migrate it to the new `DenyCapV2`
 * type. All entries in the deny list will be migrated to the new format. See
 * `create_regulated_currency_v2` for details on the new v2 of the deny list.
 */
export function migrateRegulatedCurrencyToV2(options: MigrateRegulatedCurrencyToV2Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['cap', 'allowGlobalPause'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'migrate_regulated_currency_to_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintArguments {
	cap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface MintOptions {
	package: string;
	arguments:
		| MintArguments
		| [cap: RawTransactionArgument<string>, value: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/** Create a coin worth `value` and increase the total supply in `cap` accordingly. */
export function mint(options: MintOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['cap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'mint',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintBalanceArguments {
	cap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface MintBalanceOptions {
	package: string;
	arguments:
		| MintBalanceArguments
		| [cap: RawTransactionArgument<string>, value: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Mint some amount of T as a `Balance` and increase the total supply in `cap`
 * accordingly. Aborts if `value` + `cap.total_supply` >= U64_MAX
 */
export function mintBalance(options: MintBalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['cap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'mint_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BurnArguments {
	cap: RawTransactionArgument<string>;
	c: RawTransactionArgument<string>;
}
export interface BurnOptions {
	package: string;
	arguments:
		| BurnArguments
		| [cap: RawTransactionArgument<string>, c: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destroy the coin `c` and decrease the total supply in `cap` accordingly. */
export function burn(options: BurnOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['cap', 'c'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2AddArguments {
	DenyCap: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface DenyListV2AddOptions {
	package: string;
	arguments:
		| DenyListV2AddArguments
		| [DenyCap: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Adds the given address to the deny list, preventing it from interacting with the
 * specified coin type as an input to a transaction. Additionally at the start of
 * the next epoch, the address will be unable to receive objects of this coin type.
 */
export function denyListV2Add(options: DenyListV2AddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null, 'address'] satisfies (string | null)[];
	const parameterNames = ['DenyCap', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2RemoveArguments {
	DenyCap: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface DenyListV2RemoveOptions {
	package: string;
	arguments:
		| DenyListV2RemoveArguments
		| [DenyCap: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Removes an address from the deny list. Similar to `deny_list_v2_add`, the effect
 * for input objects will be immediate, but the effect for receiving objects will
 * be delayed until the next epoch.
 */
export function denyListV2Remove(options: DenyListV2RemoveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null, 'address'] satisfies (string | null)[];
	const parameterNames = ['DenyCap', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2ContainsCurrentEpochArguments {
	addr: RawTransactionArgument<string>;
}
export interface DenyListV2ContainsCurrentEpochOptions {
	package: string;
	arguments: DenyListV2ContainsCurrentEpochArguments | [addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Check if the deny list contains the given address for the current epoch. Denied
 * addresses in the current epoch will be unable to receive objects of this coin
 * type.
 */
export function denyListV2ContainsCurrentEpoch(options: DenyListV2ContainsCurrentEpochOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', 'address'] satisfies (string | null)[];
	const parameterNames = ['addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_contains_current_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2ContainsNextEpochArguments {
	addr: RawTransactionArgument<string>;
}
export interface DenyListV2ContainsNextEpochOptions {
	package: string;
	arguments: DenyListV2ContainsNextEpochArguments | [addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Check if the deny list contains the given address for the next epoch. Denied
 * addresses in the next epoch will immediately be unable to use objects of this
 * coin type as inputs. At the start of the next epoch, the address will be unable
 * to receive objects of this coin type.
 */
export function denyListV2ContainsNextEpoch(options: DenyListV2ContainsNextEpochOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', 'address'] satisfies (string | null)[];
	const parameterNames = ['addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_contains_next_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2EnableGlobalPauseArguments {
	denyCap: RawTransactionArgument<string>;
}
export interface DenyListV2EnableGlobalPauseOptions {
	package: string;
	arguments: DenyListV2EnableGlobalPauseArguments | [denyCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Enable the global pause for the given coin type. This will immediately prevent
 * all addresses from using objects of this coin type as inputs. At the start of
 * the next epoch, all addresses will be unable to receive objects of this coin
 * type.
 */
export function denyListV2EnableGlobalPause(options: DenyListV2EnableGlobalPauseOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null] satisfies (string | null)[];
	const parameterNames = ['denyCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_enable_global_pause',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2DisableGlobalPauseArguments {
	denyCap: RawTransactionArgument<string>;
}
export interface DenyListV2DisableGlobalPauseOptions {
	package: string;
	arguments: DenyListV2DisableGlobalPauseArguments | [denyCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Disable the global pause for the given coin type. This will immediately allow
 * all addresses to resume using objects of this coin type as inputs. However,
 * receiving objects of this coin type will still be paused until the start of the
 * next epoch.
 */
export function denyListV2DisableGlobalPause(options: DenyListV2DisableGlobalPauseOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null] satisfies (string | null)[];
	const parameterNames = ['denyCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_disable_global_pause',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2IsGlobalPauseEnabledCurrentEpochArguments {}
export interface DenyListV2IsGlobalPauseEnabledCurrentEpochOptions {
	package: string;
	arguments?: DenyListV2IsGlobalPauseEnabledCurrentEpochArguments | [];
	typeArguments: [string];
}
/**
 * Check if the global pause is enabled for the given coin type in the current
 * epoch.
 */
export function denyListV2IsGlobalPauseEnabledCurrentEpoch(
	options: DenyListV2IsGlobalPauseEnabledCurrentEpochOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_is_global_pause_enabled_current_epoch',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListV2IsGlobalPauseEnabledNextEpochArguments {}
export interface DenyListV2IsGlobalPauseEnabledNextEpochOptions {
	package: string;
	arguments?: DenyListV2IsGlobalPauseEnabledNextEpochArguments | [];
	typeArguments: [string];
}
/** Check if the global pause is enabled for the given coin type in the next epoch. */
export function denyListV2IsGlobalPauseEnabledNextEpoch(
	options: DenyListV2IsGlobalPauseEnabledNextEpochOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_v2_is_global_pause_enabled_next_epoch',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintAndTransferArguments {
	c: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	recipient: RawTransactionArgument<string>;
}
export interface MintAndTransferOptions {
	package: string;
	arguments:
		| MintAndTransferArguments
		| [
				c: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				recipient: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Mint `amount` of `Coin` and send it to `recipient`. Invokes `mint()`. */
export function mintAndTransfer(options: MintAndTransferOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64', 'address'] satisfies (string | null)[];
	const parameterNames = ['c', 'amount', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'mint_and_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateNameArguments {
	Treasury: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
}
export interface UpdateNameOptions {
	package: string;
	arguments:
		| UpdateNameArguments
		| [
				Treasury: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update name of the coin in `CoinMetadata` */
export function updateName(options: UpdateNameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['Treasury', 'metadata', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateSymbolArguments {
	Treasury: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
	symbol: RawTransactionArgument<string>;
}
export interface UpdateSymbolOptions {
	package: string;
	arguments:
		| UpdateSymbolArguments
		| [
				Treasury: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
				symbol: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update the symbol of the coin in `CoinMetadata` */
export function updateSymbol(options: UpdateSymbolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['Treasury', 'metadata', 'symbol'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_symbol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateDescriptionArguments {
	Treasury: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
	description: RawTransactionArgument<string>;
}
export interface UpdateDescriptionOptions {
	package: string;
	arguments:
		| UpdateDescriptionArguments
		| [
				Treasury: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update the description of the coin in `CoinMetadata` */
export function updateDescription(options: UpdateDescriptionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['Treasury', 'metadata', 'description'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateIconUrlArguments {
	Treasury: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
	url: RawTransactionArgument<string>;
}
export interface UpdateIconUrlOptions {
	package: string;
	arguments:
		| UpdateIconUrlArguments
		| [
				Treasury: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
				url: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update the url of the coin in `CoinMetadata` */
export function updateIconUrl(options: UpdateIconUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['Treasury', 'metadata', 'url'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'update_icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetDecimalsArguments {
	metadata: RawTransactionArgument<string>;
}
export interface GetDecimalsOptions {
	package: string;
	arguments: GetDecimalsArguments | [metadata: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getDecimals(options: GetDecimalsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_decimals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetNameArguments {
	metadata: RawTransactionArgument<string>;
}
export interface GetNameOptions {
	package: string;
	arguments: GetNameArguments | [metadata: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getName(options: GetNameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetSymbolArguments {
	metadata: RawTransactionArgument<string>;
}
export interface GetSymbolOptions {
	package: string;
	arguments: GetSymbolArguments | [metadata: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getSymbol(options: GetSymbolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_symbol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetDescriptionArguments {
	metadata: RawTransactionArgument<string>;
}
export interface GetDescriptionOptions {
	package: string;
	arguments: GetDescriptionArguments | [metadata: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getDescription(options: GetDescriptionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetIconUrlArguments {
	metadata: RawTransactionArgument<string>;
}
export interface GetIconUrlOptions {
	package: string;
	arguments: GetIconUrlArguments | [metadata: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getIconUrl(options: GetIconUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'get_icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyArguments {
	treasury: RawTransactionArgument<string>;
}
export interface SupplyOptions {
	package: string;
	arguments: SupplyArguments | [treasury: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function supply(options: SupplyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['treasury'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateRegulatedCurrencyArguments<T extends BcsType<any>> {
	witness: RawTransactionArgument<T>;
	decimals: RawTransactionArgument<number>;
	symbol: RawTransactionArgument<number[]>;
	name: RawTransactionArgument<number[]>;
	description: RawTransactionArgument<number[]>;
	iconUrl: RawTransactionArgument<string | null>;
}
export interface CreateRegulatedCurrencyOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| CreateRegulatedCurrencyArguments<T>
		| [
				witness: RawTransactionArgument<T>,
				decimals: RawTransactionArgument<number>,
				symbol: RawTransactionArgument<number[]>,
				name: RawTransactionArgument<number[]>,
				description: RawTransactionArgument<number[]>,
				iconUrl: RawTransactionArgument<string | null>,
		  ];
	typeArguments: [string];
}
/**
 * This creates a new currency, via `create_currency`, but with an extra capability
 * that allows for specific addresses to have their coins frozen. Those addresses
 * cannot interact with the coin as input objects.
 */
export function createRegulatedCurrency<T extends BcsType<any>>(
	options: CreateRegulatedCurrencyOptions<T>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'0x1::option::Option<null>',
	] satisfies (string | null)[];
	const parameterNames = ['witness', 'decimals', 'symbol', 'name', 'description', 'iconUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'create_regulated_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListAddArguments {
	DenyCap: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface DenyListAddOptions {
	package: string;
	arguments:
		| DenyListAddArguments
		| [DenyCap: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Adds the given address to the deny list, preventing it from interacting with the
 * specified coin type as an input to a transaction.
 */
export function denyListAdd(options: DenyListAddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null, 'address'] satisfies (string | null)[];
	const parameterNames = ['DenyCap', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListRemoveArguments {
	DenyCap: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface DenyListRemoveOptions {
	package: string;
	arguments:
		| DenyListRemoveArguments
		| [DenyCap: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Removes an address from the deny list. Aborts with `ENotFrozen` if the address
 * is not already in the list.
 */
export function denyListRemove(options: DenyListRemoveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', null, 'address'] satisfies (string | null)[];
	const parameterNames = ['DenyCap', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyListContainsArguments {
	addr: RawTransactionArgument<string>;
}
export interface DenyListContainsOptions {
	package: string;
	arguments: DenyListContainsArguments | [addr: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Returns true iff the given address is denied for the given coin type. It will
 * return false if given a non-coin type.
 */
export function denyListContains(options: DenyListContainsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::deny_list::DenyList', 'address'] satisfies (string | null)[];
	const parameterNames = ['addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin',
			function: 'deny_list_contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
