// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import type { Defined, Simplify, UnionToIntersection } from '../util.js';

/**
 * Declare a dependency on `analyzer` that does NOT short-circuit the parent when
 * it fails: the parent always runs and receives the dependency's full
 * {@link AnalyzerResult} (so it can inspect `status`/`issues`) rather than the
 * unwrapped result. Sugar for `{ analyzer, required: false, transform: (r) => r }`
 * — see {@link Dependency} for the general (required + custom `transform`) form.
 */
export function optional<T extends Defined, Options, Analysis extends Record<string, Defined>>(
	analyzer: Analyzer<T, Options, Analysis>,
): Dependency<T, AnalyzerResult<T>, Options, Analysis> {
	return {
		analyzer,
		required: false,
		transform: (result) => result,
	};
}

export function createAnalyzer<
	T extends Defined,
	Deps extends Record<string, AnalyzerDependency> = {},
	Options = object,
>({
	cacheKey,
	dependencies,
	analyze,
}: {
	cacheKey?: unknown;
	dependencies?: Deps;
	analyze: (
		options: Options,
		transaction: Transaction,
	) => (analysis: {
		[k in keyof Deps]: DependencyResult<Deps[k]>;
	}) => Promise<AnalyzerOutput<T>> | AnalyzerOutput<T>;
}) {
	return {
		cacheKey,
		dependencies,
		analyze: analyze,
	} as Analyzer<
		T,
		Simplify<
			UnionToIntersection<
				| Options
				| {
						[k in keyof Deps]: DependencyOptions<Deps[k]>;
				  }[keyof Deps]
			>
		>,
		{
			[k in keyof Deps]: DependencyResult<Deps[k]>;
		}
	>;
}

type OptionsFromAnalyzers<T extends Record<string, Analyzer<Defined, any, any>>> = Simplify<
	{
		[K in keyof T]: T[K] extends Analyzer<Defined, infer O, any> ? O : never;
	}[keyof T] & {
		transaction: string | Uint8Array;
	}
>;

/** A dependency edge, normalized to its three intrinsic parts. */
interface NormalizedDependency {
	analyzer: Analyzer<Defined>;
	/** Required deps short-circuit the parent (→ `skipped`) when they produce no result. */
	required: boolean;
	/** Maps the dependency's full result to the value the parent sees. */
	transform: (result: AnalyzerResult) => Defined;
}

/** The unwrapping transform applied to bare-analyzer dependencies by default. */
function unwrapResult(result: AnalyzerResult): Defined {
	return (result as { result?: Defined }).result as Defined;
}

/** The identity transform applied to optional dependency objects by default. */
function identityResult(result: AnalyzerResult): Defined {
	return result;
}

function isDependency(dep: AnalyzerDependency): dep is Dependency<Defined, Defined, any, any> {
	return 'analyzer' in dep;
}

function normalizeDependency(dep: AnalyzerDependency): NormalizedDependency {
	if (isDependency(dep)) {
		const required = dep.required ?? true;
		return {
			analyzer: dep.analyzer,
			required,
			transform: (dep.transform ?? (required ? unwrapResult : identityResult)) as (
				result: AnalyzerResult,
			) => Defined,
		};
	}

	return { analyzer: dep as Analyzer<Defined>, required: true, transform: unwrapResult };
}

