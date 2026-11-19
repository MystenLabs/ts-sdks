// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';

import {
	mapBalanceChange,
	mapEvents,
	mapObjectChanges,
	mapTransactionDataToInput,
	mapTransactionEffects,
	type MappableTransaction,
} from './mappers.js';

type IncludeSection = keyof SuiClientTypes.TransactionInclude;

/** The `include` sections each response option is built from. */
const SECTION_DEPENDENCIES = {
	showBalanceChanges: ['balanceChanges'],
	showEffects: ['effects', 'transaction'],
	showEvents: ['events'],
	showInput: ['transaction'],
	showObjectChanges: ['effects', 'objectTypes', 'transaction'],
	showRawEffects: ['effects'],
	showRawInput: [],
} as const satisfies Record<
	keyof SuiJsonRpcTypes.SuiTransactionBlockResponseOptions,
	readonly IncludeSection[]
>;

/**
 * The `include` to execute (or fetch) a transaction with, so that
 * {@link transactionBlockResponseFromExecution} can build a response for the same `options`.
 */
export function mappableIncludeFor(
	options?: SuiJsonRpcTypes.SuiTransactionBlockResponseOptions | null,
): SuiClientTypes.TransactionInclude {
	const include: SuiClientTypes.TransactionInclude = { effects: true };

	for (const [option, sections] of Object.entries(SECTION_DEPENDENCIES)) {
		if (options?.[option as keyof typeof SECTION_DEPENDENCIES]) {
			for (const section of sections) {
				include[section] = true;
			}
		}
	}

	return include;
}

/** What {@link transactionBlockResponseFromExecution} needs besides the executed transaction. */
export interface TransactionBlockExecutionContext {
	/** The BCS-encoded `TransactionData` that was executed, as bytes or base64. */
	bytes: Uint8Array | string;
	/** Base64 signatures submitted alongside `bytes`. */
	signatures: string[];
	/** The dApp's requested response options. */
	options?: SuiJsonRpcTypes.SuiTransactionBlockResponseOptions | null;
}

/**
 * Builds the `SuiTransactionBlockResponse` that the deprecated `sui:signAndExecuteTransactionBlock`
 * feature returns, from the Core API transaction an execution returned.
 *
 * ```ts
 * const result = await client.core.executeTransaction({
 * 	transaction: bytes,
 * 	signatures: [signature],
 * 	include: mappableIncludeFor(input.options),
 * });
 * return transactionBlockResponseFromExecution(result.Transaction ?? result.FailedTransaction, {
 * 	bytes,
 * 	signatures: [signature],
 * 	options: input.options,
 * });
 * ```
 *
 * Throws if the execution was not parsed with the sections {@link mappableIncludeFor} asks for.
 * A section whose on-chain data cannot be mapped is left out, and the rest is still returned.
 */
export function transactionBlockResponseFromExecution(
	executed: SuiClientTypes.Transaction<SuiClientTypes.TransactionInclude>,
	{ bytes, signatures, options }: TransactionBlockExecutionContext,
): SuiJsonRpcTypes.SuiTransactionBlockResponse {
	const transaction = withRequestedSections(executed, options);
	const response: SuiJsonRpcTypes.SuiTransactionBlockResponse = {
		digest: transaction.digest,
		// The Core API does not report whether the node executed the transaction locally.
		confirmedLocalExecution: false,
	};

	if (options?.showInput) {
		response.transaction = section(() => ({
			data: mapTransactionDataToInput(transaction.transaction),
			txSignatures: signatures,
		}));
	}
	if (options?.showRawInput) {
		response.rawTransaction = senderSignedData(
			typeof bytes === 'string' ? fromBase64(bytes) : bytes,
			signatures,
		);
	}
	if (options?.showEffects) {
		response.effects = section(() => mapTransactionEffects(transaction));
	}
	if (options?.showEvents) {
		response.events = section(() => mapEvents(transaction));
	}
	if (options?.showObjectChanges) {
		response.objectChanges = section(() => mapObjectChanges(transaction));
	}
	if (options?.showBalanceChanges) {
		response.balanceChanges = section(() => transaction.balanceChanges.map(mapBalanceChange));
	}
	if (options?.showRawEffects && transaction.effects.bcs?.length) {
		response.rawEffects = Array.from(transaction.effects.bcs);
	}

	return response;
}

/** Checks that `executed` carries every section `options` needs; a missing one is a caller bug. */
function withRequestedSections(
	executed: SuiClientTypes.Transaction<SuiClientTypes.TransactionInclude>,
	options: SuiJsonRpcTypes.SuiTransactionBlockResponseOptions | null | undefined,
): MappableTransaction {
	for (const [section, requested] of Object.entries(mappableIncludeFor(options))) {
		if (requested && executed[section as IncludeSection] == null) {
			throw new Error(
				`The transaction was not parsed with include.${section}; execute it with mappableIncludeFor(options)`,
			);
		}
	}

	// Only the sections checked above are read.
	return executed as MappableTransaction;
}

/** Runs one section's mapper, leaving the section out if its on-chain data cannot be mapped. */
function section<T>(map: () => T): T | undefined {
	try {
		return map();
	} catch {
		return undefined;
	}
}

/** The `SenderSignedData` of the JSON-RPC `rawTransaction` field. */
function senderSignedData(bytes: Uint8Array, signatures: string[]): string {
	return toBase64(
		bcs.SenderSignedData.serialize([
			{
				intentMessage: {
					intent: {
						scope: { TransactionData: true },
						version: { V0: true },
						appId: { Sui: true },
					},
					value: bcs.TransactionData.parse(bytes),
				},
				txSignatures: signatures,
			},
		]).toBytes(),
	);
}
