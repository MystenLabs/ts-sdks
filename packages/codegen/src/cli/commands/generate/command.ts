// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { buildCommand } from '@stricli/core';

export const generateCommand = buildCommand({
	loader: async () => (await import('./impl.js')).default,
	parameters: {
		flags: {
			outputDir: {
				kind: 'parsed',
				parse: String,
				brief: 'Output directory',
			},
			summary: {
				kind: 'parsed',
				parse: String,
				variadic: true,
				optional: true,
				brief: 'path to a move package with a package_summary',
			},
			noPrune: {
				kind: 'parsed',
				parse: Boolean,
				optional: true,
				brief: 'generate all types and functions in dependencies',
			},
		},
		aliases: {
			o: 'outputDir',
			s: 'summary',
		},
	},
	docs: {
		brief: 'Generate BCS and moveCall helpers from you Move code',
	},
});
