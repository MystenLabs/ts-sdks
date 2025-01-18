// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as object from './object.js';

export function Versioned() {
	return bcs.struct('Versioned', {
		id: object.UID(),
		version: bcs.u64(),
	});
}
export function VersionChangeCap() {
	return bcs.struct('VersionChangeCap', {
		versioned_id: bcs.Address,
		old_version: bcs.u64(),
	});
}