export async function analyze<T extends Record<string, Analyzer<Defined, any, any>>>(
	analyzers: T,
	{ transaction, ...options }: OptionsFromAnalyzers<T>,
) {
	if (Object.prototype.hasOwnProperty.call(analyzers, 'status')) {
		throw new Error('Analyzer key "status" is reserved for the top-level analysis status');
	}

	const tx = Transaction.from(transaction);
	const analyzerMap = new Map<
		unknown,
		(analysis: object) => AnalyzerOutput | Promise<AnalyzerOutput>
	>();

	function initializeAnalyzer(analyzer: Analyzer<Defined>) {
		const cacheKey = analyzer.cacheKey ?? analyzer;

		if (!analyzerMap.has(cacheKey)) {
			const deps: Record<string, AnalyzerDependency> = analyzer.dependencies || {};
			analyzerMap.set(cacheKey, analyzer.analyze(options, tx));

			Object.values(deps).forEach((dep) => initializeAnalyzer(normalizeDependency(dep).analyzer));
		}

		return analyzerMap.get(cacheKey)!;
	}

	Object.values(analyzers).forEach((analyzer) => initializeAnalyzer(analyzer));

	const analysisMap = new Map<unknown, Promise<AnalyzerResult>>();

	async function runAnalyzer(analyzer: Analyzer<Defined>): Promise<AnalyzerResult> {
		const deps = await Promise.all(
			Object.entries((analyzer.dependencies || {}) as Record<string, AnalyzerDependency>).map(
				async ([key, dep]) => {
					const normalized = normalizeDependency(dep);
					return [key, normalized, await getAnalysis(normalized.analyzer)] as const;
				},
			),
		);

		const analysis: Record<string, Defined> = {};
		const inherited = new Set<TransactionAnalysisIssue>();
		let missingRequiredDependency = false;

		try {
			for (const [key, { required, transform }, result] of deps) {
				// Optional deps never gate and never inherit issues: the parent owns the full
				// result (default `transform` for `optional()` and explicit optional objects is
				// identity) and decides itself.
				if (!required) {
					analysis[key] = transform(result);
					continue;
				}

				if (result.issues) {
					result.issues.forEach((issue) => inherited.add(issue));
				}

				// A required dep that produced no result (`failed`/`skipped`) short-circuits the
				// parent. `partial` still has a result, so it proceeds — `partial` is only
				// meaningful at the outer `analyze()` layer, not at a dependency boundary.
				if (result.status === 'success' || result.status === 'partial') {
					analysis[key] = transform(result);
				} else {
					missingRequiredDependency = true;
				}
			}

			if (missingRequiredDependency) {
				return { status: 'skipped', issues: [...inherited], ownIssues: [] };
			}

			const output = await analyzerMap.get(analyzer.cacheKey ?? analyzer)!(analysis);
			const ownIssues = output.issues ? [...output.issues] : [];
			const issues = [...new Set([...inherited, ...ownIssues])];

			// Intentional `!== undefined` (not truthiness): falsy results (`0`, `''`,
			// `false`, `null`) are valid and must stay `success`/`partial`. Do not refactor
			// to `if (output.result)` — that would silently reclassify them as `failed`.
			if (output.result !== undefined) {
				if (issues.length) {
					return { status: 'partial', result: output.result, issues, ownIssues };
				}
				return { status: 'success', result: output.result };
			}

			return { status: 'failed', issues, ownIssues };
		} catch (error) {
			const issue = {
				message: `Unexpected error while analyzing transaction: ${(error as Error).message}`,
			};
			return {
				status: 'failed',
				issues: [...new Set([...inherited, issue])],
				ownIssues: [issue],
			};
		}
	}

	function getAnalysis(analyzer: Analyzer<Defined>): Promise<AnalyzerResult> {
		const cacheKey = analyzer.cacheKey ?? analyzer;

		if (!analysisMap.has(cacheKey)) {
			analysisMap.set(cacheKey, runAnalyzer(analyzer));
		}

		return analysisMap.get(cacheKey)!;
	}

	const perAnalyzer = Object.fromEntries(
		await Promise.all(
			Object.entries(analyzers).map(async ([key, analyzer]) => [key, await getAnalysis(analyzer)]),
		),
	) as {
		[k in keyof T]: T[k] extends Analyzer<infer R, any, any> ? AnalyzerResult<R> : never;
	};

	const issues: TransactionAnalysisIssue[] = [];
	for (const pending of analysisMap.values()) {
		const result = await pending;
		if (result.ownIssues) issues.push(...result.ownIssues);
	}

	const topLevelResults = Object.values(perAnalyzer);
	const hasSuccessfulResult = topLevelResults.some(
		(result) => result.status === 'success' || result.status === 'partial',
	);
	const status: AnalyzeStatus = topLevelResults.every((result) => result.status === 'success')
		? 'complete'
		: hasSuccessfulResult
			? 'partial'
			: 'failed';

	return { ...perAnalyzer, issues, status };
}

