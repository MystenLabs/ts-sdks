// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as table from './table.js';

export function TableVec() {
	return bcs.struct('TableVec', {
		contents: table.Table(),
	});
}
