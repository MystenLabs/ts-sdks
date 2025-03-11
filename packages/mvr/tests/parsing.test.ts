// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { findDetectedNamesInFiles } from '../src/index';

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

		const files = await findDetectedNamesInFiles(resolve(__dirname, 'demo-project'));
		for (const file of expected) expect(files.has(file)).toBe(true);
	});
});
