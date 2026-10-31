// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';

import {
	MAPPABLE_TRANSACTION_INCLUDE,
	type MappableTransaction,
	mapBalanceChange,
	mapEvents,
	mapObjectChanges,
	mapTransactionDataToInput,
	mapTransactionEffects,
} from './dry-run-from-simulation.js';
import type {
	ExecuteTransactionRequestType,
	SuiTransactionBlockResponse,
	SuiTransactionBlockResponseOptions,
} from './legacy-types.js';

type SuiMoveAbort = SuiJsonRpcTypes.SuiMoveAbort;

/**
 * The `include` sections each `options` field is mapped from. Some mappers read sections they
 * are not named after, such as effects needing the transaction's input versions.
 */
const SECTION_DEPENDENCIES = {
	showBalanceChanges: ['balanceChanges'],
	showEffects: ['effects', 'transaction'],
	showEvents: ['effects', 'events'],
	showInput: ['transaction'],
	showObjectChanges: ['effects', 'objectTypes', 'transaction'],
	showRawEffects: ['effects'],
	showRawInput: [],
} as const satisfies Record<
	keyof SuiTransactionBlockResponseOptions,
	readonly (keyof SuiClientTypes.TransactionInclude)[]
>;

type ResponseOption = keyof typeof SECTION_DEPENDENCIES;
type IncludeSection = keyof typeof MAPPABLE_TRANSACTION_INCLUDE;
type SectionsOf<Option extends ResponseOption> = (typeof SECTION_DEPENDENCIES)[Option][number];

/** The options `Options` is known to set to `true`. */
type RequestedOption<Options> = {
	[Option in ResponseOption]: [Options] extends [{ [Key in Option]: true }] ? Option : never;
}[ResponseOption];

/** The options `Options` might set, depending on its runtime value. */
type PossibleOption<Options> = [NonNullable<Options>] extends [never]
	? never
	: {
			[Option in ResponseOption]: Option extends keyof NonNullable<Options> ? Option : never;
		}[ResponseOption];

/**
 * The `include` {@link mappableIncludeFor} returns for `Options`. Sections that depend on runtime
 * option values are typed as optional.
 */
export type MappableIncludeFor<Options> = Options extends unknown
	? MappableIncludeForMember<Options>
	: never;

type MappableIncludeForMember<Options> = { effects: true } & {
	[Section in SectionsOf<RequestedOption<Options>>]: true;
} & {
	[
		Section in Exclude<
			SectionsOf<PossibleOption<Options>>,
			SectionsOf<RequestedOption<Options>> | 'effects'
		>
	]?: boolean;
};

/**
 * The `include` to execute (or fetch) a transaction with, so that
 * {@link transactionBlockResponseFromExecution} can build a response for the same `options`. Use
 * this rather than a hand-built include, since some response fields need sections they are not
 * named after.
 */
export function mappableIncludeFor<
	const Options extends SuiTransactionBlockResponseOptions | null | undefined = undefined,
>(options?: Options): MappableIncludeFor<Options> {
	const include: SuiClientTypes.TransactionInclude = { effects: true };

	for (const option of Object.keys(SECTION_DEPENDENCIES) as ResponseOption[]) {
		if (!options?.[option]) {
			continue;
		}

		for (const section of SECTION_DEPENDENCIES[option]) {
			include[section] = true;
		}
	}

	return include as MappableIncludeFor<Options>;
}

/**
 * A Core API transaction as parsed with any `include`: each section is present
 * only if it was requested.
 */
type TransactionParts = Omit<MappableTransaction, IncludeSection> & {
	[Section in IncludeSection]?: MappableTransaction[Section];
};

/**
 * Narrows `transaction` to one that carries `sections`, throwing (and so
 * dropping the response field being built) when the execution was not parsed
 * with one of them.
 */
function withSections<Section extends IncludeSection>(
	transaction: TransactionParts,
	sections: readonly Section[],
): TransactionParts & Pick<MappableTransaction, Section> {
	for (const section of sections) {
		if (transaction[section] == null) {
			throw new Error(`The transaction was not parsed with include.${section}`);
		}
	}

	return transaction as TransactionParts & Pick<MappableTransaction, Section>;
}

/** What {@link transactionBlockResponseFromExecution} needs besides the executed transaction. */
export interface TransactionBlockExecutionContext {
	/** The BCS-encoded `TransactionData` that was executed, as bytes or base64. */
	bytes: Uint8Array | string;
	/** Base64 signatures submitted alongside `bytes`. */
	signatures: string[];
	/** The dApp's requested response options. Every field is honoured. */
	options?: SuiTransactionBlockResponseOptions | null;
	/** The dApp's requested execution mode. */
	requestType?: ExecuteTransactionRequestType | null;
	/**
	 * Whether the wallet's own wait for the transaction (for example `waitForTransaction`) resolved.
	 * Used to synthesise `confirmedLocalExecution`, which the Core API does not report.
	 */
	waited?: boolean;
}

