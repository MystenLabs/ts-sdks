// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClientTypes } from '@mysten/sui/client';
import { Inputs, TransactionCommands } from '@mysten/sui/transactions';
import type { Argument, CallArg, Command as SdkCommand } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';

import { TypeName } from './contracts/pas/deps/std/type_name.js';
import { Policy } from './contracts/pas/policy.js';
import { Command, MoveCall } from './contracts/ptb/ptb.js';
import { PASClientError } from './error.js';
import { Field } from './contracts/sui/dynamic_field.js';

const OBJECT_BY_ID_EXT = 'object_by_id';
const OBJECT_BY_TYPE_EXT = 'object_by_type';
const RECEIVING_BY_ID_EXT = 'receiving_by_id';

type ParsedTemplateCommand = ReturnType<typeof parseCommand>;

/**
 * Extracts all object IDs referenced by template commands, regardless of
 * how they are specified (fully resolved refs, shared refs, or ext lookups).
 */
export function collectTemplateObjectIds(commands: ParsedTemplateCommand[]): Set<string> {
	const ids = new Set<string>();
	for (const cmd of commands) {
		for (const arg of cmd.arguments) {
			const obj = arg.Input?.Object;
			if (!obj) continue;

			switch (obj.$kind) {
				case 'ImmOrOwnedObject':
					ids.add(obj.ImmOrOwnedObject.object_id);
					break;
				case 'SharedObject':
					ids.add(obj.SharedObject.object_id);
					break;
				case 'Receiving':
					ids.add(obj.Receiving.object_id);
					break;
				case 'Ext': {
					const [kind, value] = obj.Ext.split(':');
					switch (kind) {
						case OBJECT_BY_ID_EXT:
						case RECEIVING_BY_ID_EXT:
							ids.add(value);
							break;
						default:
							throw new PASClientError(`Unsupported external object kind: ${kind}`);
					}
					break;
				}
			}
		}
	}
	return ids;
}
/**
 * Supported PAS action types that can be resolved via Policies.
 */
export type PASActionType = 'send_funds' | 'unlock_funds' | 'clawback_funds';

/**
 * Parses the Policy object to extract the required approval type names for a given action.
 *
 * The Policy's `required_approvals` is a `VecMap<String, VecSet<TypeName>>` where:
 * - Key is the action name (e.g., "send_funds")
 * - Value is a set of approval TypeNames that must be satisfied
 *
 * @param policyObject - The Policy object fetched with content
 * @returns The list of approval TypeName strings for the given action, or undefined if not found
 */
export function getRequiredApprovals(
	policyObject: SuiClientTypes.Object<{ content: true }>,
	actionType: PASActionType,
): string[] | undefined {
	const policy = Policy.parse(policyObject.content);

	const entry = policy.required_approvals.contents.find((e) => e.key === actionType);

	if (!entry) return undefined;

	return entry.value.contents.map((tn) => tn.name);
}

/**
 * Parses a Command from a Template dynamic field object.
 *
 * Each Template DF is a `Field<TypeName, Command>` where:
 * - TypeName is the approval type (e.g., the `with_defining_ids` of `TransferApproval`)
 * - Command is the move call instruction to execute for that approval
 *
 * @param templateDF - The Template DF object fetched with content
 * @returns The parsed Command, or undefined if parsing fails
 */
export function getCommandFromTemplate(
	template: SuiClientTypes.Object<{ content: true }>,
): ParsedTemplateCommand {
	const df = Field(TypeName, Command).parse(template.content);
	return parseCommand(df.value);
}

function parseCommand([key, cmd]: ReturnType<typeof Command.parse>) {
	// Support only `Command` for now.
	if (key !== 0) throw new Error(`Unknown command type: ${key}`);

	// TODO: switch to support more commands like `TransferObjects` etc.
	return MoveCall.parse(new Uint8Array(cmd));
}

// ---------------------------------------------------------------------------
// Command builder (for use with TransactionDataBuilder / replaceCommand)
// ---------------------------------------------------------------------------

/**
 * Arguments for building a MoveCall Command from a template.
 * Used by the intent resolver which works directly with TransactionDataBuilder.
 */
interface RawCommandBuildArgs {
	/** Adds an input to the parent transaction and returns the Argument ref. */
	addInput: (type: 'object' | 'pure', arg: CallArg) => Argument;
	/** The sender account argument (already resolved) */
	senderAccount?: Argument;
	/** The receiver account argument (already resolved) */
	receiverAccount?: Argument;
	/** The policy argument (already resolved) */
	policy?: Argument;
	/** The request argument (already resolved) */
	request?: Argument;
	/** The system type T (e.g., "0x2::sui::SUI") */
	systemType?: string;
}

