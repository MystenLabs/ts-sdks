// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '../bcs/index.js';
import type { SuiClientTypes } from './types.js';

/** Decode the complete ledger read model without converting through a PTB builder. */
export function parseTransactionDataBcs(bytes: Uint8Array): SuiClientTypes.TransactionData {
	return bcs.TransactionData.parse(bytes).V1;
}
