// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import { Transaction } from '@mysten/sui/transactions';

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
	}) => Promise<AnalyzerResult<T>> | AnalyzerResult<T>;
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
		(analysis: object) => AnalyzerResult | Promise<AnalyzerResult>
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

		const issues = new Set<TransactionAnalysisIssue>();

		for (const dep of Object.values(deps)) {
			if (dep.issues) {
				dep.issues.forEach((issue) => issues.add(issue));
			}
		}

		if (issues.size) {
			return { issues: [...issues] };
		}

		try {
			const result = await analyzerMap.get(analyzer.cacheKey ?? analyzer)!(
				Object.fromEntries(Object.entries(deps).map(([key, dep]) => [key, dep.result])),
			);

			return result;
		} catch (error) {
			return {
				issues: [
					{ message: `Unexpected error while analyzing transaction: ${(error as Error).message}` },
				],
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

	return Object.fromEntries(
		await Promise.all(
			Object.entries(analyzers).map(async ([key, analyzer]) => [key, await getAnalysis(analyzer)]),
		),
	) as {
		[k in keyof T]: T[k] extends Analyzer<infer R, any, any> ? AnalyzerResult<R> : never;
	};
}

type Defined = {} | null;
type Simplify<T> = { [K in keyof T]: T[K] } & {};
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never;

type Analyzer<
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
	) => (analysis: Analysis) => AnalyzerResult<T> | Promise<AnalyzerResult<T>>;
};

export type AnalyzerResult<T extends Defined = Defined> =
	| {
			result: T;
			issues?: never;
	  }
	| {
			issues: TransactionAnalysisIssue[];
			result?: never;
	  };

export interface TransactionAnalysisIssue {
	message: string;
	error?: Error;
}
