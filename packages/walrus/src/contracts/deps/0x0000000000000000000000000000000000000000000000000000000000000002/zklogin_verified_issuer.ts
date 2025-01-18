// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as object from './object.js';

export function VerifiedIssuer() {
	return bcs.struct('VerifiedIssuer', {
		id: object.UID(),
		owner: bcs.Address,
		issuer: bcs.string(),
	});
}
