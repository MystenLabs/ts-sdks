// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction, TransactionDataBuilder } from '@mysten/sui/transactions';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { analyze, createAnalyzer, type Analyzer } from '@mysten/wallet-sdk';

import type {
	SponsorRejection,
	TransactionData,
	ValidationIssue,
	Validator,
} from './validation.js';
import { kindOf } from './validation.js';
import { defaults } from './validators.js';

/** A delay, in milliseconds — a fixed number, or `{ min, max }` for a uniform random delay. */
export type DelaySpec = number | { min: number; max: number };

/** Configurable delays inserted to blunt TOCTOU / sandwich timing attacks. */
export interface SponsorDelayConfig {
	/** Awaited before the dry-run / simulation that backs analysis validators. */
	beforeSimulate?: DelaySpec;
	/** Awaited before executing a transaction. */
	beforeExecute?: DelaySpec;
	/** RNG override (returns 0..1). Defaults to `Math.random`. */
	random?: () => number;
}

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

/** A `validate` item: a single validator or an array of them. */
export type ValidateItem = Validator | readonly Validator[];

/**
 * The analyzer options the sponsor supplies itself on every run — callers never
 * pass these via `validationOptions`. `balanceFlows` is fixed to exclude gas so
 * balance-flow validators (the only validators it affects) see pure value, not
 * gas noise. Exported so the inferred `Sponsor` type stays nameable.
 */
export interface SponsorProvidedOptions {
	transaction: Uint8Array;
	client: ClientWithCoreApi;
	balanceFlows: { excludeGasBudget: boolean };
}

/**
 * The request-scoped options one validator requires (recursing its analyzer
 * deps), minus the options the sponsor provides itself ({@link SponsorProvidedOptions}).
 * Each remaining option keeps its optionality.
 */
type OptionsOf<V> = V extends Validator
	? Omit<Parameters<typeof analyze<{ v: V }>>[1], keyof SponsorProvidedOptions>
	: object;

type ItemOptions<I> = I extends readonly (infer Inner)[] ? OptionsOf<Inner> : OptionsOf<I>;

/**
 * The merged request-scoped options every validator in a `validate` array
 * requires. These are inferred onto {@link Sponsor.signTransaction} — so a
 * validator that reads `options.authToken` makes `authToken` a typed, required
 * argument. `{}` when no validator declares extra options.
 */
export type SponsorOptions<T extends readonly ValidateItem[]> =
	UnionToIntersection<{ [K in keyof T]: ItemOptions<T[K]> }[number]> extends infer O
		? O extends object
			? O
			: object
		: object;

/**
 * The `validationOptions` argument carrying a sponsor's inferred options. It's
 * required only when some option is itself required; otherwise it may be omitted.
 */
export type ValidationOptionsArg<T extends object> = {} extends T
	? { validationOptions?: T }
	: { validationOptions: T };

export interface CreateSponsorOptions<T extends readonly ValidateItem[] = readonly ValidateItem[]> {
	/** The sponsor — pays gas and co-signs every sponsored transaction. */
	signer: Signer;
	/** Sui client used to build, simulate, and analyze transactions. */
	client: ClientWithCoreApi;
	/**
	 * Validators run against every transaction before signing. Each is a
	 * {@link Validator} (a `createAnalyzer(...)` whose result is its issues); the
	 * sponsor makes them all dependencies of {@link Sponsor.analyzer}, so the
	 * analyzer framework resolves only what's depended on (no dry-run unless a
	 * validator reads `transactionResponse`), dedupes shared analyzers, and
	 * propagates failures. Array items may be a single validator or an array of
	 * them (so `defaults()` drops in as one entry). When omitted/empty,
	 * `defaults()` runs. Any `options` a validator reads are required, typed, on
	 * `signTransaction`.
	 */
	validate?: T;
	/** Optional timing-attack mitigation delays. */
	delay?: SponsorDelayConfig;
}

/** A transaction successfully signed by the sponsor (validation passed). */
export interface SponsoredTransaction {
	$kind: 'Signed';
	/** The built transaction bytes. These are what every party signs. */
	bytes: Uint8Array;
	/** The sponsor's signature over `bytes`. */
	sponsorSignature: string;
	/** The transaction digest. */
	digest: string;
	/**
	 * `[userSignature, sponsorSignature]`, ready to execute. Present only when a
	 * user signature was supplied to `sign`.
	 */
	signatures?: string[];
}

/**
 * `signTransaction`'s result: either the {@link SponsoredTransaction} (`Signed`)
 * or a {@link SponsorRejection} (`Rejected`) — switch on `$kind`. Validation
 * rejection is returned, not thrown; genuine errors (network, malformed input)
 * still throw.
 */
export type SignTransactionResult = SponsoredTransaction | SponsorRejection;

/**
 * `signAndExecuteTransaction`'s result: a {@link SponsorRejection} (`Rejected`,
 * never executed), or the execution result (`Transaction` / `FailedTransaction`).
 * Switch on `$kind`.
 */
