/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@deepbook/margin::tpsl';
export const Condition = new MoveStruct({
	name: `${$moduleName}::Condition`,
	fields: {
		trigger_below_price: bcs.bool(),
		trigger_price: bcs.u64(),
	},
});
export const PendingOrder = new MoveStruct({
	name: `${$moduleName}::PendingOrder`,
	fields: {
		is_limit_order: bcs.bool(),
		client_order_id: bcs.u64(),
		order_type: bcs.option(bcs.u8()),
		self_matching_option: bcs.u8(),
		price: bcs.option(bcs.u64()),
		quantity: bcs.u64(),
		is_bid: bcs.bool(),
		pay_with_deep: bcs.bool(),
		expire_timestamp: bcs.option(bcs.u64()),
	},
});
export const ConditionalOrder = new MoveStruct({
	name: `${$moduleName}::ConditionalOrder`,
	fields: {
		conditional_order_id: bcs.u64(),
		condition: Condition,
		pending_order: PendingOrder,
	},
});
export const TakeProfitStopLoss = new MoveStruct({
	name: `${$moduleName}::TakeProfitStopLoss`,
	fields: {
		trigger_below: bcs.vector(ConditionalOrder),
		trigger_above: bcs.vector(ConditionalOrder),
	},
});
export const ConditionalOrderAdded = new MoveStruct({
	name: `${$moduleName}::ConditionalOrderAdded`,
	fields: {
		manager_id: bcs.Address,
		conditional_order_id: bcs.u64(),
		conditional_order: ConditionalOrder,
		timestamp: bcs.u64(),
	},
});
export const ConditionalOrderCancelled = new MoveStruct({
	name: `${$moduleName}::ConditionalOrderCancelled`,
	fields: {
		manager_id: bcs.Address,
		conditional_order_id: bcs.u64(),
		conditional_order: ConditionalOrder,
		timestamp: bcs.u64(),
	},
});
export const ConditionalOrderExecuted = new MoveStruct({
	name: `${$moduleName}::ConditionalOrderExecuted`,
	fields: {
		manager_id: bcs.Address,
		pool_id: bcs.Address,
		conditional_order_id: bcs.u64(),
		conditional_order: ConditionalOrder,
		timestamp: bcs.u64(),
	},
});
export const ConditionalOrderInsufficientFunds = new MoveStruct({
	name: `${$moduleName}::ConditionalOrderInsufficientFunds`,
	fields: {
		manager_id: bcs.Address,
		conditional_order_id: bcs.u64(),
		conditional_order: ConditionalOrder,
		timestamp: bcs.u64(),
	},
});
export const ConditionalOrderPriceOutOfBounds = new MoveStruct({
	name: `${$moduleName}::ConditionalOrderPriceOutOfBounds`,
	fields: {
		manager_id: bcs.Address,
		conditional_order_id: bcs.u64(),
		conditional_order: ConditionalOrder,
		timestamp: bcs.u64(),
	},
});
export const ConditionalOrderBelowLiquidation = new MoveStruct({
	name: `${$moduleName}::ConditionalOrderBelowLiquidation`,
	fields: {
		manager_id: bcs.Address,
		conditional_order_id: bcs.u64(),
		conditional_order: ConditionalOrder,
		timestamp: bcs.u64(),
	},
});
export interface NewConditionArguments {
	triggerBelowPrice: RawTransactionArgument<boolean>;
	triggerPrice: RawTransactionArgument<number | bigint>;
}
export interface NewConditionOptions {
	package?: string;
	arguments:
		| NewConditionArguments
		| [
				triggerBelowPrice: RawTransactionArgument<boolean>,
				triggerPrice: RawTransactionArgument<number | bigint>,
		  ];
}
export function newCondition(options: NewConditionOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = ['bool', 'u64'] satisfies (string | null)[];
	const parameterNames = ['triggerBelowPrice', 'triggerPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'new_condition',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewPendingLimitOrderArguments {
	clientOrderId: RawTransactionArgument<number | bigint>;
	orderType: RawTransactionArgument<number>;
	selfMatchingOption: RawTransactionArgument<number>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface NewPendingLimitOrderOptions {
	package?: string;
	arguments:
		| NewPendingLimitOrderArguments
		| [
				clientOrderId: RawTransactionArgument<number | bigint>,
				orderType: RawTransactionArgument<number>,
				selfMatchingOption: RawTransactionArgument<number>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Creates a new pending limit order. Order type must be no restriction or
 * immediate or cancel.
 */
export function newPendingLimitOrder(options: NewPendingLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = ['u64', 'u8', 'u8', 'u64', 'u64', 'bool', 'bool', 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'clientOrderId',
		'orderType',
		'selfMatchingOption',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'new_pending_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewPendingMarketOrderArguments {
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface NewPendingMarketOrderOptions {
	package?: string;
	arguments:
		| NewPendingMarketOrderArguments
		| [
				clientOrderId: RawTransactionArgument<number | bigint>,
				selfMatchingOption: RawTransactionArgument<number>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
}
/** Creates a new pending market order. */
export function newPendingMarketOrder(options: NewPendingMarketOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = ['u64', 'u8', 'u64', 'bool', 'bool'] satisfies (string | null)[];
	const parameterNames = [
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'new_pending_market_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TriggerBelowOrdersArguments {
	self: TransactionArgument;
}
export interface TriggerBelowOrdersOptions {
	package?: string;
	arguments: TriggerBelowOrdersArguments | [self: TransactionArgument];
}
export function triggerBelowOrders(options: TriggerBelowOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'trigger_below_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TriggerAboveOrdersArguments {
	self: TransactionArgument;
}
export interface TriggerAboveOrdersOptions {
	package?: string;
	arguments: TriggerAboveOrdersArguments | [self: TransactionArgument];
}
export function triggerAboveOrders(options: TriggerAboveOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'trigger_above_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NumConditionalOrdersArguments {
	self: TransactionArgument;
}
export interface NumConditionalOrdersOptions {
	package?: string;
	arguments: NumConditionalOrdersArguments | [self: TransactionArgument];
}
export function numConditionalOrders(options: NumConditionalOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'num_conditional_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ConditionalOrderIdArguments {
	conditionalOrder: TransactionArgument;
}
export interface ConditionalOrderIdOptions {
	package?: string;
	arguments: ConditionalOrderIdArguments | [conditionalOrder: TransactionArgument];
}
export function conditionalOrderId(options: ConditionalOrderIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['conditionalOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'conditional_order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetConditionalOrderArguments {
	self: TransactionArgument;
	conditionalOrderId: RawTransactionArgument<number | bigint>;
}
export interface GetConditionalOrderOptions {
	package?: string;
	arguments:
		| GetConditionalOrderArguments
		| [self: TransactionArgument, conditionalOrderId: RawTransactionArgument<number | bigint>];
}
export function getConditionalOrder(options: GetConditionalOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'conditionalOrderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'get_conditional_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ConditionArguments {
	conditionalOrder: TransactionArgument;
}
export interface ConditionOptions {
	package?: string;
	arguments: ConditionArguments | [conditionalOrder: TransactionArgument];
}
export function condition(options: ConditionOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['conditionalOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'condition',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PendingOrderArguments {
	conditionalOrder: TransactionArgument;
}
export interface PendingOrderOptions {
	package?: string;
	arguments: PendingOrderArguments | [conditionalOrder: TransactionArgument];
}
export function pendingOrder(options: PendingOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['conditionalOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'pending_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TriggerBelowPriceArguments {
	condition: TransactionArgument;
}
export interface TriggerBelowPriceOptions {
	package?: string;
	arguments: TriggerBelowPriceArguments | [condition: TransactionArgument];
}
export function triggerBelowPrice(options: TriggerBelowPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['condition'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'trigger_below_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TriggerPriceArguments {
	condition: TransactionArgument;
}
export interface TriggerPriceOptions {
	package?: string;
	arguments: TriggerPriceArguments | [condition: TransactionArgument];
}
export function triggerPrice(options: TriggerPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['condition'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'trigger_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClientOrderIdArguments {
	pendingOrder: TransactionArgument;
}
export interface ClientOrderIdOptions {
	package?: string;
	arguments: ClientOrderIdArguments | [pendingOrder: TransactionArgument];
}
export function clientOrderId(options: ClientOrderIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'client_order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderTypeArguments {
	pendingOrder: TransactionArgument;
}
export interface OrderTypeOptions {
	package?: string;
	arguments: OrderTypeArguments | [pendingOrder: TransactionArgument];
}
export function orderType(options: OrderTypeOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'order_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SelfMatchingOptionArguments {
	pendingOrder: TransactionArgument;
}
export interface SelfMatchingOptionOptions {
	package?: string;
	arguments: SelfMatchingOptionArguments | [pendingOrder: TransactionArgument];
}
export function selfMatchingOption(options: SelfMatchingOptionOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'self_matching_option',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PriceArguments {
	pendingOrder: TransactionArgument;
}
export interface PriceOptions {
	package?: string;
	arguments: PriceArguments | [pendingOrder: TransactionArgument];
}
export function price(options: PriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuantityArguments {
	pendingOrder: TransactionArgument;
}
export interface QuantityOptions {
	package?: string;
	arguments: QuantityArguments | [pendingOrder: TransactionArgument];
}
export function quantity(options: QuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsBidArguments {
	pendingOrder: TransactionArgument;
}
export interface IsBidOptions {
	package?: string;
	arguments: IsBidArguments | [pendingOrder: TransactionArgument];
}
export function isBid(options: IsBidOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'is_bid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PayWithDeepArguments {
	pendingOrder: TransactionArgument;
}
export interface PayWithDeepOptions {
	package?: string;
	arguments: PayWithDeepArguments | [pendingOrder: TransactionArgument];
}
export function payWithDeep(options: PayWithDeepOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'pay_with_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpireTimestampArguments {
	pendingOrder: TransactionArgument;
}
export interface ExpireTimestampOptions {
	package?: string;
	arguments: ExpireTimestampArguments | [pendingOrder: TransactionArgument];
}
export function expireTimestamp(options: ExpireTimestampOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'expire_timestamp',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsLimitOrderArguments {
	pendingOrder: TransactionArgument;
}
export interface IsLimitOrderOptions {
	package?: string;
	arguments: IsLimitOrderArguments | [pendingOrder: TransactionArgument];
}
export function isLimitOrder(options: IsLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pendingOrder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tpsl',
			function: 'is_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
