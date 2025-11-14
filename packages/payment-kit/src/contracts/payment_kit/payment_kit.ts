// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct, MoveEnum, MoveTuple, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as vec_map from './deps/sui/vec_map.js';
import * as config from './config.js';
const $moduleName = '@mysten/payment-kit::payment_kit';
export const Namespace = new MoveStruct({
	name: `${$moduleName}::Namespace`,
	fields: {
		id: object.UID,
	},
});
export const PaymentRegistry = new MoveStruct({
	name: `${$moduleName}::PaymentRegistry`,
	fields: {
		id: object.UID,
		cap_id: bcs.Address,
		config: vec_map.VecMap(bcs.string(), config.Value),
		version: bcs.u16(),
	},
});
export const RegistryAdminCap = new MoveStruct({
	name: `${$moduleName}::RegistryAdminCap`,
	fields: {
		id: object.UID,
		registry_id: bcs.Address,
	},
});
/**
 * Enum representing the type of payment: Ephemeral (one-time) or Registry (tracked
 * in a registry).
 */
export const PaymentType = new MoveEnum({
	name: `${$moduleName}::PaymentType`,
	fields: {
		Ephemeral: null,
		Registry: bcs.Address,
	},
});
export const PaymentReceipt = new MoveStruct({
	name: `${$moduleName}::PaymentReceipt`,
	fields: {
		payment_type: PaymentType,
		nonce: bcs.string(),
		payment_amount: bcs.u64(),
		receiver: bcs.Address,
		coin_type: bcs.string(),
		timestamp_ms: bcs.u64(),
	},
});
export const PaymentKey = new MoveStruct({
	name: `${$moduleName}::PaymentKey`,
	fields: {
		nonce: bcs.string(),
		payment_amount: bcs.u64(),
		receiver: bcs.Address,
	},
});
export const PaymentRecord = new MoveStruct({
	name: `${$moduleName}::PaymentRecord`,
	fields: {
		epoch_at_time_of_record: bcs.u64(),
	},
});
export const BalanceKey = new MoveTuple({
	name: `${$moduleName}::BalanceKey`,
	fields: [bcs.bool()],
});
export interface CreateRegistryArguments {
	namespace: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
}
export interface CreateRegistryOptions {
	package?: string;
	arguments:
		| CreateRegistryArguments
		| [namespace: RawTransactionArgument<string>, name: RawTransactionArgument<string>];
}
/**
 * Creates a new payment registry with a supplied label. Label is used to derive
 * the registry's ID.
 */
