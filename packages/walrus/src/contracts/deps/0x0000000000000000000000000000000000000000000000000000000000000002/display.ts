// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as object from './object.js';
import * as vec_map from './vec_map.js';

export function Display() {
	return bcs.struct('Display', {
		id: object.UID(),
		fields: vec_map.VecMap(bcs.string(), bcs.string()),
		version: bcs.u16(),
	});
}
export function DisplayCreated() {
	return bcs.struct('DisplayCreated', {
		id: bcs.Address,
	});
}
export function VersionUpdated() {
	return bcs.struct('VersionUpdated', {
		id: bcs.Address,
		version: bcs.u16(),
		fields: vec_map.VecMap(bcs.string(), bcs.string()),
	});
}
