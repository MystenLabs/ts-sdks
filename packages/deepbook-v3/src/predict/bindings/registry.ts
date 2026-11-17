// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `registryMoveCalls`: the generated `registry` bindings, with the argument keys the
// market-creation calls shipped with (see `rename.ts`). Predict version 6 retires them (they abort
// `EUseV2`) and underscore-prefixed their parameters.

import * as generated from '../../contracts/deepbook_predict/registry.js';
import { withShippedKeys } from './rename.js';

export * from '../../contracts/deepbook_predict/registry.js';

const CREATE_KEYS = [
	'registry',
	'poolVault',
	'config',
	'propbookRegistry',
	'lifecycleCap',
	'propbookUnderlyingId',
	'cadenceId',
] as const;

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Use `createAndShareExpiryMarketV2`. */
export const createAndShareExpiryMarket = withShippedKeys(
	generated.createAndShareExpiryMarket,
	CREATE_KEYS,
);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Use `createAndShareExpiryMarketV2`. */
export const createAndShareExpiryMarketAt = withShippedKeys(
	generated.createAndShareExpiryMarketAt,
	[...CREATE_KEYS, 'expectedExpiry'],
);
