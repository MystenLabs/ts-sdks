// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { object, optional, parse, picklist, string } from 'valibot';

import { bcs } from '../../bcs/index.js';
import type { SuiClientTypes } from '../../client/index.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../utils/sui-types.js';
import { TransactionCommands } from '../Commands.js';
import type { Argument } from '../data/internal.js';
import { Inputs } from '../Inputs.js';
import { getClient } from '../resolve.js';
import type { TransactionPlugin } from '../resolve.js';
import type { Transaction } from '../Transaction.js';
import type { AllowanceReference } from './BalanceOptions.js';

export const ALLOWANCE_BALANCE = 'AllowanceBalance';

const AllowanceBalanceData = object({
	objectId: string(),
	funder: optional(string()),
	appType: optional(string()),
	type: string(),
	amount: string(),
	outputKind: picklist(['coin', 'balance']),
});

// Read only the prefix needed for spending. The remaining settings and current_spend
// are checked by Move, so this does not need to model rate limits or their policy.
const AllowanceMetadata = bcs.struct('AllowanceMetadata', {
	id: bcs.Address,
	funder: bcs.Address,
	spender: bcs.option(bcs.Address),
	app: bcs.option(bcs.string()),
});

export function allowanceBalance({
	allowance,
	amount,
	type = '0x2::sui::SUI',
	outputKind,
}: {
	allowance: string | AllowanceReference;
	amount: bigint;
	type?: string;
	outputKind: 'coin' | 'balance';
}) {
	bcs.U64.validate(amount);
	const objectId = normalizeSuiAddress(
		typeof allowance === 'string' ? allowance : allowance.objectId,
	);
	const reference = typeof allowance === 'string' ? { objectId } : allowance;
	return (tx: Transaction) => {
		tx.addIntentResolver(ALLOWANCE_BALANCE, resolveAllowanceBalance);
		return tx.add(
			TransactionCommands.Intent({
				name: ALLOWANCE_BALANCE,
				inputs: {
					allowance: tx.object(objectId),
					clock: tx.object.clock(),
					...(reference.app ? { permit: tx.object(reference.app.permit) } : {}),
				},
				data: {
					objectId,
					funder: reference.funder ? normalizeSuiAddress(reference.funder) : undefined,
					appType: reference.app ? normalizeStructTag(reference.app.type) : undefined,
					type: normalizeStructTag(type),
					amount: String(amount),
					outputKind,
				},
			}),
		);
	};
}

export const resolveAllowanceBalance: TransactionPlugin = async (
	transactionData,
	options,
	next,
) => {
	const ids = new Set<string>();
	for (const command of transactionData.commands) {
		if (command.$kind !== '$Intent' || command.$Intent.name !== ALLOWANCE_BALANCE) continue;
		const data = parse(AllowanceBalanceData, command.$Intent.data);
		if (!data.funder) ids.add(data.objectId);
	}

	const allowances = new Map<string, SuiClientTypes.Object<{ content: true }>>();
	if (ids.size) {
		const { objects } = await getClient(options).core.getObjects({
			objectIds: [...ids],
			include: { content: true },
		});
		for (const object of objects) {
			if (object instanceof Error) throw object;
			allowances.set(object.objectId, object);
		}
	}

	for (let index = 0; index < transactionData.commands.length; index++) {
		const command = transactionData.commands[index];
		if (command.$kind !== '$Intent' || command.$Intent.name !== ALLOWANCE_BALANCE) continue;
		const data = parse(AllowanceBalanceData, command.$Intent.data);
		let funder = data.funder;
		if (!funder) {
			const allowance = allowances.get(data.objectId);
			const expectedType = normalizeStructTag(
				`0x2::allowance::Allowance<0x2::balance::Balance<${data.type}>>`,
			);
			if (!allowance || allowance.type !== expectedType || allowance.owner.$kind !== 'Shared') {
				throw new Error(`Expected a shared ${expectedType} allowance at ${data.objectId}`);
			}
			const metadata = AllowanceMetadata.parse(allowance.content);
			if (metadata.app !== null && !data.appType) {
				throw new Error(
					`Allowance ${data.objectId} is app-bound; pass allowance.app with the app type and SpendPermit`,
				);
			}
			if (
				data.appType &&
				(metadata.app === null || normalizeStructTag(metadata.app) !== data.appType)
			) {
				throw new Error(`Allowance ${data.objectId} does not belong to app ${data.appType}`);
			}
			funder = metadata.funder;
			const input = command.$Intent.inputs.allowance as Argument;
			if (input.$kind === 'Input') {
				transactionData.inputs[input.Input] = Inputs.SharedObjectRef({
					objectId: data.objectId,
					initialSharedVersion: allowance.owner.Shared.initialSharedVersion,
					mutable: true,
				});
			}
		}
		const withdrawal = transactionData.addInput(
			'withdrawal',
			Inputs.FundsWithdrawal({
				reservation: { $kind: 'MaxAmountU64', MaxAmountU64: data.amount },
				typeArg: { $kind: 'Balance', Balance: data.type },
				withdrawFrom: {
					$kind: 'SenderAllowance',
					SenderAllowance: { funder, allowance: data.objectId },
				},
			}),
		);
		const commands = [
			TransactionCommands.MoveCall({
				target: data.appType
					? '0x2::allowance::app_balance_spend'
					: '0x2::allowance::balance_spend',
				typeArguments: data.appType ? [data.type, data.appType] : [data.type],
				arguments: [
					command.$Intent.inputs.allowance as Argument,
					...(data.appType ? [command.$Intent.inputs.permit as Argument] : []),
					withdrawal,
					command.$Intent.inputs.clock as Argument,
				],
			}),
		];
		if (data.outputKind === 'coin') {
			commands.push(
				TransactionCommands.MoveCall({
					target: '0x2::coin::from_balance',
					typeArguments: [data.type],
					arguments: [{ $kind: 'Result', Result: index }],
				}),
			);
		}
		transactionData.replaceCommand(index, commands, {
			NestedResult: [index + commands.length - 1, 0],
		});
		index += commands.length - 1;
	}
	return next();
};
