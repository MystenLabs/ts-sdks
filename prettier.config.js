// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
	printWidth: 100,
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'all',
	useTabs: true,
	// TODO: Add this back in:
	// plugins: ['@ianvs/prettier-plugin-sort-imports'],
	importOrderParserPlugins: ['typescript', 'jsx', 'decorators'],
	importOrder: [
		'<BUILT_IN_MODULES>',
		'<THIRD_PARTY_MODULES>',
		'',
		'^@/(.*)$',
		'^~/(.*)$',
		'',
		'^[.]',
	],
	overrides: [
		{
			files: 'packages/**/*',
			options: {
				proseWrap: 'always',
			},
		},
		{
			files: 'external-crates/move/documentation/book/**/*',
			options: {
				proseWrap: 'always',
			},
		},
	],
};
