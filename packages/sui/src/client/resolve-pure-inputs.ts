// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CoreClient } from './core.js';
import type { CallArg, Command } from '../transactions/data/internal.js';
import type { SuiClientTypes } from './types.js';
import { Inputs } from '../transactions/Inputs.js';
import { getPureBcsSchema, isTxContext } from '../transactions/serializer.js';
import type { TransactionDataBuilder } from '../transactions/TransactionData.js';

export interface ResolveUnresolvedPureInputsOptions {
	signal?: AbortSignal;
	/**
	 * Also fetch the signature of move calls whose `UnresolvedObject` inputs don't say whether they
	 * are used mutably, so a client-side resolver can tell shared objects' mutability from the
	 * parameter types. Server-side resolvers leave this off and let the server decide.
	 */
	resolveObjectArgumentTypes?: boolean;
}

/**
 * Resolve the `UnresolvedPure` inputs (raw JS values with no BCS type) of a transaction using the
 * signatures of the move functions they are passed to.
 *
 * Each value passed to a pure parameter is serialized with that parameter's BCS schema. A value
 * passed to an object parameter becomes an `UnresolvedObject` for the transport to resolve. The
 * signature of each distinct target is fetched once with `client.core.getMoveFunction`, and only
 * for move calls that need it. When the transaction has no `UnresolvedPure` inputs (and
 * `resolveObjectArgumentTypes` is off) this makes no requests and changes nothing.
 */
export async function resolveUnresolvedPureInputs(
	transactionData: TransactionDataBuilder,
	client: { core: Pick<CoreClient, 'getMoveFunction'> },
	options: ResolveUnresolvedPureInputsOptions = {},
) {
	const { inputs, commands } = transactionData;
	const { signal, resolveObjectArgumentTypes = false } = options;

	if (!resolveObjectArgumentTypes && !inputs.some((input) => input.UnresolvedPure)) {
		return;
	}

	signal?.throwIfAborted();

	const moveCallsToResolve: Extract<Command, { MoveCall: unknown }>['MoveCall'][] = [];
	const moveFunctionsToResolve = new Set<string>();

	commands.forEach((command) => {
		// Special case move call:
		if (command.MoveCall) {
			// Determine if any of the arguments require encoding.
			// - If they don't, then this is good to go.
			// - If they do, then we need to fetch the normalized move module.

			// If we already know the argument types, we don't need to resolve them again
			if (command.MoveCall._argumentTypes) {
				return;
			}

			const callInputs = command.MoveCall.arguments.map((arg) => {
				if (arg.$kind === 'Input') {
					return inputs[arg.Input];
				}
				return null;
			});
			const needsResolution = callInputs.some(
				(input) =>
					input?.UnresolvedPure ||
					(resolveObjectArgumentTypes &&
						input?.UnresolvedObject &&
						typeof input?.UnresolvedObject.mutable !== 'boolean'),
			);

			if (needsResolution) {
				const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
				moveFunctionsToResolve.add(functionName);
				moveCallsToResolve.push(command.MoveCall);
			}
		}
	});

	const moveFunctionParameters = new Map<string, SuiClientTypes.OpenSignature[]>();
	if (moveFunctionsToResolve.size > 0) {
		await Promise.all(
			[...moveFunctionsToResolve].map(async (functionName) => {
				const [packageId, moduleName, name] = functionName.split('::');
				const { function: def } = await client.core.getMoveFunction({
					packageId,
					moduleName,
					name,
					signal,
				});

				moveFunctionParameters.set(functionName, def.parameters);
			}),
		);
	}

	for (const moveCall of moveCallsToResolve) {
		const parameters = moveFunctionParameters.get(
			`${moveCall.package}::${moveCall.module}::${moveCall.function}`,
		);

		if (!parameters) {
			continue;
		}

		// Entry functions can have a mutable reference to an instance of the TxContext
		// struct defined in the TxContext module as the last parameter. The caller of
		// the function does not need to pass it in as an argument.
		const hasTxContext = parameters.length > 0 && isTxContext(parameters.at(-1)!);
		moveCall._argumentTypes = hasTxContext
			? parameters.slice(0, parameters.length - 1)
			: parameters;
	}

	commands.forEach((command) => {
		if (!command.MoveCall) {
			return;
		}

		const moveCall = command.MoveCall;
		const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
		const params = moveCall._argumentTypes;

		if (!params) {
			return;
		}

		if (params.length !== command.MoveCall.arguments.length) {
			throw new Error(`Incorrect number of arguments for ${fnName}`);
		}

		params.forEach((param, i) => {
			const arg = moveCall.arguments[i];
			if (arg.$kind !== 'Input') return;
			const input = inputs[arg.Input];

			// Skip if the input is already resolved
			if (!input.UnresolvedPure && !input.UnresolvedObject) {
				return;
			}

			const inputValue = input.UnresolvedPure?.value ?? input.UnresolvedObject?.objectId!;

			const schema = getPureBcsSchema(param.body);
			if (schema) {
				arg.type = 'pure';
				inputs[inputs.indexOf(input)] = Inputs.Pure(schema.serialize(inputValue));
				return;
			}

			if (typeof inputValue !== 'string') {
				throw new Error(
					`Expect the argument to be an object id string, got ${JSON.stringify(
						inputValue,
						null,
						2,
					)}`,
				);
			}

			arg.type = 'object';
			const unresolvedObject: CallArg = input.UnresolvedPure
				? {
						$kind: 'UnresolvedObject',
						UnresolvedObject: {
							objectId: inputValue,
						},
					}
				: input;

			inputs[arg.Input] = unresolvedObject;
		});
	});
}
