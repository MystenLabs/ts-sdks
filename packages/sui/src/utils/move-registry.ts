// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidNamedPackage, NAME_SEPARATOR } from './named-packages.js';
import { isValidStructTag } from './sui-types.js';

export { isValidNamedPackage } from './named-packages.js';

/**
 * Checks if a type contains valid named packages and is a valid Move struct tag.
 */
export const isValidNamedType = (type: string): boolean => {
	// split our type by all possible type delimeters.
	const splitType = type.split(/::|<|>|,/);
	for (const t of splitType) {
		if (t.includes(NAME_SEPARATOR) && !isValidNamedPackage(t)) return false;
	}
	return isValidStructTag(type);
};
