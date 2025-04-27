// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SUI_RANDOM_OBJECT_ID } from '../../../src/utils/constants';
import { describe, expect, it } from 'vitest';

describe('SUI Constants', () => {
	it('should correctly normalize SUI_RANDOM_OBJECT_ID', () => {
		expect(SUI_RANDOM_OBJECT_ID).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000008',
		);
	});
});
