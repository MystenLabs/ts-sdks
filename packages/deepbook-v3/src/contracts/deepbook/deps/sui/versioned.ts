// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
const $moduleName = '0x2::versioned';
export const Versioned = new MoveStruct({
	name: `${$moduleName}::Versioned`,
	fields: {
		id: object.UID,
		version: bcs.u64(),
	},
});
