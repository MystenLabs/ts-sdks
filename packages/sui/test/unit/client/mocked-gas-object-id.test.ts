// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { isMockedGasObjectId } from '../../../src/client/utils.js';
import { MOCKED_GAS_OBJECT_ID } from '../../../src/utils/index.js';

describe('isMockedGasObjectId', () => {
	it('matches the mocked gas object id regardless of normalization', () => {
		expect(isMockedGasObjectId(MOCKED_GAS_OBJECT_ID)).toBe(true);
		expect(isMockedGasObjectId(MOCKED_GAS_OBJECT_ID.slice(2))).toBe(true);
		expect(isMockedGasObjectId(`0x${MOCKED_GAS_OBJECT_ID.slice(2).toUpperCase()}`)).toBe(true);
	});

	it('returns false for other object ids and missing values', () => {
		expect(isMockedGasObjectId('0x5')).toBe(false);
		expect(isMockedGasObjectId('0x' + 'f'.repeat(63) + 'e')).toBe(false);
		expect(isMockedGasObjectId(null)).toBe(false);
		expect(isMockedGasObjectId(undefined)).toBe(false);
	});
});
