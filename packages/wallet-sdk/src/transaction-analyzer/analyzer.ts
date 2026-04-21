// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import type { Defined, Simplify, UnionToIntersection } from '../util.js';

export function createAnalyzer<
	T extends Defined,
	Deps extends Record<string, Analyzer<Defined, any, any>> = {},
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
		[k in keyof Deps]: Deps[k] extends Analyzer<infer R, any, any> ? R : never;
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
						[k in keyof Deps]: Deps[k] extends Analyzer<any, infer O, any> ? O : never;
				  }[keyof Deps]
			>
		>,
		{
			[k in keyof Deps]: Deps[k] extends Analyzer<infer R, any, any> ? R : never;
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
			const deps: Record<string, Analyzer<Defined>> = analyzer.dependencies || {};
			analyzerMap.set(cacheKey, analyzer.analyze(options, tx));

			Object.values(deps).forEach((dep) => initializeAnalyzer(dep));
		}

		return analyzerMap.get(cacheKey)!;
	}

	Object.values(analyzers).forEach((analyzer) => initializeAnalyzer(analyzer));

	const analysisMap = new Map<unknown, Promise<AnalyzerResult>>();

	async function runAnalyzer(analyzer: Analyzer<Defined>): Promise<AnalyzerResult> {
		const deps: Record<string, AnalyzerResult> = Object.fromEntries(
			await Promise.all(
				Object.entries((analyzer.dependencies || {}) as Record<string, Analyzer<Defined>>).map(
					async ([key, dep]) => [key, await getAnalysis(dep)],
				),
			),
		);

		const inherited = new Set<TransactionAnalysisIssue>();

		for (const dep of Object.values(deps)) {
			if (dep.issues) {
				dep.issues.forEach((issue) => inherited.add(issue));
			}
		}

		if (inherited.size) {
			return { issues: [...inherited], ownIssues: [] };
		}

		try {
			const output = await analyzerMap.get(analyzer.cacheKey ?? analyzer)!(
				Object.fromEntries(Object.entries(deps).map(([key, dep]) => [key, dep.result])),
			);

			if (output.issues) {
				return { issues: [...output.issues], ownIssues: [...output.issues] };
			}
			return { result: output.result };
		} catch (error) {
			const issue = {
				message: `Unexpected error while analyzing transaction: ${(error as Error).message}`,
			};
			return { issues: [issue], ownIssues: [issue] };
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

	return { ...perAnalyzer, issues };
}

export type Analyzer<
	T extends Defined,
	Options = object,
	Analysis extends Record<string, Defined> = {},
> = {
	cacheKey?: unknown;
	dependencies: {
		[k in keyof Analysis]: Analyzer<Analysis[k], Options>;
	};
	analyze: (
		options: Options,
		transaction: Transaction,
	) => (analysis: Analysis) => AnalyzerOutput<T> | Promise<AnalyzerOutput<T>>;
};

export type AnalyzerOutput<T extends Defined = Defined> =
	| {
			result: T;
			issues?: never;
	  }
	| {
			issues: TransactionAnalysisIssue[];
			result?: never;
	  };

export type AnalyzerResult<T extends Defined = Defined> =
	| {
			result: T;
			issues?: never;
			ownIssues?: never;
	  }
	| {
			result?: never;
			issues: TransactionAnalysisIssue[];
			ownIssues: TransactionAnalysisIssue[];
	  };

export interface TransactionAnalysisIssue {
	message: string;
	error?: Error;
}
