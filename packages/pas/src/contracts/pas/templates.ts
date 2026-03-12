/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Template stores all the Command templates for PAS.
 *
 * This is the lookup point for PTB resolution on the client-side! There's no
 * versioning enforcement here, as this is purely an off-chain used endpoint.
 */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';

const $moduleName = '@mysten/pas::templates';
export const PAS = new MoveStruct({
	name: `${$moduleName}::PAS`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Templates = new MoveStruct({
	name: `${$moduleName}::Templates`,
	fields: {
		id: bcs.Address,
	},
});
export interface SetupArguments {
	namespace: RawTransactionArgument<string>;
}
export interface SetupOptions {
	package?: string;
	arguments: SetupArguments | [namespace: RawTransactionArgument<string>];
}
/** Create the templates registry */
export function setup(options: SetupOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['namespace'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'templates',
			function: 'setup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateCommandArguments {
	templates: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	command: RawTransactionArgument<string>;
}
export interface SetTemplateCommandOptions {
	package?: string;
	arguments:
		| SetTemplateCommandArguments
		| [
				templates: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				command: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Sets the PTB template for a given Action. */
export function setTemplateCommand(options: SetTemplateCommandOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['templates', '_', 'command'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'templates',
			function: 'set_template_command',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnsetTemplateCommandArguments {
	templates: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
}
export interface UnsetTemplateCommandOptions {
	package?: string;
	arguments:
		| UnsetTemplateCommandArguments
		| [templates: RawTransactionArgument<string>, _: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function unsetTemplateCommand(options: UnsetTemplateCommandOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['templates', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'templates',
			function: 'unset_template_command',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
