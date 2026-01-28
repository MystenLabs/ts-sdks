/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::transfer';
export const Receiving = new MoveStruct({
	name: `${$moduleName}::Receiving`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export interface TransferOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function transfer<T0 extends BcsType<any>>(options: TransferOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, 'address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PublicTransferOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function publicTransfer<T0 extends BcsType<any>>(options: PublicTransferOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, 'address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PartyTransferOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function partyTransfer<T0 extends BcsType<any>>(options: PartyTransferOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'party_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PublicPartyTransferOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function publicPartyTransfer<T0 extends BcsType<any>>(
	options: PublicPartyTransferOptions<T0>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_party_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FreezeObjectOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function freezeObject<T0 extends BcsType<any>>(options: FreezeObjectOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'freeze_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PublicFreezeObjectOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function publicFreezeObject<T0 extends BcsType<any>>(
	options: PublicFreezeObjectOptions<T0>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_freeze_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ShareObjectOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function shareObject<T0 extends BcsType<any>>(options: ShareObjectOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'share_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PublicShareObjectOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function publicShareObject<T0 extends BcsType<any>>(options: PublicShareObjectOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_share_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ReceiveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function receive(options: ReceiveOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['0x2::object::ID', null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'receive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PublicReceiveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function publicReceive(options: PublicReceiveOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['0x2::object::ID', null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_receive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ReceivingObjectIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function receivingObjectId(options: ReceivingObjectIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'receiving_object_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
