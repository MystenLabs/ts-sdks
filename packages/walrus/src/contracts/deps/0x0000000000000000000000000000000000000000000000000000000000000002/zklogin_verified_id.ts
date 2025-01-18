// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as object from './object.js';

export function VerifiedID() {
	return bcs.struct('VerifiedID', {
		id: object.UID(),
		owner: bcs.Address,
		key_claim_name: bcs.string(),
		key_claim_value: bcs.string(),
		issuer: bcs.string(),
		audience: bcs.string(),
	});
}