export function createRegistry(options: CreateRegistryOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		`${packageAddress}::payment_kit::Namespace`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::ascii::String',
	] satisfies string[];
	const parameterNames = ['namespace', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'create_registry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProcessEphemeralPaymentArguments {
	nonce: RawTransactionArgument<string>;
	paymentAmount: RawTransactionArgument<number | bigint>;
	coin: RawTransactionArgument<string>;
	receiver: RawTransactionArgument<string>;
}
export interface ProcessEphemeralPaymentOptions {
	package?: string;
	arguments:
		| ProcessEphemeralPaymentArguments
		| [
				nonce: RawTransactionArgument<string>,
				paymentAmount: RawTransactionArgument<number | bigint>,
				coin: RawTransactionArgument<string>,
				receiver: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Processes a payment (without the use of a Registry), emitting a payment receipt
 * event.
 */
export function processEphemeralPayment(options: ProcessEphemeralPaymentOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::ascii::String',
		'u64',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		'address',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['nonce', 'paymentAmount', 'coin', 'receiver'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'process_ephemeral_payment',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProcessRegistryPaymentArguments {
	registry: RawTransactionArgument<string>;
	nonce: RawTransactionArgument<string>;
	paymentAmount: RawTransactionArgument<number | bigint>;
	coin: RawTransactionArgument<string>;
	receiver: RawTransactionArgument<string | null>;
}
export interface ProcessRegistryPaymentOptions {
	package?: string;
	arguments:
		| ProcessRegistryPaymentArguments
		| [
				registry: RawTransactionArgument<string>,
				nonce: RawTransactionArgument<string>,
				paymentAmount: RawTransactionArgument<number | bigint>,
				coin: RawTransactionArgument<string>,
				receiver: RawTransactionArgument<string | null>,
		  ];
	typeArguments: [string];
}
/**
 * Processes a payment via a payment registry, writing a receipt to the registry
 * and protecting from double spending for the same key.
 */
export function processRegistryPayment(options: ProcessRegistryPaymentOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		`${packageAddress}::payment_kit::PaymentRegistry`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::ascii::String',
		'u64',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['registry', 'nonce', 'paymentAmount', 'coin', 'receiver'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'process_registry_payment',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawFromRegistryArguments {
	registry: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface WithdrawFromRegistryOptions {
	package?: string;
	arguments:
		| WithdrawFromRegistryArguments
		| [registry: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * If the registry is configured to manage funds, withdraw all funds of the
 * specified coin from the registry.
 */
export function withdrawFromRegistry(options: WithdrawFromRegistryOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		`${packageAddress}::payment_kit::PaymentRegistry`,
		`${packageAddress}::payment_kit::RegistryAdminCap`,
	] satisfies string[];
	const parameterNames = ['registry', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'withdraw_from_registry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeletePaymentRecordArguments {
	registry: RawTransactionArgument<string>;
	paymentKey: RawTransactionArgument<string>;
}
export interface DeletePaymentRecordOptions {
	package?: string;
	arguments:
		| DeletePaymentRecordArguments
		| [registry: RawTransactionArgument<string>, paymentKey: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Removes an expired Payment Record from the Registry. */
export function deletePaymentRecord(options: DeletePaymentRecordOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		`${packageAddress}::payment_kit::PaymentRegistry`,
		`${packageAddress}::payment_kit::PaymentKey<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['registry', 'paymentKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'delete_payment_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreatePaymentKeyArguments {
	nonce: RawTransactionArgument<string>;
	paymentAmount: RawTransactionArgument<number | bigint>;
	receiver: RawTransactionArgument<string>;
}
export interface CreatePaymentKeyOptions {
	package?: string;
	arguments:
		| CreatePaymentKeyArguments
		| [
				nonce: RawTransactionArgument<string>,
				paymentAmount: RawTransactionArgument<number | bigint>,
				receiver: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Creates a PaymentKey from payment parameters. */
export function createPaymentKey(options: CreatePaymentKeyOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::ascii::String',
		'u64',
		'address',
	] satisfies string[];
	const parameterNames = ['nonce', 'paymentAmount', 'receiver'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'create_payment_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetConfigEpochExpirationDurationArguments {
	registry: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	epochExpirationDuration: RawTransactionArgument<number | bigint>;
}
export interface SetConfigEpochExpirationDurationOptions {
	package?: string;
	arguments:
		| SetConfigEpochExpirationDurationArguments
		| [
				registry: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				epochExpirationDuration: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Sets the epoch expiration duration configuration for the registry. If set,
 * payment records will expire after the specified number of epochs. If not set,
 * payment records will expire 30 epochs after their creation.
 */
export function setConfigEpochExpirationDuration(options: SetConfigEpochExpirationDurationOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		`${packageAddress}::payment_kit::PaymentRegistry`,
		`${packageAddress}::payment_kit::RegistryAdminCap`,
		'u64',
	] satisfies string[];
	const parameterNames = ['registry', 'cap', 'epochExpirationDuration'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'set_config_epoch_expiration_duration',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetConfigRegistryManagedFundsArguments {
	registry: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	registryManagedFunds: RawTransactionArgument<boolean>;
}
export interface SetConfigRegistryManagedFundsOptions {
	package?: string;
	arguments:
		| SetConfigRegistryManagedFundsArguments
		| [
				registry: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				registryManagedFunds: RawTransactionArgument<boolean>,
		  ];
}
/**
 * Sets whether the registry should manage funds itself. If true, payments
 * processed via the registry will be collected into the registry's balance. If
 * false, payments will be transferred directly to the specified receiver.
 */
export function setConfigRegistryManagedFunds(options: SetConfigRegistryManagedFundsOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [
		`${packageAddress}::payment_kit::PaymentRegistry`,
		`${packageAddress}::payment_kit::RegistryAdminCap`,
		'bool',
	] satisfies string[];
	const parameterNames = ['registry', 'cap', 'registryManagedFunds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'set_config_registry_managed_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ShareArguments {
	registry: RawTransactionArgument<string>;
}
export interface ShareOptions {
	package?: string;
	arguments: ShareArguments | [registry: RawTransactionArgument<string>];
}
/**
 * Enforce that a registry will always be shared.
 *
 * # Parameters
 *
 * - `registry` - The PaymentRegistry to share
 */
export function share(options: ShareOptions) {
	const packageAddress = options.package ?? '@mysten/payment-kit';
	const argumentsTypes = [`${packageAddress}::payment_kit::PaymentRegistry`] satisfies string[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment_kit',
			function: 'share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
