// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import type { Analyzer } from '@mysten/wallet-sdk';

/** Parsed transaction data, as returned by `Transaction#getData()`. */
export type TransactionData = ReturnType<Transaction['getData']>;

/** A single reason a transaction was rejected for sponsorship. */
export interface ValidationIssue {
	/** Stable machine-readable code, e.g. `SENDER_IS_SPONSOR`. */
	code?: string;
	/** Human-readable explanation. */
	message: string;
}

/**
 * A validator is an `Analyzer` whose result is the issues it found — just
 * `createAnalyzer(...)`. Declare the analyzers it reads via `dependencies`, read
 * request-scoped inputs (an auth token, a tenant id) off `options`, and report
 * the outcome through one of three channels:
 *
 * - **Pass** — return `{ result: null }` (or `{ result: [] }`).
 * - **Reject (policy)** — return `{ result: [{ code, message }] }`. The
 *   transaction is well-formed but violates policy → `POLICY_REJECTED`.
 * - **Couldn't analyze** — return `{ issues: [{ message }] }` or `throw`. The
 *   analyzer itself couldn't decide (a failed lookup, an unreachable service) →
 *   `ANALYSIS_FAILED`. This is the analyzer framework's own channel, so it
 *   propagates: dependents don't run, and the issue surfaces on the result.
 *
 * Reporting findings as the `result` (rather than via `issues`) is what keeps
 * "violates policy" distinct from "couldn't be checked". `createSponsor` makes
 * every validator a dependency of `sponsor.analyzer` (so the framework resolves
 * only what's depended on, dedupes, and propagates failures) and infers the
 * `options` each requires onto `signTransaction`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator<TOptions extends object = any> = Analyzer<
	ValidationIssue[] | null,
	TOptions,
	any
>;

/** Whether validation failed because a policy rejected, or because an analyzer couldn't run. */
export type SponsorValidationKind = 'POLICY_REJECTED' | 'ANALYSIS_FAILED';

/**
 * A validator-rejected outcome. The sponsor methods *return* this (rather than
 * throwing) so callers handle it alongside the execution result's `$kind`.
 */
export interface SponsorRejection {
	$kind: 'Rejected';
	issues: ValidationIssue[];
	kind: SponsorValidationKind;
}

export function kindOf(issues: ValidationIssue[]): SponsorValidationKind {
	return issues.some((issue) => issue.code === 'ANALYSIS_FAILED')
		? 'ANALYSIS_FAILED'
		: 'POLICY_REJECTED';
}

/**
 * A rejection as an `Error`, for callers who prefer to throw — e.g.
 * `if (result.$kind === 'Rejected') throw new SponsorValidationError(result.issues, result.kind)`.
 * The sponsor never throws this itself.
 */
export class SponsorValidationError extends Error {
	readonly issues: ValidationIssue[];
	readonly kind: SponsorValidationKind;

	constructor(issues: ValidationIssue[], kind: SponsorValidationKind = 'POLICY_REJECTED') {
		const summary = issues.map((issue) => issue.message).join('; ');
		super(`Transaction rejected for sponsorship: ${summary}`);
		this.name = 'SponsorValidationError';
		this.issues = issues;
		this.kind = kind;
	}
}
