/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::transfer';
export const Receiving = new MoveStruct({
	name: `${$moduleName}::Receiving<phantom T>`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export interface TransferArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
	recipient: RawTransactionArgument<string>;
}
export interface TransferOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| TransferArguments<T>
		| [obj: RawTransactionArgument<T>, recipient: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Transfer ownership of `obj` to `recipient`. `obj` must have the `key` attribute,
 * which (in turn) ensures that `obj` has a globally unique ID. Note that if the
 * recipient address represents an object ID, the `obj` sent will be inaccessible
 * after the transfer (though they will be retrievable at a future date once new
 * features are added). This function has custom rules performed by the Sui Move
 * bytecode verifier that ensures that `T` is an object defined in the module where
 * `transfer` is invoked. Use `public_transfer` to transfer an object with `store`
 * outside of its module.
 */
export function transfer<T extends BcsType<any>>(options: TransferOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, 'address'] satisfies (string | null)[];
	const parameterNames = ['obj', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PublicTransferArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
	recipient: RawTransactionArgument<string>;
}
export interface PublicTransferOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| PublicTransferArguments<T>
		| [obj: RawTransactionArgument<T>, recipient: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Transfer ownership of `obj` to `recipient`. `obj` must have the `key` attribute,
 * which (in turn) ensures that `obj` has a globally unique ID. Note that if the
 * recipient address represents an object ID, the `obj` sent will be inaccessible
 * after the transfer (though they will be retrievable at a future date once new
 * features are added). The object must have `store` to be transferred outside of
 * its module.
 */
export function publicTransfer<T extends BcsType<any>>(options: PublicTransferOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, 'address'] satisfies (string | null)[];
	const parameterNames = ['obj', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PartyTransferArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
	party: RawTransactionArgument<string>;
}
export interface PartyTransferOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| PartyTransferArguments<T>
		| [obj: RawTransactionArgument<T>, party: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * NOT YET SUPPORTED ON MAINNET. The function will abort with `ENotSupported` if
 * used on a network where party objects are not yet supported. Transfer ownership
 * of `obj` to the `party`. This transfer behaves similar to both `transfer` and
 * `share_object`. It is similar to `transfer` in that the object is authorized for
 * use only by the recipient(s), in this case the `party`. This means that only the
 * members can use the object as an input to a transaction. It is similar to
 * `share_object` two ways. One in that the object can potentially be used by
 * anyone, as defined by the `default` permissions of the `Party` value. The other
 * in that the object must be used in consensus and cannot be used in the fast
 * path. This function has custom rules performed by the Sui Move bytecode verifier
 * that ensures that `T` is an object defined in the module where `transfer` is
 * invoked. Use `public_party_transfer` to transfer an object with `store` outside
 * of its module.
 */
export function partyTransfer<T extends BcsType<any>>(options: PartyTransferOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	const parameterNames = ['obj', 'party'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'party_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PublicPartyTransferArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
	party: RawTransactionArgument<string>;
}
export interface PublicPartyTransferOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| PublicPartyTransferArguments<T>
		| [obj: RawTransactionArgument<T>, party: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * NOT YET SUPPORTED ON MAINNET. The function will abort with `ENotSupported` if
 * used on a network where party objects are not yet supported. Transfer ownership
 * of `obj` to the `party`. This transfer behaves similar to both `transfer` and
 * `share_object`. It is similar to `transfer` in that the object is authorized for
 * use only by the recipient(s), in this case the `party`. This means that only the
 * members can use the object as an input to a transaction. It is similar to
 * `share_object` two ways. One in that the object can potentially be used by
 * anyone, as defined by the `default` permissions of the `Party` value. The other
 * in that the object must be used in consensus and cannot be used in the fast
 * path. The object must have `store` to be transferred outside of its module.
 */
export function publicPartyTransfer<T extends BcsType<any>>(
	options: PublicPartyTransferOptions<T>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	const parameterNames = ['obj', 'party'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_party_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FreezeObjectArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface FreezeObjectOptions<T extends BcsType<any>> {
	package: string;
	arguments: FreezeObjectArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Freeze `obj`. After freezing `obj` becomes immutable and can no longer be
 * transferred or mutated. This function has custom rules performed by the Sui Move
 * bytecode verifier that ensures that `T` is an object defined in the module where
 * `freeze_object` is invoked. Use `public_freeze_object` to freeze an object with
 * `store` outside of its module.
 */
export function freezeObject<T extends BcsType<any>>(options: FreezeObjectOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'freeze_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PublicFreezeObjectArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface PublicFreezeObjectOptions<T extends BcsType<any>> {
	package: string;
	arguments: PublicFreezeObjectArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Freeze `obj`. After freezing `obj` becomes immutable and can no longer be
 * transferred or mutated. The object must have `store` to be frozen outside of its
 * module.
 */
export function publicFreezeObject<T extends BcsType<any>>(options: PublicFreezeObjectOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_freeze_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ShareObjectArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface ShareObjectOptions<T extends BcsType<any>> {
	package: string;
	arguments: ShareObjectArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Turn the given object into a mutable shared object that everyone can access and
 * mutate. This is irreversible, i.e. once an object is shared, it will stay shared
 * forever. Aborts with `ESharedNonNewObject` of the object being shared was not
 * created in this transaction. This restriction may be relaxed in the future. This
 * function has custom rules performed by the Sui Move bytecode verifier that
 * ensures that `T` is an object defined in the module where `share_object` is
 * invoked. Use `public_share_object` to share an object with `store` outside of
 * its module.
 */
export function shareObject<T extends BcsType<any>>(options: ShareObjectOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'share_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PublicShareObjectArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface PublicShareObjectOptions<T extends BcsType<any>> {
	package: string;
	arguments: PublicShareObjectArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Turn the given object into a mutable shared object that everyone can access and
 * mutate. This is irreversible, i.e. once an object is shared, it will stay shared
 * forever. Aborts with `ESharedNonNewObject` of the object being shared was not
 * created in this transaction. This restriction may be relaxed in the future. The
 * object must have `store` to be shared outside of its module.
 */
export function publicShareObject<T extends BcsType<any>>(options: PublicShareObjectOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_share_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReceiveArguments {
	parent: RawTransactionArgument<string>;
	toReceive: RawTransactionArgument<string>;
}
export interface ReceiveOptions {
	package: string;
	arguments:
		| ReceiveArguments
		| [parent: RawTransactionArgument<string>, toReceive: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Given mutable (i.e., locked) access to the `parent` and a `Receiving` argument
 * referencing an object of type `T` owned by `parent` use the `to_receive`
 * argument to receive and return the referenced owned object of type `T`. This
 * function has custom rules performed by the Sui Move bytecode verifier that
 * ensures that `T` is an object defined in the module where `receive` is invoked.
 * Use `public_receive` to receivne an object with `store` outside of its module.
 */
export function receive(options: ReceiveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', null] satisfies (string | null)[];
	const parameterNames = ['parent', 'toReceive'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'receive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PublicReceiveArguments {
	parent: RawTransactionArgument<string>;
	toReceive: RawTransactionArgument<string>;
}
export interface PublicReceiveOptions {
	package: string;
	arguments:
		| PublicReceiveArguments
		| [parent: RawTransactionArgument<string>, toReceive: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Given mutable (i.e., locked) access to the `parent` and a `Receiving` argument
 * referencing an object of type `T` owned by `parent` use the `to_receive`
 * argument to receive and return the referenced owned object of type `T`. The
 * object must have `store` to be received outside of its defining module.
 */
export function publicReceive(options: PublicReceiveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', null] satisfies (string | null)[];
	const parameterNames = ['parent', 'toReceive'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'public_receive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReceivingObjectIdArguments {
	receiving: RawTransactionArgument<string>;
}
export interface ReceivingObjectIdOptions {
	package: string;
	arguments: ReceivingObjectIdArguments | [receiving: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the object ID that the given `Receiving` argument references. */
export function receivingObjectId(options: ReceivingObjectIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['receiving'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'transfer',
			function: 'receiving_object_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
