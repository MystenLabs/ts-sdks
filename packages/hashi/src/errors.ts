// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Custom error classes thrown by the Hashi SDK. Consumers can `instanceof`-check
 * these to distinguish SDK-structured failures (missing/malformed on-chain data,
 * chain-fetch failures) from generic runtime errors.
 */

/**
 * Thrown when a governance config entry on-chain is missing, has an unexpected
 * variant, or has a payload that cannot be decoded to the expected type.
 * Carries the offending `key` and `expectedVariant` as structured fields so
 * callers can react programmatically without string-parsing the message.
 */
export class HashiConfigError extends Error {
	readonly key: string;
	readonly expectedVariant: string;
	readonly actualVariant?: string;

	constructor(
		message: string,
		details: { key: string; expectedVariant: string; actualVariant?: string },
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = 'HashiConfigError';
		this.key = details.key;
		this.expectedVariant = details.expectedVariant;
		this.actualVariant = details.actualVariant;
	}

	static missing(key: string, expectedVariant: string): HashiConfigError {
		return new HashiConfigError(`Config key "${key}" not found on-chain.`, {
			key,
			expectedVariant,
		});
	}

	static wrongVariant(
		key: string,
		expectedVariant: string,
		actualVariant: string,
	): HashiConfigError {
		return new HashiConfigError(
			`Config key "${key}" is ${actualVariant}, expected ${expectedVariant}.`,
			{ key, expectedVariant, actualVariant },
		);
	}

	static malformedPayload(
		key: string,
		expectedVariant: string,
		detail: string,
		cause?: unknown,
	): HashiConfigError {
		return new HashiConfigError(
			`Config key "${key}" ${expectedVariant} payload is malformed: ${detail}.`,
			{ key, expectedVariant, actualVariant: expectedVariant },
			{ cause },
		);
	}
}

/**
 * Thrown when fetching the Hashi shared object fails or returns an
 * unexpectedly shaped response. Wraps the underlying Sui-client error via
 * `cause` so callers can still access the network-layer detail.
 */
export class HashiFetchError extends Error {
	readonly hashiObjectId: string;

	constructor(message: string, hashiObjectId: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'HashiFetchError';
		this.hashiObjectId = hashiObjectId;
	}
}

/**
 * Stable discriminator for `HashiGuardianError`, so callers can `switch` on
 * `code` rather than string-parse the message: `not-configured` (no guardian URL
 * resolvable), `unreachable` (`fetch` threw), `http-error` (non-2xx),
 * `malformed-response` (bad JSON or limiter field), `not-initialized` (no limiter yet).
 */
export type GuardianErrorCode =
	| 'not-configured'
	| 'unreachable'
	| 'http-error'
	| 'malformed-response'
	| 'not-initialized';

/**
 * Thrown by the `client.hashi.guardian.*` methods when the guardian `/info`
 * endpoint can't be resolved, reached, parsed, or is not yet initialized.
 * `code` is a stable discriminator for programmatic handling; `url` is the
 * `/info` endpoint that failed (`null` for `not-configured`); `status` carries
 * the HTTP status for `http-error`.
 */
export class HashiGuardianError extends Error {
	readonly code: GuardianErrorCode;
	readonly url: string | null;
	readonly status?: number;

	constructor(
		details: { message: string; code: GuardianErrorCode; url?: string | null; status?: number },
		options?: { cause?: unknown },
	) {
		super(details.message, options);
		this.name = 'HashiGuardianError';
		this.code = details.code;
		this.url = details.url ?? null;
		this.status = details.status;
	}
}

/**
 * One amount that failed a client-side minimum check. `vout` is present for
 * deposit-UTXO violations (so callers can map each offender back to a Bitcoin
 * output) and absent for withdrawal violations, where there is a single
 * top-level amount and no output index.
 */
export interface AmountViolation {
	readonly amount: bigint;
	readonly minimum: bigint;
	readonly vout?: number;
}