/**
 * Builds the legacy `SuiTransactionBlockResponse` that the deprecated wallet-standard
 * `sui:signAndExecuteTransactionBlock` feature must return, from the Core API transaction an
 * execution returned (`executeTransaction` on any of the gRPC or GraphQL clients).
 *
 * ```ts
 * const include = mappableIncludeFor(input.options);
 * const result = await client.core.executeTransaction({
 * 	transaction: bytes,
 * 	signatures: [signature],
 * 	include,
 * });
 * const executed = result.Transaction ?? result.FailedTransaction;
 * return transactionBlockResponseFromExecution(executed, {
 * 	bytes,
 * 	signatures: [signature],
 * 	options: input.options,
 * 	requestType: input.requestType,
 * });
 * ```
 *
 * Execute with {@link mappableIncludeFor} of the same `options`; a requested field whose
 * sections are missing is left out of the response. A section that cannot be mapped is also left
 * out, while the rest of the response is still returned.
 *
 * Known differences from a JSON-RPC execution response:
 *
 * - `timestampMs` and `checkpoint` are null and `errors` is empty, as JSON-RPC returned on
 *   execute.
 * - `confirmedLocalExecution` is `true` only when `requestType` is `WaitForLocalExecution` and
 *   `waited` is `true`.
 * - In a transaction that publishes or upgrades several packages, each `published` change lists
 *   the modules of all of them.
 * - `effects.accumulatorEvents` is omitted.
 * - An allowance-funded `fundsWithdrawal` input has `withdrawFrom` set to
 *   `{ senderAllowance: { funder, allowance } }`.
 * - Error strings, event `parsedJson`, `balanceChanges.owner` and decoded pure inputs are
 *   best-effort.
 */
export function transactionBlockResponseFromExecution(
	executed: SuiClientTypes.Transaction<SuiClientTypes.TransactionInclude>,
	{ bytes, signatures, options, requestType, waited = false }: TransactionBlockExecutionContext,
): SuiTransactionBlockResponse {
	// Each section is typed absent for a general `include`; at runtime it is
	// there exactly when it was requested, and `withSections` checks for it.
	const transaction = executed as unknown as TransactionParts;
	const response: SuiTransactionBlockResponse = {
		digest: transaction.digest,
		errors: [],
		timestampMs: null,
		checkpoint: null,
		confirmedLocalExecution: requestType === 'WaitForLocalExecution' ? waited : false,
	};

	if (options?.showRawInput) {
		const rawTransaction = section(() =>
			senderSignedData(typeof bytes === 'string' ? fromBase64(bytes) : bytes, signatures),
		);
		if (rawTransaction !== undefined) {
			response.rawTransaction = rawTransaction;
		}
	}

	// Leave the field off rather than empty, as the node did: consumers parse whatever is
	// there as effects.
	if (options?.showRawEffects && transaction.effects?.bcs?.byteLength) {
		response.rawEffects = Array.from(transaction.effects.bcs);
	}

	if (options?.showInput) {
		response.transaction = section(() => ({
			data: mapTransactionDataToInput(
				withSections(transaction, SECTION_DEPENDENCIES.showInput).transaction,
			),
			txSignatures: signatures,
		}));
	}

	if (options?.showEffects) {
		response.effects = section(() => {
			const effects = mapTransactionEffects(
				withSections(transaction, SECTION_DEPENDENCIES.showEffects),
			);
			const abortError = moveAbortFromExecutionError(transaction.status.error);
			// Added here rather than in `mapTransactionEffects` because JSON-RPC dry runs never
			// reported an abort error.
			return abortError ? { ...effects, abortError } : effects;
		});
	}

	if (options?.showEvents) {
		response.events = section(() =>
			mapEvents(withSections(transaction, SECTION_DEPENDENCIES.showEvents)),
		);
	}

	if (options?.showObjectChanges) {
		response.objectChanges = section(() =>
			mapObjectChanges(withSections(transaction, SECTION_DEPENDENCIES.showObjectChanges)),
		);
	}

	if (options?.showBalanceChanges) {
		response.balanceChanges = section(() =>
			withSections(transaction, SECTION_DEPENDENCIES.showBalanceChanges).balanceChanges.map(
				mapBalanceChange,
			),
		);
	}

	return response;
}

/**
 * The legacy `effects.abortError` for a Move abort. `line` uses the clever-error line number, the
 * closest available counterpart.
 */
function moveAbortFromExecutionError(
	error: SuiClientTypes.ExecutionError | null | undefined,
): SuiMoveAbort | undefined {
	if (error?.$kind !== 'MoveAbort') {
		return undefined;
	}

	const { abortCode, location, cleverError } = error.MoveAbort;
	const moduleId =
		location?.package && location.module ? `${location.package}::${location.module}` : null;

	return {
		error_code: abortCode ?? null,
		function: location?.functionName ?? null,
		line: cleverError?.lineNumber ?? null,
		module_id: moduleId,
	};
}

/** Runs one section's mapper, yielding `undefined` rather than failing the whole response. */
function section<T>(map: () => T): T | undefined {
	try {
		return map();
	} catch {
		return undefined;
	}
}

/**
 * The `SenderSignedData` of the JSON-RPC `rawTransaction` field: a
 * one-element vector of the executed `TransactionData` wrapped in its
 * `TransactionData`-scope intent message, plus the submitted signatures.
 */
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