export type SignAndExecuteResult =
	| SponsorRejection
	| SuiClientTypes.TransactionResult<{ effects: true }>;

/**
 * Anything `Transaction.from` accepts: a {@link Transaction} instance, built
 * transaction bytes, a base64 string of those bytes, or a serialized-JSON string.
 */
export type TransactionInput = Transaction | Uint8Array | string;

export type SignOptions =
	| {
			/**
			 * The transaction to sponsor — a {@link Transaction}, built bytes, base64,
			 * or serialized JSON. The sponsor sets itself as gas owner and provides the
			 * gas during the build.
			 */
			transaction: TransactionInput;
			/** The transaction sender, set if the transaction doesn't already carry one. */
			sender?: string;
			userSignature?: undefined;
	  }
	| {
			/**
			 * The exact, already-built transaction the user signed — its bytes as a
			 * `Uint8Array` or a base64 string. A user signature is only meaningful over
			 * fixed bytes, so this form excludes a {@link Transaction}; the sponsor
			 * doesn't rebuild it.
			 */
			transaction: Uint8Array | string;
			/** The user's signature(s) over `transaction`. */
			userSignature: string | string[];
	  };

export interface SignAndExecuteOptions {
	/** The exact, already-built transaction the user signed — bytes or base64. */
	transaction: Uint8Array | string;
	/** The user's signature(s) — required, since execution needs every signature. */
	userSignature: string | string[];
}

/** Create a {@link Sponsor} bound to a signer, client, and validation policy. */
export function createSponsor<const T extends readonly ValidateItem[] = []>(
	options: CreateSponsorOptions<T>,
): Sponsor<SponsorOptions<T>> {
	const provided = (options.validate ?? []).flat() as Validator[];
	// No explicit validators → run the recommended baseline.
	const validators = provided.length > 0 ? provided : defaults();

	return new Sponsor<SponsorOptions<T>>({
		signer: options.signer,
		client: options.client,
		validators,
		delay: options.delay ?? {},
	});
}

function toSignatureArray(userSignature: string | string[] | undefined): string[] {
	if (userSignature == null) return [];
	return Array.isArray(userSignature) ? userSignature : [userSignature];
}

interface SponsorConfig {
	signer: Signer;
	client: ClientWithCoreApi;
	validators: Validator[];
	delay: SponsorDelayConfig;
}

/**
 * Validates transactions against a policy and signs them as the sponsor.
 *
 * The sponsor is intentionally unopinionated about *how* a transaction is built
 * — you compose that yourself (set the gas owner to {@link Sponsor.address} and
 * build to have the sponsor provide gas). Its job is the part that needs the
 * sponsor's key: check the policy, then add the sponsor's signature.
 */
export class Sponsor<TOptions extends object = object> {
	#signer: Signer;
	#client: ClientWithCoreApi;
	#validators: Validator[];
	#delay: SponsorDelayConfig;
	#analyzer?: Analyzer<SponsorRejection | null, TOptions & { client: ClientWithCoreApi }>;

	/** Prefer {@link createSponsor}; the constructor takes pre-merged config. */
	constructor(config: SponsorConfig) {
		this.#signer = config.signer;
		this.#client = config.client;
		this.#validators = config.validators;
		this.#delay = config.delay;
	}

