/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pyth's upgraded Core entrypoints for `margin_manager`.
 *
 * Pyth Core is being replaced by a separately published package, so its
 * `PriceInfoObject` is a distinct Move type from the legacy one and the frozen
 * signatures in `margin_manager` can never accept it. The upgraded surface
 * therefore lives here, under the same function names. Each entry reads the
 * upgraded feed and delegates to the shared core in `margin_manager`, so both
 * feeds run identical logic.
 */

import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface AddConditionalOrderArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	conditionalOrderId: RawTransactionArgument<number | bigint>;
	condition: TransactionArgument;
	pendingOrder: TransactionArgument;
}
export interface AddConditionalOrderOptions {
	package?: string;
	arguments:
		| AddConditionalOrderArguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				conditionalOrderId: RawTransactionArgument<number | bigint>,
				condition: TransactionArgument,
				pendingOrder: TransactionArgument,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::add_conditional_order`. Edit both. */
export function addConditionalOrder(options: AddConditionalOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		null,
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'basePriceInfoObject',
		'quotePriceInfoObject',
		'registry',
		'conditionalOrderId',
		'condition',
		'pendingOrder',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'add_conditional_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExecuteConditionalOrdersV2Arguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	maxOrdersToExecute: RawTransactionArgument<number | bigint>;
}
export interface ExecuteConditionalOrdersV2Options {
	package?: string;
	arguments:
		| ExecuteConditionalOrdersV2Arguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				maxOrdersToExecute: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::execute_conditional_orders_v2`. Edit both. */
export function executeConditionalOrdersV2(options: ExecuteConditionalOrdersV2Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'basePriceInfoObject',
		'quotePriceInfoObject',
		'registry',
		'maxOrdersToExecute',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'execute_conditional_orders_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExecuteConditionalOrdersV3Arguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	maxOrdersToExecute: RawTransactionArgument<number | bigint>;
}
export interface ExecuteConditionalOrdersV3Options {
	package?: string;
	arguments:
		| ExecuteConditionalOrdersV3Arguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				maxOrdersToExecute: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::execute_conditional_orders_v3`. Edit both. */
export function executeConditionalOrdersV3(options: ExecuteConditionalOrdersV3Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'basePriceInfoObject',
		'quotePriceInfoObject',
		'registry',
		'maxOrdersToExecute',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'execute_conditional_orders_v3',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DepositArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface DepositOptions {
	package?: string;
	arguments:
		| DepositArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string, string];
}
/** Twin: `margin_manager::deposit`. Edit both. */
export function deposit(options: DepositOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['self', 'registry', 'baseOracle', 'quoteOracle', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'deposit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	withdrawAmount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				withdrawAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string, string];
}
/** Twin: `margin_manager::withdraw`. Edit both. */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'registry',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'pool',
		'withdrawAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowBaseArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	loanAmount: RawTransactionArgument<number | bigint>;
}
export interface BorrowBaseOptions {
	package?: string;
	arguments:
		| BorrowBaseArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				loanAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::borrow_base`. Edit both. */
export function borrowBase(options: BorrowBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'registry',
		'baseMarginPool',
		'baseOracle',
		'quoteOracle',
		'pool',
		'loanAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'borrow_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowQuoteArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	loanAmount: RawTransactionArgument<number | bigint>;
}
export interface BorrowQuoteOptions {
	package?: string;
	arguments:
		| BorrowQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				loanAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::borrow_quote`. Edit both. */
export function borrowQuote(options: BorrowQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'registry',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'pool',
		'loanAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'borrow_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LiquidateArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	marginPool: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	repayCoin: RawTransactionArgument<string>;
}
export interface LiquidateOptions {
	package?: string;
	arguments:
		| LiquidateArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				marginPool: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				repayCoin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string, string];
}
/** Twin: `margin_manager::liquidate`. Edit both. */
export function liquidate(options: LiquidateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'marginPool',
		'pool',
		'repayCoin',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'liquidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RiskRatioArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface RiskRatioOptions {
	package?: string;
	arguments:
		| RiskRatioArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::risk_ratio`. Edit both. */
export function riskRatio(options: RiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RiskRatioUnsafeArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface RiskRatioUnsafeOptions {
	package?: string;
	arguments:
		| RiskRatioUnsafeArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::risk_ratio_unsafe`. Edit both. */
export function riskRatioUnsafe(options: RiskRatioUnsafeOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'risk_ratio_unsafe',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ManagerStateArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface ManagerStateOptions {
	package?: string;
	arguments:
		| ManagerStateArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::manager_state`. Edit both. */
export function managerState(options: ManagerStateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'manager_state',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ManagerStatesArguments {
	marginManagers: TransactionArgument;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface ManagerStatesOptions {
	package?: string;
	arguments:
		| ManagerStatesArguments
		| [
				marginManagers: TransactionArgument,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Twin: `margin_manager::manager_states`. Edit both. */
export function managerStates(options: ManagerStatesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		'vector<null>',
		null,
		null,
		null,
		null,
		null,
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'marginManagers',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager_upgraded',
			function: 'manager_states',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