/**
 * Thrown by `HashiClient.deposit()` and `HashiClient.requestWithdrawal()` when
 * one or more amounts are below the live on-chain minimum. Deposits may carry
 * multiple violations (one per offending UTXO) so callers can fix the whole
 * batch in one round-trip; withdrawals always carry exactly one. Raised after
 * the governance snapshot is fetched but before any PTB is built — mirrors
 * the Move-side `EBelowMinimumDeposit` / `EBelowMinimumWithdrawal` aborts.
 */
export class AmountBelowMinimumError extends Error {
	readonly violations: readonly AmountViolation[];

	constructor(details: { violations: readonly AmountViolation[] }) {
		const { violations } = details;
		const head = violations[0];
		let summary: string;
		if (violations.length === 1) {
			summary =
				head.vout === undefined
					? `Amount ${head.amount} sats is below the protocol minimum ` + `of ${head.minimum} sats.`
					: `UTXO at vout ${head.vout} has amount ${head.amount} sats, ` +
						`below the protocol minimum of ${head.minimum} sats.`;
		} else {
			summary =
				`${violations.length} UTXOs are below the protocol minimum ` +
				`(${head.minimum} sats): ${violations
					.map((v) =>
						v.vout === undefined ? `${v.amount} sats` : `vout ${v.vout} = ${v.amount} sats`,
					)
					.join(', ')}.`;
		}
		super(summary);
		this.name = 'AmountBelowMinimumError';
		this.violations = violations;
	}
}

/**
 * Thrown by user-facing entry points when `paused` is `true` in the governance
 * config snapshot. Mirrors the Move-side `ESystemPaused` abort in
 * `hashi::assert_unpaused` so the SDK can fail early with a typed error
 * instead of a gas-burning on-chain abort.
 */
export class HashiPausedError extends Error {
	readonly operation?: string;

	constructor(details?: { operation?: string }, options?: { cause?: unknown }) {
		const op = details?.operation;
		super(
			op
				? `Hashi protocol is currently paused; cannot ${op}.`
				: 'Hashi protocol is currently paused.',
			options,
		);
		this.name = 'HashiPausedError';
		this.operation = op;
	}
}

/**
 * Thrown by `HashiClient` direct methods when the caller-supplied params
 * don't meet structural preconditions (empty `utxos`, duplicate `vout`,
 * malformed hex). Raised before any chain read so even a paused or
 * unreachable protocol surfaces the client-side bug first.
 */
export class InvalidParamsError extends Error {
	readonly reason: string;
	readonly detail?: string;

	constructor(details: { reason: string; detail?: string }, options?: { cause?: unknown }) {
		super(details.detail ? `${details.reason}: ${details.detail}` : details.reason, options);
		this.name = 'InvalidParamsError';
		this.reason = details.reason;
		this.detail = details.detail;
	}
}

/**
 * Stable discriminator for `InvalidBitcoinAddressError`. Callers can switch on
 * `code` to surface targeted UX (e.g. "wrong network" → prompt the user to
 * switch, "bad-checksum" → flag a typo) without string-parsing the message.
 */
export type InvalidBitcoinAddressCode =
	| 'malformed'
	| 'bad-checksum'
	| 'wrong-network'
	| 'unsupported-version'
	| 'bad-program-length';

/**
 * Thrown when a user-supplied Bitcoin address cannot be decoded into a
 * witness program that the Hashi withdrawal path accepts. `code` is a stable
 * discriminator suitable for programmatic handling; `address` echoes the
 * offending input back so callers can display it.
 */
export class InvalidBitcoinAddressError extends Error {
	readonly address: string;
	readonly code: InvalidBitcoinAddressCode;

	constructor(
		details: { address: string; code: InvalidBitcoinAddressCode; message: string },
		options?: { cause?: unknown },
	) {
		super(details.message, options);
		this.name = 'InvalidBitcoinAddressError';
		this.address = details.address;
		this.code = details.code;
	}
}