	/** The sponsor's (normalized) address. */
	get address(): string {
		return normalizeSuiAddress(this.#signer.toSuiAddress());
	}

	/**
	 * Validate a transaction against the policy and sign it as the sponsor.
	 *
	 * Returns `{ $kind: 'Signed', … }` on success, or `{ $kind: 'Rejected', … }`
	 * if a validator declined — rejection is returned, not thrown.
	 *
	 * Without a `userSignature`, the sponsor sets itself as gas owner (address-balance
	 * gas) and builds, so the returned `bytes` are sponsored — the user still needs to
	 * sign them. With a `userSignature`, the supplied bytes are final: they're left
	 * untouched, and the returned `signatures` are ready to execute.
	 */
	async signTransaction(
		options: SignOptions & ValidationOptionsArg<TOptions>,
	): Promise<SignTransactionResult> {
		const sponsor = this.address;
		const userSignatures = toSignatureArray(options.userSignature);

		let bytes: Uint8Array;
		let data: TransactionData;

		if (userSignatures.length > 0) {
			// Signed: the bytes are final (Uint8Array or base64). Use them exactly —
			// never rebuild — so the user's signature stays valid.
			const input = options.transaction;
			if (input instanceof Transaction) {
				throw new Error(
					'A user signature requires the transaction as bytes or base64, not a Transaction.',
				);
			}
			bytes = input instanceof Uint8Array ? input : fromBase64(input);
			data = Transaction.from(bytes).getData();
		} else {
			const sender = 'sender' in options ? options.sender : undefined;
			const tx =
				options.transaction instanceof Transaction
					? options.transaction
					: Transaction.from(options.transaction);
			if (sender) tx.setSenderIfNotSet(sender);
			tx.setGasOwner(sponsor);
			// Pay gas from the sponsor's address balance (empty payment); the resolver
			// sets a bounded `ValidDuring` expiration for it. Budget/price are whatever
			// the transaction set, else estimated during build.
			tx.setGasPayment([]);

			bytes = await tx.build({ client: this.#client });
			data = tx.getData();
		}

		const txSender = data.sender;
		if (!txSender) {
			throw new Error('Transaction must have a sender set before it can be sponsored.');
		}

		const gasOwner = data.gasData.owner;
		if (!gasOwner || normalizeSuiAddress(gasOwner) !== sponsor) {
			throw new Error('Transaction gas owner must be the sponsor address.');
		}

		// The user's signature isn't verified here: execution already enforces it
		// (a bad signature never executes, so the sponsor risks nothing), and the
		// sponsor-builds flow doesn't have one to check. What the transaction *does*
		// is what the validators guard.

		const validationOptions = (options as { validationOptions?: object }).validationOptions ?? {};
		const rejection = await this.#validate(bytes, validationOptions);
		if (rejection) return rejection;

		const { signature } = await this.#signer.signTransaction(bytes);
		return {
			$kind: 'Signed',
			bytes,
			sponsorSignature: signature,
			digest: TransactionDataBuilder.getDigestFromBytes(bytes),
			signatures: userSignatures.length > 0 ? [...userSignatures, signature] : undefined,
		};
	}

	/**
	 * Sign a user-signed transaction as the sponsor and execute it. Returns the
	 * validator {@link SponsorRejection} (`Rejected`, never executed), or the
	 * execution result (`Transaction` / `FailedTransaction`) — switch on `$kind`.
	 * Requires the user's signature, since execution needs both.
	 */
	async signAndExecuteTransaction(
		options: SignAndExecuteOptions & ValidationOptionsArg<TOptions>,
	): Promise<SignAndExecuteResult> {
		const signed = await this.signTransaction(
			options as SignOptions & ValidationOptionsArg<TOptions>,
		);
		if (signed.$kind === 'Rejected') return signed;

		await this.#runDelay(this.#delay.beforeExecute);
		return this.#client.core.executeTransaction({
			transaction: signed.bytes,
			signatures: signed.signatures!,
			include: { effects: true },
		});
	}

	/**
	 * The sponsor's validation as a composable {@link Analyzer}: it depends on every
	 * configured validator, so dropping it into any `analyze()` graph contributes
	 * `SponsorRejection | null` (a rejection, or `null` if the policy passed) while
	 * sharing/deduping analyzers with that graph. A failed analyzer propagates as
	 * this analyzer's `issues`.
	 */
	get analyzer(): Analyzer<SponsorRejection | null, TOptions & { client: ClientWithCoreApi }> {
		// Memoized: a stable instance gives the framework a stable identity to dedupe
		// on, so dropping `sponsor.analyzer` into a host `analyze()` graph (even more
		// than once) shares its analyzers rather than re-resolving them.
		if (!this.#analyzer) {
			const dependencies = Object.fromEntries(
				this.#validators.map((validator, index) => [`v${index}`, validator]),
			);
			this.#analyzer = createAnalyzer({
				dependencies,
				analyze:
					(_options, _transaction) => (results: Record<string, ValidationIssue[] | null>) => {
						// Each validator's result is its issues, or `null`/empty for a pass.
						const issues = Object.values(results).flatMap((result) => result ?? []);
						return {
							result: issues.length ? { $kind: 'Rejected', issues, kind: kindOf(issues) } : null,
						};
					},
			}) as Analyzer<SponsorRejection | null, TOptions & { client: ClientWithCoreApi }>;
		}
		return this.#analyzer;
	}

	/** Resolve `sponsor.analyzer` against the bytes, reducing it to a rejection (or `null`). */
	async #validate(bytes: Uint8Array, validationOptions: object): Promise<SponsorRejection | null> {
		// Delay before the analysis resolves (which is where simulation, if any, happens).
		await this.#runDelay(this.#delay.beforeSimulate);
		// Sponsor-provided options are fixed; `validationOptions` (the caller's) can't
		// override them — `SponsorOptions` omits their keys, so there's no overlap.
		const provided: SponsorProvidedOptions = {
			transaction: bytes,
			client: this.#client,
			balanceFlows: { excludeGasBudget: true },
		};
		const analysis = await analyze({ check: this.analyzer }, {
			...provided,
			...validationOptions,
		} as never);

		const check = analysis.check;
		if (check.issues) {
			return {
				$kind: 'Rejected',
				issues: check.issues.map((issue) => ({ code: 'ANALYSIS_FAILED', message: issue.message })),
				kind: 'ANALYSIS_FAILED',
			};
		}
		return check.result ?? null;
	}

	#runDelay(spec: DelaySpec | undefined): Promise<void> {
		if (spec == null) return Promise.resolve();
		const random = this.#delay.random ?? Math.random;
		const ms = typeof spec === 'number' ? spec : spec.min + random() * (spec.max - spec.min);
		return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
	}
}
