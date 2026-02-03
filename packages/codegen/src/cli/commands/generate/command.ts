// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { buildCommand } from '@stricli/core';

export const generateCommand = buildCommand({
	loader: async () => (await import('./impl.js')).default,
	parameters: {
		positional: {
			kind: 'array',
			parameter: {
				parse: String,
				brief: 'package name, mvr name, or path to a move package',
			},
		},
		flags: {
			outputDir: {
				kind: 'parsed',
				parse: String,
				brief: 'Output directory',
				optional: true,
			},
			noPrune: {
				kind: 'parsed',
				parse: Boolean,
				optional: true,
				brief: 'generate all types and functions in dependencies',
			},
			noSummaries: {
				kind: 'parsed',
				parse: Boolean,
				optional: true,
				brief: 'Do not generate summaries for packages',
			},
			network: {
				kind: 'enum',
				values: ['mainnet', 'testnet'],
				optional: true,
				brief: 'Network to generate for (default: testnet)',
			},
			importExtension: {
				kind: 'enum',
				values: ['.js', '.ts', 'none'],
				optional: true,
				brief: 'File extension for import statements (default: .js)',
			},
			modules: {
				kind: 'parsed',
				parse: String,
				optional: true,
				variadic: ',',
				brief: 'Only generate from these modules (comma-separated)',
			},
			noTypes: {
				kind: 'parsed',
				parse: Boolean,
				optional: true,
				brief: 'Skip type generation',
			},
			noFunctions: {
				kind: 'parsed',
				parse: Boolean,
				optional: true,
				brief: 'Skip function generation',
			},
			private: {
				kind: 'enum',
				values: ['none', 'entry', 'all'],
				optional: true,
				brief: 'Which private functions to generate (default: entry)',
			},
		},
		aliases: {
			o: 'outputDir',
			n: 'network',
			m: 'modules',
		},
	},
	docs: {
		brief: 'Generate BCS and moveCall helpers from you Move code',
	},
});
