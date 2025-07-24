// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct } from '../utils/index.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@suins/coupons::data';
export const Data = new MoveStruct(`${$moduleName}::Data`, {
	coupons: bag.Bag,
});
