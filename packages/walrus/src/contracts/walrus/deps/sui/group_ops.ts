// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Generic Move and native functions for group operations. */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::group_ops';
export const Element = new MoveStruct({
	name: `${$moduleName}::Element`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
