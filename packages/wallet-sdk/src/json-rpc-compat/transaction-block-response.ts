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
 * The `include` sections each `options` field is mapped out of. Three of the
 * mappers read a section they are not named after — legacy effects take input
 * versions and the gas payer from the transaction, object changes take both of
 * those and `objectTypes`, events take the effects' digest — but no mapper
 * reads all five, so a response showing one section need not pay for the rest.
 *
 * `showRawInput` is rebuilt from the submitted bytes alone.
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
 * The `include` {@link mappableIncludeFor} returns for `Options`. Effects are
 * always requested. A section is `true` only when an option that reads it is
 * known to be `true` at compile time; a section that depends on a runtime
 * value is an optional `boolean`, so the Core API types it as absent and a
 * caller has to narrow before reading it. A union of options maps to the union
 * of each member's include.
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
 * {@link transactionBlockResponseFromExecution} can build a response for these
 * `options` from the result: the union of the sections each requested option
 * is mapped from, above a floor of the effects. Several mappers read a section
 * they are not named after (legacy effects take input versions and the gas
 * payer from the transaction, object changes also need `objectTypes`, events
 * take the effects' digest), so pass this rather than a hand-built include.
 *
 * The return type only promises the sections it can see the options request:
 * for options known only at runtime (a dApp's request), every section but the
 * effects is optional. Build the response from the *same* `options`; a section
 * those options never fetched is left out of the response.
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
 * Accepts a transaction parsed with any `include`. Parse it with at least
 * {@link mappableIncludeFor} of these same `options` — several mappers read a
 * section they are not named after, and a requested field whose sections are
 * missing is left out of the response. `options` prunes the **output**,
 * exactly as the JSON-RPC node did.
 *
 * Known fidelity limits, unchanged from what JSON-RPC itself returned on
 * execute unless noted:
 *
 * - `timestampMs` and `checkpoint` are null: they belong to the read API, not
 *   the execution API.
 * - `errors` is always empty. A failed execution reports through
 *   `effects.status`; the node's execute path built the response with an empty
 *   `errors` unconditionally and only ever filled the field in the read API.
 * - `confirmedLocalExecution` is synthesised — true only when the dApp asked
 *   for `WaitForLocalExecution` and the wallet's own wait resolved. An omitted
 *   `requestType` means `WaitForEffectsCert`, the node's default.
 * - `rawEffects` is omitted, not empty, when the execution came back without
 *   its effects BCS, as the node did. Consumers parse whatever is there as
 *   effects, so an empty array would be worse than an absent field.
 * - `published` object changes carry the module names of every `Publish` and
 *   `Upgrade` command in the transaction. Effects do not say which command
 *   wrote which package, so a transaction touching more than one package gets
 *   the union on each change.
 * - `effects.accumulatorEvents` is omitted; the legacy shape has no field for
 *   it.
 * - A `fundsWithdrawal` input drawn from an allowance has `withdrawFrom` set to
 *   `{ senderAllowance: { funder, allowance } }`; consumers that only compare it against the
 *   two string values see neither.
 * - Error-string wording, event `parsedJson` shape, `balanceChanges.owner`
 *   (always `AddressOwner`) and pure-input decoding are best-effort.
 *
 * Each optional section is mapped independently: if one throws, that section is
 * omitted and the rest of the response still returns. `digest`,
 * `rawTransaction` and `rawEffects`, the fields dApps depend on most, do not
 * depend on any other section, so a failure elsewhere cannot cost them.
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

	// `effects.bcs` is the same BCS blob the node returned as a byte array. The
	// node skipped `raw_effects` when it was empty, so an execution that came
	// back without the blob has to leave the field off rather than hand a
	// consumer zero bytes to parse as effects.
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
			// Only the execute path carries this. Adding it inside
			// `mapTransactionEffects` would change the dry-run shape for failed
			// dry runs, which JSON-RPC never reported an abort in.
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
 * The legacy `effects.abortError`, for a transaction that failed on a Move
 * abort. Core reports the abort as one arm of `status.error`; the legacy shape
 * is a flatter, snake_cased struct, and `line` has no exact counterpart — the
 * clever-error line number is the closest the node gives us.
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

/**
 * Runs one section's mapper, yielding `undefined` rather than failing the whole
 * response. A dApp that asked for `showObjectChanges` and hits an unmappable
 * change still gets its digest and raw bytes.
 */
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
