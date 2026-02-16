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
const $moduleName = 'bridge::chain_ids';
export const BridgeRoute = new MoveStruct({
	name: `${$moduleName}::BridgeRoute`,
	fields: {
		source: bcs.u8(),
		destination: bcs.u8(),
	},
});
export interface SuiMainnetOptions {
	package: string;
	arguments?: [];
}
export function suiMainnet(options: SuiMainnetOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'sui_mainnet',
		});
}
export interface SuiTestnetOptions {
	package: string;
	arguments?: [];
}
export function suiTestnet(options: SuiTestnetOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'sui_testnet',
		});
}
export interface SuiCustomOptions {
	package: string;
	arguments?: [];
}
export function suiCustom(options: SuiCustomOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'sui_custom',
		});
}
export interface EthMainnetOptions {
	package: string;
	arguments?: [];
}
export function ethMainnet(options: EthMainnetOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'eth_mainnet',
		});
}
export interface EthSepoliaOptions {
	package: string;
	arguments?: [];
}
export function ethSepolia(options: EthSepoliaOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'eth_sepolia',
		});
}
export interface EthCustomOptions {
	package: string;
	arguments?: [];
}
export function ethCustom(options: EthCustomOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'eth_custom',
		});
}
export interface RouteSourceArguments {
	route: RawTransactionArgument<string>;
}
export interface RouteSourceOptions {
	package: string;
	arguments: RouteSourceArguments | [route: RawTransactionArgument<string>];
}
export function routeSource(options: RouteSourceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['route'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'route_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RouteDestinationArguments {
	route: RawTransactionArgument<string>;
}
export interface RouteDestinationOptions {
	package: string;
	arguments: RouteDestinationArguments | [route: RawTransactionArgument<string>];
}
export function routeDestination(options: RouteDestinationOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['route'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'route_destination',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertValidChainIdArguments {
	id: RawTransactionArgument<number>;
}
export interface AssertValidChainIdOptions {
	package: string;
	arguments: AssertValidChainIdArguments | [id: RawTransactionArgument<number>];
}
export function assertValidChainId(options: AssertValidChainIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'assert_valid_chain_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidRoutesOptions {
	package: string;
	arguments?: [];
}
export function validRoutes(options: ValidRoutesOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'valid_routes',
		});
}
export interface IsValidRouteArguments {
	source: RawTransactionArgument<number>;
	destination: RawTransactionArgument<number>;
}
export interface IsValidRouteOptions {
	package: string;
	arguments:
		| IsValidRouteArguments
		| [source: RawTransactionArgument<number>, destination: RawTransactionArgument<number>];
}
export function isValidRoute(options: IsValidRouteOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u8'] satisfies (string | null)[];
	const parameterNames = ['source', 'destination'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'is_valid_route',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetRouteArguments {
	source: RawTransactionArgument<number>;
	destination: RawTransactionArgument<number>;
}
export interface GetRouteOptions {
	package: string;
	arguments:
		| GetRouteArguments
		| [source: RawTransactionArgument<number>, destination: RawTransactionArgument<number>];
}
export function getRoute(options: GetRouteOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u8'] satisfies (string | null)[];
	const parameterNames = ['source', 'destination'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'chain_ids',
			function: 'get_route',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
