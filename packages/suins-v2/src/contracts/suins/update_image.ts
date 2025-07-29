// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** This module is deprecated due to our different approach to display. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@suins/core::update_image';
export const UpdateImage = new MoveStruct({
	name: `${$moduleName}::UpdateImage`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
