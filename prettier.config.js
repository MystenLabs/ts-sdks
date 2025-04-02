// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
	printWidth: 100,
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'all',
	useTabs: true,
	overrides: [
		{
			files: 'packages/**/*',
			options: {
				proseWrap: 'always',
			},
		},
		{
			plugins: ['@ianvs/prettier-plugin-sort-imports'],
			files: 'packages/**/*.tsx?',
			options: {
				proseWrap: 'always',
				importOrder: [
					'<BUILT_IN_MODULES>',
					'<THIRD_PARTY_MODULES>',
					'',
					'^@/(.*)$',
					'^~/(.*)$',
					'',
					'^[.]',
				],
			},
		},
	],
};