/**
 * A dependency edge. A bare {@link Analyzer} is sugar for a required edge whose
 * value is the unwrapped result. The explicit object form lets you declare an
 * edge `required: false` (the parent never short-circuits on it) and/or map the
 * dependency's full {@link AnalyzerResult} to a custom value via `transform`.
 * An optional edge without a `transform` receives the full {@link AnalyzerResult}.
 */
export interface Dependency<
	R extends Defined,
	V extends Defined = R,
	Options = object,
	Analysis extends Record<string, Defined> = {},
> {
	analyzer: Analyzer<R, Options, Analysis>;
	/** Whether a failed/skipped dependency short-circuits the parent. Default: `true`. */
	required?: boolean;
	/**
	 * Maps the dependency's full result to the value the parent sees. Default:
	 * `(r) => r.result` for required edges and `(r) => r` for optional edges.
	 */
	transform?: (result: AnalyzerResult<R>) => V;
}

export type AnalyzerDependency = Analyzer<Defined, any, any> | Dependency<any, Defined, any, any>;

type DependencyResult<T extends AnalyzerDependency> = T extends {
	transform: (result: AnalyzerResult<any>) => infer V;
}
	? V
	: T extends { analyzer: Analyzer<infer R, any, any>; required: false; transform?: undefined }
		? AnalyzerResult<R>
		: T extends Dependency<any, infer V, any, any>
			? V
			: T extends Analyzer<infer R, any, any>
				? R
				: never;

type DependencyOptions<T extends AnalyzerDependency> =
	T extends Dependency<any, any, infer O, any>
		? O
		: T extends Analyzer<any, infer O, any>
			? O
			: never;

export type AnalyzerStatus = 'success' | 'partial' | 'failed' | 'skipped';

export type AnalyzeStatus = 'complete' | 'partial' | 'failed';

export type Analyzer<
	T extends Defined,
	Options = object,
	Analysis extends Record<string, Defined> = {},
> = {
	cacheKey?: unknown;
	dependencies: AnalyzerDependencies<Analysis>;
	analyze: (
		options: Options,
		transaction: Transaction,
	) => (analysis: Analysis) => AnalyzerOutput<T> | Promise<AnalyzerOutput<T>>;
};

type IsAny<T> = 0 extends 1 & T ? true : false;
type AnalyzerDependencies<Analysis extends Record<string, Defined>> =
	IsAny<Analysis> extends true
		? Record<string, AnalyzerDependency>
		: { [K in keyof Analysis]: AnalyzerDependency } & Record<string, AnalyzerDependency>;

export type AnalyzerOutput<T extends Defined = Defined> =
	| {
			result: T;
			issues?: TransactionAnalysisIssue[];
	  }
	| {
			issues: TransactionAnalysisIssue[];
			result?: never;
	  };

export type AnalyzerResult<T extends Defined = Defined> =
	| {
			status: 'success';
			result: T;
			issues?: never;
			ownIssues?: never;
	  }
	| {
			status: 'partial';
			result: T;
			issues: TransactionAnalysisIssue[];
			ownIssues: TransactionAnalysisIssue[];
	  }
	| {
			status: 'failed';
			result?: never;
			issues: TransactionAnalysisIssue[];
			ownIssues: TransactionAnalysisIssue[];
	  }
	| {
			status: 'skipped';
			result?: never;
			issues: TransactionAnalysisIssue[];
			ownIssues: [];
	  };

export interface TransactionAnalysisIssue {
	message: string;
	error?: Error;
}
