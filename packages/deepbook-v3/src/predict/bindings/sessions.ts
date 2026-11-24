// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `sessionsMoveCalls`: the generated `sessions` bindings, with the argument keys the
// Sessions version 4 queued Predict wrappers shipped with (see `rename.ts`). Sessions version 5
// underscore-prefixed their Propbook parameters: they forward to the oracle-free `_v2` wrappers
// and ignore them.

import * as generated from '../../contracts/deepbook_sessions/sessions.js';
import { withShippedKeys } from './rename.js';

export * from '../../contracts/deepbook_sessions/sessions.js';

const PROPBOOK_KEYS = ['propbookRegistry', 'pyth', 'bsValues', 'bsSvi'] as const;

/** Sessions version 4 placement. From version 5 it ignores its Propbook objects: use `enqueueExactQuantityV2`. */
export const enqueueExactQuantity = withShippedKeys(generated.enqueueExactQuantity, PROPBOOK_KEYS);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects. */
export const enqueueExactQuantityWithBuilder = withShippedKeys(
	generated.enqueueExactQuantityWithBuilder,
	PROPBOOK_KEYS,
);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects: use `enqueueExactAmountV2`. */
export const enqueueExactAmount = withShippedKeys(generated.enqueueExactAmount, PROPBOOK_KEYS);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects. */
export const enqueueExactAmountWithBuilder = withShippedKeys(
	generated.enqueueExactAmountWithBuilder,
	PROPBOOK_KEYS,
);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects: use `enqueueExactCostV2`. */
export const enqueueExactCost = withShippedKeys(generated.enqueueExactCost, PROPBOOK_KEYS);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects. */
export const enqueueExactCostWithBuilder = withShippedKeys(
	generated.enqueueExactCostWithBuilder,
	PROPBOOK_KEYS,
);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects: use `enqueueRedeemOpenV2`. */
export const enqueueRedeemOpen = withShippedKeys(generated.enqueueRedeemOpen, PROPBOOK_KEYS);
/** Sessions version 4 placement. From version 5 it ignores its Propbook objects. */
export const enqueueRedeemOpenWithBuilder = withShippedKeys(
	generated.enqueueRedeemOpenWithBuilder,
	PROPBOOK_KEYS,
);

// The options and argument types of the wrappers above, with the shipped keys. They replace the
// generated types of the same names, which carry the capitalized keys.
export type EnqueueExactQuantityOptions = Parameters<typeof enqueueExactQuantity>[0];
export type EnqueueExactQuantityArguments = Exclude<
	EnqueueExactQuantityOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueExactQuantityWithBuilderOptions = Parameters<
	typeof enqueueExactQuantityWithBuilder
>[0];
export type EnqueueExactQuantityWithBuilderArguments = Exclude<
	EnqueueExactQuantityWithBuilderOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueExactAmountOptions = Parameters<typeof enqueueExactAmount>[0];
export type EnqueueExactAmountArguments = Exclude<
	EnqueueExactAmountOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueExactAmountWithBuilderOptions = Parameters<
	typeof enqueueExactAmountWithBuilder
>[0];
export type EnqueueExactAmountWithBuilderArguments = Exclude<
	EnqueueExactAmountWithBuilderOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueExactCostOptions = Parameters<typeof enqueueExactCost>[0];
export type EnqueueExactCostArguments = Exclude<
	EnqueueExactCostOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueExactCostWithBuilderOptions = Parameters<typeof enqueueExactCostWithBuilder>[0];
export type EnqueueExactCostWithBuilderArguments = Exclude<
	EnqueueExactCostWithBuilderOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueRedeemOpenOptions = Parameters<typeof enqueueRedeemOpen>[0];
export type EnqueueRedeemOpenArguments = Exclude<
	EnqueueRedeemOpenOptions['arguments'],
	readonly unknown[]
>;
export type EnqueueRedeemOpenWithBuilderOptions = Parameters<
	typeof enqueueRedeemOpenWithBuilder
>[0];
export type EnqueueRedeemOpenWithBuilderArguments = Exclude<
	EnqueueRedeemOpenWithBuilderOptions['arguments'],
	readonly unknown[]
>;
