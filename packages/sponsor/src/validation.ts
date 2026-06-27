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
 *   propagates through strict dependencies. Sponsor validation treats each
 *   configured validator independently, so one validator's analysis failure
 *   doesn't suppress policy rejections from other validators.
 *
 * Reporting findings as the `result` (rather than via `issues`) is what keeps
 * "violates policy" distinct from "couldn't be checked". `createSponsor`
 * aggregates every configured validator through `sponsor.analyzer` (so the
 * framework resolves only what's depended on and dedupes shared analyzers) and
 * infers the `options` each requires onto `signTransaction`.
 *
 * The options and dependencies are `any` because validators are heterogeneous —
 * a validator always carries `client` in its options (its dependencies fetch data
 * through it) and may require more (an auth token), with different dependency
 * sets — and the framework's analysis type is invariant, so no non-`any` type is
 * a supertype of them all. `@mysten/wallet-sdk`'s own `AnalyzerMap` is
 * `Analyzer<Defined, any, any>` for the same reason. The precise options a sponsor
 * requires are still recovered, exactly, by {@link Sponsor.signTransaction}'s
 * inference (which reads the concrete validator types, not this one).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator = Analyzer<ValidationIssue[] | null, any, any>;

/** Why validation failed: a policy rejected, or an analyzer couldn't run. */
export type SponsorRejectionReason = 'POLICY_REJECTED' | 'ANALYSIS_FAILED';

/**
 * A validator-rejected outcome. The sponsor methods *return* this (rather than
 * throwing) so callers handle it alongside the execution result's `$kind`. The
 * `$kind` discriminates the union; `reason` says which class of issue requires
 * the most conservative handling.
 */
export interface SponsorRejection {
	$kind: 'Rejected';
	/** All rejection issues, preserved for existing callers. */
	issues: ValidationIssue[];
	/** Policy validators that ran and rejected the transaction. */
	policyIssues: ValidationIssue[];
	/** Analyzer/framework failures that made one or more validators unavailable. */
	analysisIssues: ValidationIssue[];
	reason: SponsorRejectionReason;
}

export function reasonOf(
	issues: ValidationIssue[],
	analysisIssues: ValidationIssue[] = issues.filter((issue) => issue.code === 'ANALYSIS_FAILED'),
): SponsorRejectionReason {
	return analysisIssues.length > 0 ? 'ANALYSIS_FAILED' : 'POLICY_REJECTED';
}

export function createSponsorRejection({
	policyIssues,
	analysisIssues,
}: {
	policyIssues: ValidationIssue[];
	analysisIssues: ValidationIssue[];
}): SponsorRejection {
	const issues = [...policyIssues, ...analysisIssues];
	return {
		$kind: 'Rejected',
		issues,
		policyIssues,
		analysisIssues,
		reason: reasonOf(issues, analysisIssues),
	};
}

/**
 * A rejection as an `Error`, for callers who prefer to throw — e.g.
 * `if (result.$kind === 'Rejected') throw new SponsorValidationError(result.issues, result.reason)`.
 * The sponsor never throws this itself.
 */
export class SponsorValidationError extends Error {
	readonly issues: ValidationIssue[];
	readonly reason: SponsorRejectionReason;

	constructor(issues: ValidationIssue[], reason: SponsorRejectionReason = 'POLICY_REJECTED') {
		const summary = issues.map((issue) => issue.message).join('; ');
		super(`Transaction rejected for sponsorship: ${summary}`);
		this.name = 'SponsorValidationError';
		this.issues = issues;
		this.reason = reason;
	}
}
