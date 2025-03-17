// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { crossNetworkResolution, findNames } from '../src/parsing';

describe('Parsing of project files', () => {
	it('should find all the functionc alls and types in a file', async () => {
		const expected = [
			'@mvr/app/2::demo::test',
			'@mvr/app::type::Type',
			'@mvr/app::type::Type2',
			'@kiosk/core::kiosk::Kiosk',
			'app.sui/app::t::T',
			'@mvr/type::wow::Wow',
			'@mvr/app/2',
			'@mvr/app',
			'@kiosk/core',
			'app.sui/app',
			'@mvr/type',
			// nested directory files
			'@nested/app::demo::test',
			'@nested/app',
		];

		const files = await findNames(resolve(__dirname, 'demo-project'));
		for (const file of expected) expect(files.has(file)).toBe(true);
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
		];

		const expectedResults = {
			mainnet: {
				packages: {
					'@mvr/core/1': '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b',
					'@mvr/metadata': '0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1',
					'@mvr/core/2': '0x0bde14ccbabe5328c867e82495a4c39a3688c69943a5dc333f79029f966f0354',
					'@mvr/subnames-proxy':
						'0x096c9bed5a312b888603f462f22084e470cc8555a275ef61cc12dd83ecf23a04',
				},
				types: {
					'@mvr/core::app_record::AppRecord':
						'0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::app_record::AppRecord',
					'@mvr/metadata::git::GitInfo':
						'0xf6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::git::GitInfo',
					'@mvr/metadata::package_info::PackageInfo':
						'0xf6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::package_info::PackageInfo',
				},
			},
			testnet: {
				packages: {
					'@mvr/metadata': '0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4',
				},
				// TODO: Fix missing types after API deployment.
				types: {
					'@mvr/metadata::git::GitInfo':
						'0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4::git::GitInfo',
					'@mvr/metadata::package_info::PackageInfo':
						'0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4::package_info::PackageInfo',
				},
			},
		};

		const { mainnet, testnet } = await crossNetworkResolution(new Set(expected));
		expect(mainnet).toStrictEqual(expectedResults.mainnet);
		expect(testnet).toStrictEqual(expectedResults.testnet);
	});
});
