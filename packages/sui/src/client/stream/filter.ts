// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerStreamRequest } from '../core.js';
import { validateEventFilter, validateTransactionFilter } from '../query-filters.js';
import { SuiStreamError } from './errors.js';

/** Rejects an invalid `filter` with `InvalidOptions` before any request, as the list methods do. */
export function validateStreamFilter(request: LedgerStreamRequest): void {
	if (request.family === 'checkpoints' || !request.options.filter) return;
	try {
		if (request.family === 'transactions') validateTransactionFilter(request.options.filter);
		else validateEventFilter(request.options.filter);
	} catch (error) {
		throw new SuiStreamError('InvalidOptions', (error as Error).message, { cause: error });
	}
}
