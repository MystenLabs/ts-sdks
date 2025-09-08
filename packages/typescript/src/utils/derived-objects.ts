// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TypeTag } from '../bcs/bcs.js';
import { deriveDynamicFieldID } from './dynamic-fields.js';

/**
 * Derive the ID of an object that has been created through `derived_object`.
 */
export function deriveObjectID(
	parentId: string,
	typeTag: typeof TypeTag.$inferInput,
	key: Uint8Array,
) {
	return deriveDynamicFieldID(
		parentId,
		`0x2::derived_object::DerivedObjectKey<${typeTag.toString()}>`,
		key,
	);
}
