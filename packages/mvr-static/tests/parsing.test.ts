// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { crossNetworkResolution, findNames } from '../src/parsing';

describe.concurrent('Parsing of project files', () => {
	it('should find all the function calls and types in a file', async () => {
		const expected = [
			'@mvr/app/2::demo::test',
			'@mvr/app::type::Type',
			'@mvr/app::type::Type2',
			'@kiosk/core::kiosk::Kiosk',
			'app.sui/app::t::T',
			'@mvr/app/2',
			'@mvr/app',
			'@kiosk/core',
			'app.sui/app',
			'@pkg/qwer',
			// nested directory files
			'@nested/app::demo::test',
			'@nested/app',
			'@pkg/qwer::mvr_a::V1',
			'@pkg/qwer::mvr_b::V2',
		];

		const files = await findNames({ directory: resolve(__dirname, 'demo-project') });
		for (const file of expected) {
			expect(files).toContain(file);
		}
	});

	it('should find function calls (etc) with some specific patterns', async () => {
		// only include specific pattern
		const limitedInclusionFiles = await findNames({
			directory: resolve(__dirname, 'demo-project'),
			include: ['nested/**/*.js'],
		});

		expect([...limitedInclusionFiles]).toEqual(['@nested/app::demo::test', '@nested/app']);

		// exclude specific pattern
		const excludedFiles = await findNames({
			directory: resolve(__dirname, 'demo-project'),
			exclude: ['nested/**/*.js'],
		});

		expect(excludedFiles).not.toContain('@nested/app::demo::test');
		expect(excludedFiles).not.toContain('@nested/app');

		// depth = 0, so we only check root (index.ts file)
		const noDepth = await findNames({
			directory: resolve(__dirname, 'demo-project'),
			depth: 0,
		});

		expect(noDepth).not.toContain('@nested/app::demo::test');
		expect(noDepth).not.toContain('@nested/app');
	});

	it('Should properly resolve packages and types in both networks', async () => {
		const expected = [
			'@mvr/core/1',
			'@mvr/core/2',
			'@mvr/metadata',
			'@mvr/subnames-proxy',
			'@mvr/core::app_record::AppRecord',
			'@mvr/metadata::git::GitInfo',
			'@mvr/metadata::package_info::PackageInfo',
			'@pkg/qwer::mvr_a::V1',
			'@pkg/qwer::mvr_b::V2',
		];

		const expectedResults = {
			mainnet: {
				packages: {
					'@mvr/core/1': '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b',
					'@mvr/metadata': '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98',
					'@mvr/core/2': '0x0bde14ccbabe5328c867e82495a4c39a3688c69943a5dc333f79029f966f0354',
					'@mvr/subnames-proxy':
						'0x096c9bed5a312b888603f462f22084e470cc8555a275ef61cc12dd83ecf23a04',
				},
				types: {
					'@mvr/core::app_record::AppRecord':
						'0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::app_record::AppRecord',
					'@mvr/metadata::git::GitInfo':
						'0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::git::GitInfo',
					'@mvr/metadata::package_info::PackageInfo':
						'0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::package_info::PackageInfo',
					'@pkg/qwer::mvr_a::V1':
						'0xc168b8766e69c07b1b5ed194e3dc2b4a2a0e328ae6a06a2cae40e2ec83a3f94f::mvr_a::V1',
					'@pkg/qwer::mvr_b::V2':
						'0x01dcc0337dfe29d3a20fbaceb28febc424e6b8631e93338ed574b40aadc2a9ea::mvr_b::V2',
				},
			},
			testnet: {
				packages: {
					'@mvr/metadata': '0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4',
				},
				types: {
					'@mvr/metadata::git::GitInfo':
						'0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4::git::GitInfo',
					'@mvr/metadata::package_info::PackageInfo':
						'0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4::package_info::PackageInfo',
					'@pkg/qwer::mvr_a::V1':
						'0x077adfd262090b6645ea05087e252796a205d0369f165c99aa8147f3c678b579::mvr_a::V1',
					'@pkg/qwer::mvr_b::V2':
						'0x6b991ed7e0164d0927df2eaf4fb075d528b4b86d6feee35711cf8d49f2538691::mvr_b::V2',
				},
			},
		};

		const { mainnet, testnet } = await crossNetworkResolution(new Set(expected));
		expect(mainnet).toStrictEqual(expectedResults.mainnet);
		expect(testnet).toStrictEqual(expectedResults.testnet);
	});
});
