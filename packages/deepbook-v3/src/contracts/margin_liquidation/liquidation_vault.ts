/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@deepbook/margin-liquidation::liquidation_vault';
export const LIQUIDATION_VAULT = new MoveStruct({
	name: `${$moduleName}::LIQUIDATION_VAULT`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const LiquidationVault = new MoveStruct({
	name: `${$moduleName}::LiquidationVault`,
	fields: {
		id: bcs.Address,
		vault: bag.Bag,
	},
});
export const BalanceKey = new MoveStruct({
	name: `${$moduleName}::BalanceKey<phantom T>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const AuthorizedTradersKey = new MoveStruct({
	name: `${$moduleName}::AuthorizedTradersKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const LiquidationAdminCap = new MoveStruct({
	name: `${$moduleName}::LiquidationAdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export const LiquidationByVault = new MoveStruct({
	name: `${$moduleName}::LiquidationByVault`,
	fields: {
		vault_id: bcs.Address,
		margin_manager_id: bcs.Address,
		margin_pool_id: bcs.Address,
		base_in: bcs.u64(),
		base_out: bcs.u64(),
		quote_in: bcs.u64(),
		quote_out: bcs.u64(),
		repay_balance_remaining: bcs.u64(),
		base_liquidation: bcs.bool(),
	},
});
export interface DepositArguments {
	self: RawTransactionArgument<string>;
	LiquidationCap: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface DepositOptions {
	package?: string;
	arguments:
		| DepositArguments
		| [
				self: RawTransactionArgument<string>,
				LiquidationCap: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
export function deposit(options: DepositOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'LiquidationCap', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'deposit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: RawTransactionArgument<string>;
	LiquidationCap: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [
				self: RawTransactionArgument<string>,
				LiquidationCap: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'LiquidationCap', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateLiquidationVaultArguments {
	LiquidationCap: RawTransactionArgument<string>;
}
export interface CreateLiquidationVaultOptions {
	package?: string;
	arguments: CreateLiquidationVaultArguments | [LiquidationCap: RawTransactionArgument<string>];
}
export function createLiquidationVault(options: CreateLiquidationVaultOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['LiquidationCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'create_liquidation_vault',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizeTraderArguments {
	self: RawTransactionArgument<string>;
	LiquidationCap: RawTransactionArgument<string>;
	authorizedAddress: RawTransactionArgument<string>;
}
export interface AuthorizeTraderOptions {
	package?: string;
	arguments:
		| AuthorizeTraderArguments
		| [
				self: RawTransactionArgument<string>,
				LiquidationCap: RawTransactionArgument<string>,
				authorizedAddress: RawTransactionArgument<string>,
		  ];
}
export function authorizeTrader(options: AuthorizeTraderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'LiquidationCap', 'authorizedAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'authorize_trader',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeauthorizeTraderArguments {
	self: RawTransactionArgument<string>;
	LiquidationCap: RawTransactionArgument<string>;
	authorizedAddress: RawTransactionArgument<string>;
}
export interface DeauthorizeTraderOptions {
	package?: string;
	arguments:
		| DeauthorizeTraderArguments
		| [
				self: RawTransactionArgument<string>,
				LiquidationCap: RawTransactionArgument<string>,
				authorizedAddress: RawTransactionArgument<string>,
		  ];
}
export function deauthorizeTrader(options: DeauthorizeTraderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'LiquidationCap', 'authorizedAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'deauthorize_trader',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SwapBaseToQuoteArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseIn: RawTransactionArgument<number | bigint>;
	deepIn: RawTransactionArgument<number | bigint>;
	minQuoteOut: RawTransactionArgument<number | bigint>;
}
export interface SwapBaseToQuoteOptions {
	package?: string;
	arguments:
		| SwapBaseToQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseIn: RawTransactionArgument<number | bigint>,
				deepIn: RawTransactionArgument<number | bigint>,
				minQuoteOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
export function swapBaseToQuote(options: SwapBaseToQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null, null, 'u64', 'u64', 'u64', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'pool', 'baseIn', 'deepIn', 'minQuoteOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'swap_base_to_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapQuoteToBaseArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	quoteIn: RawTransactionArgument<number | bigint>;
	deepIn: RawTransactionArgument<number | bigint>;
	minBaseOut: RawTransactionArgument<number | bigint>;
}
export interface SwapQuoteToBaseOptions {
	package?: string;
	arguments:
		| SwapQuoteToBaseArguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				quoteIn: RawTransactionArgument<number | bigint>,
				deepIn: RawTransactionArgument<number | bigint>,
				minBaseOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
export function swapQuoteToBase(options: SwapQuoteToBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null, null, 'u64', 'u64', 'u64', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'pool', 'quoteIn', 'deepIn', 'minBaseOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'swap_quote_to_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LiquidateBaseArguments {
	self: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	repayAmount: RawTransactionArgument<number | bigint | null>;
}
export interface LiquidateBaseOptions {
	package?: string;
	arguments:
		| LiquidateBaseArguments
		| [
				self: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				repayAmount: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string, string];
}
export function liquidateBase(options: LiquidateBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'marginManager',
		'registry',
		'baseOracle',
		'quoteOracle',
		'baseMarginPool',
		'quoteMarginPool',
		'pool',
		'repayAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'liquidate_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LiquidateQuoteArguments {
	self: RawTransactionArgument<string>;
	marginManager: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	repayAmount: RawTransactionArgument<number | bigint | null>;
}
export interface LiquidateQuoteOptions {
	package?: string;
	arguments:
		| LiquidateQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				marginManager: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				repayAmount: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string, string];
}
export function liquidateQuote(options: LiquidateQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'marginManager',
		'registry',
		'baseOracle',
		'quoteOracle',
		'baseMarginPool',
		'quoteMarginPool',
		'pool',
		'repayAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'liquidate_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceArguments {
	self: RawTransactionArgument<string>;
}
export interface BalanceOptions {
	package?: string;
	arguments: BalanceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function balance(options: BalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin-liquidation';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'liquidation_vault',
			function: 'balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
