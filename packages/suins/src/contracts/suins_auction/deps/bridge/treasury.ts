/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object_bag from '../sui/object_bag.js';
import * as vec_map from '../sui/vec_map.js';
import * as type_name from '../suins_auction/type_name.js';
import * as bag from '../sui/bag.js';
import * as _package from '../sui/package.js';
const $moduleName = 'bridge::treasury';
export const BridgeTokenMetadata = new MoveStruct({
	name: `${$moduleName}::BridgeTokenMetadata`,
	fields: {
		id: bcs.u8(),
		decimal_multiplier: bcs.u64(),
		notional_value: bcs.u64(),
		native_token: bcs.bool(),
	},
});
export const BridgeTreasury = new MoveStruct({
	name: `${$moduleName}::BridgeTreasury`,
	fields: {
		treasuries: object_bag.ObjectBag,
		supported_tokens: vec_map.VecMap(type_name.TypeName, BridgeTokenMetadata),
		id_token_type_map: vec_map.VecMap(bcs.u8(), type_name.TypeName),
		waiting_room: bag.Bag,
	},
});
export const ForeignTokenRegistration = new MoveStruct({
	name: `${$moduleName}::ForeignTokenRegistration`,
	fields: {
		type_name: type_name.TypeName,
		uc: _package.UpgradeCap,
		decimal: bcs.u8(),
	},
});
export const UpdateTokenPriceEvent = new MoveStruct({
	name: `${$moduleName}::UpdateTokenPriceEvent`,
	fields: {
		token_id: bcs.u8(),
		new_price: bcs.u64(),
	},
});
export const NewTokenEvent = new MoveStruct({
	name: `${$moduleName}::NewTokenEvent`,
	fields: {
		token_id: bcs.u8(),
		type_name: type_name.TypeName,
		native_token: bcs.bool(),
		decimal_multiplier: bcs.u64(),
		notional_value: bcs.u64(),
	},
});
export const TokenRegistrationEvent = new MoveStruct({
	name: `${$moduleName}::TokenRegistrationEvent`,
	fields: {
		type_name: type_name.TypeName,
		decimal: bcs.u8(),
		native_token: bcs.bool(),
	},
});
export interface TokenIdArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenIdOptions {
	package: string;
	arguments: TokenIdArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function tokenId(options: TokenIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'treasury',
			function: 'token_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DecimalMultiplierArguments {
	self: RawTransactionArgument<string>;
}
export interface DecimalMultiplierOptions {
	package: string;
	arguments: DecimalMultiplierArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function decimalMultiplier(options: DecimalMultiplierOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'treasury',
			function: 'decimal_multiplier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NotionalValueArguments {
	self: RawTransactionArgument<string>;
}
export interface NotionalValueOptions {
	package: string;
	arguments: NotionalValueArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function notionalValue(options: NotionalValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'treasury',
			function: 'notional_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
