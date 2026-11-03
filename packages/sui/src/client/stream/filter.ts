// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidSuiAddress, normalizeSuiAddress } from '../../utils/sui-types.js';
import type { LedgerStreamRequest } from '../core.js';
import { hasMvrName } from '../mvr.js';
import { validateEventFilter, validateTransactionFilter } from '../query-filters.js';
import { SuiStreamError } from './errors.js';

/**
 * Rejects an invalid `filter` with `InvalidOptions` before any request. Addresses are checked here
 * too, so both transports reject a malformed one with the same error.
 */
export function validateStreamFilter(request: LedgerStreamRequest): void {
	if (request.family === 'checkpoints' || !request.options.filter) return;
	try {
		if (request.family === 'transactions') {
			const filter = request.options.filter;
			validateTransactionFilter(filter);
			assertAddresses(filter, ['sender', 'affectedAddress', 'affectedObject']);
			assertPackage(filter, 'function');
		} else {
			const filter = request.options.filter;
			validateEventFilter(filter);
			assertAddresses(filter, ['sender']);
			assertPackage(filter, 'emitModule');
			assertPackage(filter, 'eventType');
		}
	} catch (error) {
		throw new SuiStreamError('InvalidOptions', (error as Error).message, { cause: error });
	}
}

function assertAddresses<Filter extends object>(filter: Filter, fields: (keyof Filter & string)[]) {
	for (const field of fields) {
		const value = filter[field];
		if (typeof value === 'string' && !isValidSuiAddress(normalizeSuiAddress(value))) {
			throw new Error(`Invalid ${field} filter "${value}": expected a Sui address`);
		}
	}
}

/** The package before the first `::` must be an address unless it is an MVR name. */
function assertPackage<Filter extends object>(filter: Filter, field: keyof Filter & string) {
	const value = filter[field];
	if (typeof value !== 'string') return;
	const pkg = value.split('::')[0];
	if (!hasMvrName(pkg) && !isValidSuiAddress(normalizeSuiAddress(pkg))) {
		throw new Error(`Invalid ${field} filter "${value}": "${pkg}" is not a package address`);
	}
}
