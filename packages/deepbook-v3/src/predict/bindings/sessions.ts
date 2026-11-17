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
