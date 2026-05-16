/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: ptb */

import {
	MoveTuple,
	MoveStruct,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import {
	type Transaction as Transaction_1,
	type TransactionArgument,
} from '@mysten/sui/transactions';
const $moduleName = '@mysten/ptb::ptb';
export const Command = new MoveTuple({
	name: `${$moduleName}::Command`,
	fields: [bcs.u8(), bcs.vector(bcs.u8())],
});
export const Transaction = new MoveStruct({
	name: `${$moduleName}::Transaction`,
	fields: {
		commands: bcs.vector(Command),
	},
});
/**
 * Defines a simplified `ObjectArg` type for the `Transaction`.
 *
 * Differences with canonical Sui `ObjectArg` type:
 *
 * - Uses `address` type as a fixed-length sequence of bytes without length prefix.
 * - Extends the number of variants to support off-chain resolution.
 */
export const ObjectArg = new MoveEnum({
	name: `${$moduleName}::ObjectArg`,
	fields: {
		ImmOrOwnedObject: new MoveStruct({
			name: `ObjectArg.ImmOrOwnedObject`,
			fields: {
				object_id: bcs.Address,
				sequence_number: bcs.u64(),
				digest: bcs.Address,
			},
		}),
		SharedObject: new MoveStruct({
			name: `ObjectArg.SharedObject`,
			fields: {
				object_id: bcs.Address,
				initial_shared_version: bcs.u64(),
				is_mutable: bcs.bool(),
			},
		}),
		Receiving: new MoveStruct({
			name: `ObjectArg.Receiving`,
			fields: {
				object_id: bcs.Address,
				sequence_number: bcs.u64(),
				digest: bcs.Address,
			},
		}),
		Ext: bcs.string(),
	},
});
export const WithdrawFrom = new MoveEnum({
	name: `${$moduleName}::WithdrawFrom`,
	fields: {
		Sender: null,
		Sponsor: null,
	},
});
/**
 * Defines a simplified `CallArg` type for `Transaction`.
 *
 * Differences with canonical Sui `CallArg` type:
 *
 * - ObjectArg is a simplified, unresolved representation of Object arguments;
 * - Ext(...) is a custom extension for the `CallArg` which allows off-chain
 *   resolvers to convert them into the appropriate values for context.
 */
export const CallArg = new MoveEnum({
	name: `${$moduleName}::CallArg`,
	fields: {
		Pure: bcs.vector(bcs.u8()),
		Object: ObjectArg,
		FundsWithdrawal: new MoveStruct({
			name: `CallArg.FundsWithdrawal`,
			fields: {
				amount: bcs.u64(),
				type_name: bcs.string(),
				withdraw_from: WithdrawFrom,
			},
		}),
		/**
		 * Extended arguments for off-chain resolution. Can be created and registered in a
		 * transaction through `ext_input`.
		 *
		 * Extended arguments are namespaced by Type associated with them. In an
		 * application, this can be the root object, or a special type used for off chain
		 * resolution.
		 */
		Ext: new MoveTuple({ name: `CallArg.Ext`, fields: [bcs.string(), bcs.string()] }),
	},
});
/** Defines a simplified `Argument` type for the `Transaction`. */
export const Argument = new MoveEnum({
	name: `${$moduleName}::Argument`,
	fields: {
		GasCoin: null,
		Input: CallArg,
		Result: bcs.u16(),
		NestedResult: new MoveTuple({ name: `Argument.NestedResult`, fields: [bcs.u16(), bcs.u16()] }),
		/**
		 * Extended arguments for off-chain resolution. Cannot be constructed directly,
		 * only through future extensions.
		 */
		Ext: bcs.vector(bcs.u8()),
	},
});
export const MoveCall = new MoveStruct({
	name: `${$moduleName}::MoveCall`,
	fields: {
		package_id: bcs.string(),
		module_name: bcs.string(),
		function: bcs.string(),
		arguments: bcs.vector(Argument),
		type_arguments: bcs.vector(bcs.string()),
	},
});
export const TransferObjects = new MoveStruct({
	name: `${$moduleName}::TransferObjects`,
	fields: {
		objects: bcs.vector(Argument),
		to: Argument,
	},
});
export const SplitCoins = new MoveStruct({
	name: `${$moduleName}::SplitCoins`,
	fields: {
		coin: Argument,
		amounts: bcs.vector(Argument),
	},
});
export const MergeCoins = new MoveStruct({
	name: `${$moduleName}::MergeCoins`,
	fields: {
		coin: Argument,
		coins: bcs.vector(Argument),
	},
});
export const Publish = new MoveStruct({
	name: `${$moduleName}::Publish`,
	fields: {
		modules_bytes: bcs.vector(bcs.vector(bcs.u8())),
		dependencies: bcs.vector(bcs.Address),
	},
});
export const MakeMoveVec = new MoveStruct({
	name: `${$moduleName}::MakeMoveVec`,
	fields: {
		element_type: bcs.option(bcs.string()),
		elements: bcs.vector(Argument),
	},
});
export const Upgrade = new MoveStruct({
	name: `${$moduleName}::Upgrade`,
	fields: {
		modules_bytes: bcs.vector(bcs.vector(bcs.u8())),
		dependencies: bcs.vector(bcs.Address),
		object_id: bcs.Address,
		upgrade_ticket: Argument,
	},
});
export interface NewOptions {
	package?: string;
	arguments?: [];
}
/** Create a new Transaction builder. */
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'new',
		});
}
export interface ClockOptions {
	package?: string;
	arguments?: [];
}
/** Shorthand for `object_by_id` with `0x6` (Clock). */
export function clock(options: ClockOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'clock',
		});
}
export interface RandomOptions {
	package?: string;
	arguments?: [];
}
/** Shorthand for `object_by_id` with `0x8` (Random). */
export function random(options: RandomOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'random',
		});
}
export interface DisplayOptions {
	package?: string;
	arguments?: [];
}
/** Shorthand for `object_by_id` with `0xD` (DisplayRegistry). */
export function display(options: DisplayOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'display',
		});
}
export interface DenyListOptions {
	package?: string;
	arguments?: [];
}
/** Shorthand for `object_by_id` with `0x403` (DenyList). */
export function denyList(options: DenyListOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'deny_list',
		});
}
export interface CoinRegistryOptions {
	package?: string;
	arguments?: [];
}
/** Shorthand for `object_by_id` with `0xC` (CoinRegistry). */
export function coinRegistry(options: CoinRegistryOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'coin_registry',
		});
}
export interface AccumulatorRootOptions {
	package?: string;
	arguments?: [];
}
/** Shorthand for `object_by_id` with `0xACC` (AccumulatorRoot). */
export function accumulatorRoot(options: AccumulatorRootOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'accumulator_root',
		});
}
export interface GasOptions {
	package?: string;
	arguments?: [];
}
/** Create a gas coin input. */
export function gas(options: GasOptions = {}) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'gas',
		});
}
export interface PureArguments<T extends BcsType<any>> {
	value: RawTransactionArgument<T>;
}
export interface PureOptions<T extends BcsType<any>> {
	package?: string;
	arguments: PureArguments<T> | [value: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Create a pure input. */
export function pure<T extends BcsType<any>>(options: PureOptions<T>) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['value'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'pure',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ObjectRefArguments {
	objectId: RawTransactionArgument<string>;
	sequenceNumber: RawTransactionArgument<number | bigint>;
	digest: RawTransactionArgument<string>;
}
export interface ObjectRefOptions {
	package?: string;
	arguments:
		| ObjectRefArguments
		| [
				objectId: RawTransactionArgument<string>,
				sequenceNumber: RawTransactionArgument<number | bigint>,
				digest: RawTransactionArgument<string>,
		  ];
}
/**
 * Create a fully-resolved immutable or owned object argument. Should be used with
 * caution, yet for immutable or owned objects refs can be stored. For automatic
 * version resolution, use `object_by_id`.
 */
export function objectRef(options: ObjectRefOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x2::object::ID', 'u64', 'address'] satisfies (string | null)[];
	const parameterNames = ['objectId', 'sequenceNumber', 'digest'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'object_ref',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SharedObjectRefArguments {
	objectId: RawTransactionArgument<string>;
	initialSharedVersion: RawTransactionArgument<number | bigint>;
	isMutable: RawTransactionArgument<boolean>;
}
export interface SharedObjectRefOptions {
	package?: string;
	arguments:
		| SharedObjectRefArguments
		| [
				objectId: RawTransactionArgument<string>,
				initialSharedVersion: RawTransactionArgument<number | bigint>,
				isMutable: RawTransactionArgument<boolean>,
		  ];
}
/**
 * Create a fully-resolved shared object argument. Should be used with caution, yet
 * for shared objects refs can be stored. For automatic version resolution, use
 * `shared_object_by_id`.
 *
 * TODO: should it be named `consensus_managed_object_ref`? NOTE: the naming is
 * changing elsewhere
 */
export function sharedObjectRef(options: SharedObjectRefOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x2::object::ID', 'u64', 'bool'] satisfies (string | null)[];
	const parameterNames = ['objectId', 'initialSharedVersion', 'isMutable'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'shared_object_ref',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceivingObjectRefArguments {
	objectId: RawTransactionArgument<string>;
	sequenceNumber: RawTransactionArgument<number | bigint>;
	digest: RawTransactionArgument<string>;
}
export interface ReceivingObjectRefOptions {
	package?: string;
	arguments:
		| ReceivingObjectRefArguments
		| [
				objectId: RawTransactionArgument<string>,
				sequenceNumber: RawTransactionArgument<number | bigint>,
				digest: RawTransactionArgument<string>,
		  ];
}
/**
 * Create a fully-resolved receiving object argument. Should be used with caution,
 * since the version of the object is dynamic. For automatic version resolution,
 * use `object_by_id`.
 */
export function receivingObjectRef(options: ReceivingObjectRefOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x2::object::ID', 'u64', 'address'] satisfies (string | null)[];
	const parameterNames = ['objectId', 'sequenceNumber', 'digest'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'receiving_object_ref',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ObjectByTypeOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/** Create an off-chain input handler for a given type T. */
export function objectByType(options: ObjectByTypeOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'object_by_type',
			typeArguments: options.typeArguments,
		});
}
export interface ObjectByTypeStringArguments {
	typeName: RawTransactionArgument<string>;
}
export interface ObjectByTypeStringOptions {
	package?: string;
	arguments: ObjectByTypeStringArguments | [typeName: RawTransactionArgument<string>];
}
/** Create an off-chain input handler for a given type as a String. */
export function objectByTypeString(options: ObjectByTypeStringOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['typeName'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'object_by_type_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ObjectByIdArguments {
	id: RawTransactionArgument<string>;
}
export interface ObjectByIdOptions {
	package?: string;
	arguments: ObjectByIdArguments | [id: RawTransactionArgument<string>];
}
/** Create an off-chain input handler for an object with a specific ID. */
export function objectById(options: ObjectByIdOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'object_by_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceivingObjectByIdArguments {
	id: RawTransactionArgument<string>;
}
export interface ReceivingObjectByIdOptions {
	package?: string;
	arguments: ReceivingObjectByIdArguments | [id: RawTransactionArgument<string>];
}
/** Create an off-chain input handler for a receiving object with a specific ID. */
export function receivingObjectById(options: ReceivingObjectByIdOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'receiving_object_by_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtInputArguments {
	name: RawTransactionArgument<string>;
}
export interface ExtInputOptions {
	package?: string;
	arguments: ExtInputArguments | [name: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Create an external input handler. Expected to be understood by the off-chain
 * tooling.
 */
export function extInput(options: ExtInputOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['name'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'ext_input',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExtInputRawArguments {
	namespace: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
}
export interface ExtInputRawOptions {
	package?: string;
	arguments:
		| ExtInputRawArguments
		| [namespace: RawTransactionArgument<string>, name: RawTransactionArgument<string>];
}
/**
 * Create an external input handler for a given type T. This can be used to
 * hardcode the namespace value without having access to `T`.
 */
export function extInputRaw(options: ExtInputRawOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x1::string::String', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['namespace', 'name'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'ext_input_raw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CommandArguments {
	self: TransactionArgument;
	command: TransactionArgument;
}
export interface CommandOptions {
	package?: string;
	arguments: CommandArguments | [self: TransactionArgument, command: TransactionArgument];
}
/**
 * Register a command in the Transaction builder. Returns the Argument, which is
 * treated as the `Result(idx)` of the command, and can be turned into a nested
 * result `NestedResult(idx, idx)`.
 */
export function command(options: CommandOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'command'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'command',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NestedArguments {
	self: TransactionArgument;
	subIdx: RawTransactionArgument<number>;
}
export interface NestedOptions {
	package?: string;
	arguments: NestedArguments | [self: TransactionArgument, subIdx: RawTransactionArgument<number>];
}
/**
 * Spawn a nested result out of a (just) `Result`. Simple result is a command
 * output.
 */
export function nested(options: NestedOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [null, 'u16'] satisfies (string | null)[];
	const parameterNames = ['self', 'subIdx'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'nested',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MoveCallArguments {
	packageId: RawTransactionArgument<string>;
	moduleName: RawTransactionArgument<string>;
	function: RawTransactionArgument<string>;
	arguments: TransactionArgument;
	typeArguments: RawTransactionArgument<Array<string>>;
}
export interface MoveCallOptions {
	package?: string;
	arguments:
		| MoveCallArguments
		| [
				packageId: RawTransactionArgument<string>,
				moduleName: RawTransactionArgument<string>,
				function: RawTransactionArgument<string>,
				arguments: TransactionArgument,
				typeArguments: RawTransactionArgument<Array<string>>,
		  ];
}
/** Create a `MoveCall` command. */
export function moveCall(options: MoveCallOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'vector<null>',
		'vector<0x1::string::String>',
	] satisfies (string | null)[];
	const parameterNames = ['packageId', 'moduleName', 'function', 'arguments', 'typeArguments'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'move_call',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TransferObjectsArguments {
	objects: TransactionArgument;
	to: TransactionArgument;
}
export interface TransferObjectsOptions {
	package?: string;
	arguments: TransferObjectsArguments | [objects: TransactionArgument, to: TransactionArgument];
}
/**
 * Create a `TransferObjects` command Expects a vector of arguments to transfer and
 * an address value for destination.
 */
export function transferObjects(options: TransferObjectsOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['vector<null>', null] satisfies (string | null)[];
	const parameterNames = ['objects', 'to'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'transfer_objects',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SplitCoinsArguments {
	coin: TransactionArgument;
	amounts: TransactionArgument;
}
export interface SplitCoinsOptions {
	package?: string;
	arguments: SplitCoinsArguments | [coin: TransactionArgument, amounts: TransactionArgument];
}
/** Create a `SplitCoins` command. */
export function splitCoins(options: SplitCoinsOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [null, 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['coin', 'amounts'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'split_coins',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MergeCoinsArguments {
	coin: TransactionArgument;
	coins: TransactionArgument;
}
export interface MergeCoinsOptions {
	package?: string;
	arguments: MergeCoinsArguments | [coin: TransactionArgument, coins: TransactionArgument];
}
/**
 * Create a `MergeCoins` command. Takes a Coin Argument and a vector of other coin
 * arguments to merge into it.
 */
export function mergeCoins(options: MergeCoinsOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [null, 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['coin', 'coins'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'merge_coins',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PublishArguments {
	modulesBytes: RawTransactionArgument<Array<Array<number>>>;
	dependencies: RawTransactionArgument<Array<string>>;
}
export interface PublishOptions {
	package?: string;
	arguments:
		| PublishArguments
		| [
				modulesBytes: RawTransactionArgument<Array<Array<number>>>,
				dependencies: RawTransactionArgument<Array<string>>,
		  ];
}
/**
 * Create a `Publish` command. Takes a vector of modules' bytes and a vector of
 * dependencies.
 */
export function publish(options: PublishOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['vector<vector<u8>>', 'vector<0x2::object::ID>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['modulesBytes', 'dependencies'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'publish',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakeMoveVecArguments {
	elementType: RawTransactionArgument<string | null>;
	elements: TransactionArgument;
}
export interface MakeMoveVecOptions {
	package?: string;
	arguments:
		| MakeMoveVecArguments
		| [elementType: RawTransactionArgument<string | null>, elements: TransactionArgument];
}
/**
 * Create a `MakeMoveVec` command. Takes an optional element type and a vector of
 * elements to make into a vector.
 */
export function makeMoveVec(options: MakeMoveVecOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['0x1::option::Option<0x1::string::String>', 'vector<null>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['elementType', 'elements'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'make_move_vec',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpgradeArguments {
	modulesBytes: RawTransactionArgument<Array<Array<number>>>;
	dependencies: RawTransactionArgument<Array<string>>;
	objectId: RawTransactionArgument<string>;
	upgradeTicket: TransactionArgument;
}
export interface UpgradeOptions {
	package?: string;
	arguments:
		| UpgradeArguments
		| [
				modulesBytes: RawTransactionArgument<Array<Array<number>>>,
				dependencies: RawTransactionArgument<Array<string>>,
				objectId: RawTransactionArgument<string>,
				upgradeTicket: TransactionArgument,
		  ];
}
/**
 * Create a `Upgrade` command. Takes a vector of modules' bytes, a vector of
 * dependencies, an updated package ID, and an upgrade ticket.
 */
export function upgrade(options: UpgradeOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = [
		'vector<vector<u8>>',
		'vector<0x2::object::ID>',
		'0x2::object::ID',
		null,
	] satisfies (string | null)[];
	const parameterNames = ['modulesBytes', 'dependencies', 'objectId', 'upgradeTicket'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtArguments {
	data: RawTransactionArgument<Array<number>>;
}
export interface ExtOptions {
	package?: string;
	arguments: ExtArguments | [data: RawTransactionArgument<Array<number>>];
}
/** Create an `Ext` command. */
export function ext(options: ExtOptions) {
	const packageAddress = options.package ?? '@mysten/ptb';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['data'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ptb',
			function: 'ext',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
