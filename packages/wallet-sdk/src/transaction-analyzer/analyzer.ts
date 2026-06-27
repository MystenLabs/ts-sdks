// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import type { Defined, Simplify, UnionToIntersection } from '../util.js';

const OPTIONAL_ANALYZER = Symbol('optionalAnalyzer');

export function optional<T extends Defined, Options, Analysis extends Record<string, Defined>>(
	analyzer: Analyzer<T, Options, Analysis>,
): OptionalAnalyzer<T, Options, Analysis> {
	return {
		[OPTIONAL_ANALYZER]: true,
		analyzer,
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

function isOptionalAnalyzer(dep: AnalyzerDependency): dep is OptionalAnalyzer<Defined, any, any> {
	return OPTIONAL_ANALYZER in dep;
}

function unwrapAnalyzer(dep: AnalyzerDependency): Analyzer<Defined> {
	return isOptionalAnalyzer(dep) ? dep.analyzer : dep;
}

export async function analyze<T extends Record<string, Analyzer<Defined, any, any>>>(
	analyzers: T,
	{ transaction, ...options }: OptionsFromAnalyzers<T>,
) {
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

			Object.values(deps).forEach((dep) => initializeAnalyzer(unwrapAnalyzer(dep)));
		}

		return analyzerMap.get(cacheKey)!;
	}

	Object.values(analyzers).forEach((analyzer) => initializeAnalyzer(analyzer));

	const analysisMap = new Map<unknown, Promise<AnalyzerResult>>();

	async function runAnalyzer(analyzer: Analyzer<Defined>): Promise<AnalyzerResult> {
		const deps = await Promise.all(
			Object.entries((analyzer.dependencies || {}) as Record<string, AnalyzerDependency>).map(
				async ([key, dep]) => [key, dep, await getAnalysis(unwrapAnalyzer(dep))] as const,
			),
		);

		const analysis: Record<string, Defined> = {};
		const inherited = new Set<TransactionAnalysisIssue>();
		let missingRequiredDependency = false;

		for (const [key, dep, result] of deps) {
			if (isOptionalAnalyzer(dep)) {
				analysis[key] = result;
				continue;
			}

			if (result.issues) {
				result.issues.forEach((issue) => inherited.add(issue));
			}

			if (result.status === 'success' || result.status === 'partial') {
				analysis[key] = result.result;
			} else {
				missingRequiredDependency = true;
			}
		}

		if (missingRequiredDependency) {
			return { status: 'skipped', issues: [...inherited], ownIssues: [] };
		}

		try {
			const output = await analyzerMap.get(analyzer.cacheKey ?? analyzer)!(analysis);
			const ownIssues = output.issues ? [...output.issues] : [];
			const issues = [...new Set([...inherited, ...ownIssues])];

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

export type AnalyzerDependency = Analyzer<Defined, any, any> | OptionalAnalyzer<Defined, any, any>;

type DependencyResult<T extends AnalyzerDependency> =
	T extends OptionalAnalyzer<infer R, any, any>
		? AnalyzerResult<R>
		: T extends Analyzer<infer R, any, any>
			? R
			: never;

type DependencyOptions<T extends AnalyzerDependency> =
	T extends OptionalAnalyzer<any, infer O, any>
		? O
		: T extends Analyzer<any, infer O, any>
			? O
			: never;

export interface OptionalAnalyzer<
	T extends Defined,
	Options = object,
	Analysis extends Record<string, Defined> = {},
> {
	[OPTIONAL_ANALYZER]: true;
	analyzer: Analyzer<T, Options, Analysis>;
}

export type AnalyzerStatus = 'success' | 'partial' | 'failed' | 'skipped';

export type AnalyzeStatus = 'complete' | 'partial' | 'failed';

export type Analyzer<
	T extends Defined,
	Options = object,
	Analysis extends Record<string, Defined> = {},
> = {
	cacheKey?: unknown;
	dependencies: Record<string, AnalyzerDependency>;
	analyze: (
		options: Options,
		transaction: Transaction,
	) => (analysis: Analysis) => AnalyzerOutput<T> | Promise<AnalyzerOutput<T>>;
};

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