/**
 * Builds a `Command` (TransactionCommands.MoveCall) from a parsed template command,
 * suitable for use with `transactionData.replaceCommand()`.
 *
 * Resolves template argument placeholders (pas:request, pas:policy, etc.) into
 * concrete Argument references, and converts object/pure inputs via the provided
 * `addInput` callback.
 *
 * @param command - The parsed MoveCall from a template object
 * @param args - The resolved arguments and addInput helper
 * @returns A Command object ready for `replaceCommand`
 */
export function buildMoveCallCommandFromTemplate(
	command: ParsedTemplateCommand,
	args: RawCommandBuildArgs,
): SdkCommand {
	const resolvedArgs: Argument[] = [];

	for (const arg of command.arguments) {
		if (arg.Ext) throw new PASClientError(`There are no supported ext arguments in this client.`);
		else if (arg.GasCoin) throw new PASClientError(`Gas coin is not supported in PAS client.`);
		else if (arg.NestedResult)
			resolvedArgs.push({
				$kind: 'NestedResult',
				NestedResult: [arg.NestedResult[0], arg.NestedResult[1]],
			});
		else if (arg.Result) resolvedArgs.push({ $kind: 'Result', Result: arg.Result });
		else if (arg.Input) {
			if (arg.Input.Pure)
				resolvedArgs.push(args.addInput('pure', Inputs.Pure(new Uint8Array(arg.Input.Pure))));
			else if (arg.Input.Object) {
				switch (arg.Input.Object.$kind) {
					case 'ImmOrOwnedObject':
						resolvedArgs.push(
							args.addInput(
								'object',
								Inputs.ObjectRef({
									objectId: arg.Input.Object.ImmOrOwnedObject.object_id,
									version: arg.Input.Object.ImmOrOwnedObject.sequence_number,
									digest: arg.Input.Object.ImmOrOwnedObject.digest,
								}),
							),
						);
						break;
					case 'SharedObject':
						resolvedArgs.push(
							args.addInput(
								'object',
								Inputs.SharedObjectRef({
									objectId: arg.Input.Object.SharedObject.object_id,
									initialSharedVersion: arg.Input.Object.SharedObject.initial_shared_version,
									mutable: arg.Input.Object.SharedObject.is_mutable,
								}),
							),
						);
						break;
					case 'Receiving':
						resolvedArgs.push(
							args.addInput(
								'object',
								Inputs.ReceivingRef({
									objectId: arg.Input.Object.Receiving.object_id,
									version: arg.Input.Object.Receiving.sequence_number,
									digest: arg.Input.Object.Receiving.digest,
								}),
							),
						);
						break;
					case 'Ext':
						const [kind, value] = arg.Input.Object.Ext.split(':');

						switch (kind) {
							case OBJECT_BY_ID_EXT:
							case RECEIVING_BY_ID_EXT:
								resolvedArgs.push(
									args.addInput('object', {
										$kind: 'UnresolvedObject',
										UnresolvedObject: { objectId: value },
									} as CallArg),
								);
								break;
							case OBJECT_BY_TYPE_EXT:
								throw new PASClientError(
									`There are no supported object by type arguments in this client.`,
								);
							default:
								throw new PASClientError(`Unknown external object argument: ${kind}`);
						}
						break;
					default:
						throw new PASClientError(
							`Not supported object argument: ${JSON.stringify(arg.Input.Object)}`,
						);
				}
			} else if (arg.Input.Ext) {
				resolvedArgs.push(
					resolveRawPasRequest(args, {
						_namespace: arg.Input.Ext[0],
						value: arg.Input.Ext[1],
					}),
				);
			} else {
				throw new PASClientError(`Unsupported input kind: ${arg.Input.$kind}`);
			}
		}
	}

	const typeArgs: string[] = [];
	for (const typeArg of command.type_arguments)
		typeArgs.push(normalizeStructTag(typeArg).toString());

	if (!command.module_name || !command.function)
		throw new PASClientError(
			'Module name or function name is missing from the on-chain policy. This means that the issuer has not set up the policy correctly.',
		);

	return TransactionCommands.MoveCall({
		package: command.package_id,
		module: command.module_name,
		function: command.function,
		arguments: resolvedArgs,
		typeArguments: typeArgs.length > 0 ? typeArgs : [],
	});
}

function resolveRawPasRequest(
	args: RawCommandBuildArgs,
	extInput: { _namespace: string; value: string },
): Argument {
	// do the logic on `namespace` here
	// return error if it's not PAS

	switch (extInput.value) {
		case 'request':
			if (!args.request) throw new PASClientError(`Request is not set in the context.`);
			return args.request;
		case 'policy':
			if (!args.policy) throw new PASClientError(`Policy is not set in the context.`);
			return args.policy;
		case 'sender_account':
			if (!args.senderAccount)
				throw new PASClientError(`Sender account is not set in the context.`);
			return args.senderAccount;
		case 'receiver_account':
			if (!args.receiverAccount)
				throw new PASClientError(`Receiver account is not set in the context.`);
			return args.receiverAccount;
		default:
			throw new PASClientError(`Unknown pas request: ${extInput.value}`);
	}
}
