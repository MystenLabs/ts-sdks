// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `plpMoveCalls`: the generated `plp` bindings, with the argument keys
// `snapshot_expiry_pricer` shipped with (see `rename.ts`). Predict version 6 retires it (it aborts
// `EUseV2`) and underscore-prefixed its parameters.

import * as generated from '../../contracts/deepbook_predict/plp.js';
import { withShippedKeys } from './rename.js';

export * from '../../contracts/deepbook_predict/plp.js';

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Use `snapshotExpiryPricerV2`. */
export const snapshotExpiryPricer = withShippedKeys(generated.snapshotExpiryPricer, [
	'vault',
	'market',
	'config',
	'propbookRegistry',
	'pyth',
	'bsValues',
	'bsSvi',
]);

// The options and argument types of the wrappers above, with the shipped keys. They replace the
// generated types of the same names, which carry the capitalized keys.
export type SnapshotExpiryPricerOptions = Parameters<typeof snapshotExpiryPricer>[0];
export type SnapshotExpiryPricerArguments = Exclude<
	SnapshotExpiryPricerOptions['arguments'],
	readonly unknown[]
>;
