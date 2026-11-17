// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `queueMoveCalls`: the generated order-flow `queue` bindings, with the argument key
// `quote_redeem_open` shipped with (see `rename.ts`). Its `wrapper` parameter became `_wrapper` in
// predict_orders v2 (Testnet v3), when builder fees moved from the account to each trade.

import type { TransactionArgument } from '@mysten/sui/transactions';
import * as generated from '../../contracts/deepbook_predict_orders/queue.js';
import type { RawTransactionArgument } from '../../contracts/utils/index.js';
import { renameArguments, withShippedKeys } from './rename.js';

export * from '../../contracts/deepbook_predict_orders/queue.js';

export interface QuoteRedeemOpenArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	recordId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
}
export interface QuoteRedeemOpenOptions extends Omit<
	generated.QuoteRedeemOpenOptions,
	'arguments'
> {
	arguments:
		| QuoteRedeemOpenArguments
		| Extract<generated.QuoteRedeemOpenOptions['arguments'], readonly unknown[]>;
}
/**
 * Quote an early sell of `closeQuantity` from the Open record `recordId` at a live `Pricer`: the
 * close a queued sell fills, with no builder fee, matching `enqueue_redeem_open`.
 * `quoteRedeemOpenWithBuilderFee` quotes a sell that names a builder. Changes nothing. The
 * `wrapper` is no longer read, because the fee comes from the trade, not the account.
 */
export function quoteRedeemOpen(options: QuoteRedeemOpenOptions) {
	return generated.quoteRedeemOpen({
		...options,
		arguments: renameArguments(options.arguments, { wrapper: 'Wrapper' }),
	});
}

// `deepbook_predict_orders` v3 underscore-prefixed the Propbook parameters of the version 5
// placements, which now forward to the oracle-free `_v2` forms and ignore them, and every
// parameter of the retired `commit`. Their shipped keys are kept here.
const PROPBOOK_KEYS = ['propbookRegistry', 'pyth', 'bsValues', 'bsSvi'] as const;

/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueExactQuantityV2`. */
export const enqueueExactQuantity = withShippedKeys(generated.enqueueExactQuantity, PROPBOOK_KEYS);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueExactQuantityWithBuilderV2`. */
export const enqueueExactQuantityWithBuilder = withShippedKeys(
	generated.enqueueExactQuantityWithBuilder,
	PROPBOOK_KEYS,
);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueExactAmountV2`. */
export const enqueueExactAmount = withShippedKeys(generated.enqueueExactAmount, PROPBOOK_KEYS);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueExactAmountWithBuilderV2`. */
export const enqueueExactAmountWithBuilder = withShippedKeys(
	generated.enqueueExactAmountWithBuilder,
	PROPBOOK_KEYS,
);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueExactCostV2`. */
export const enqueueExactCost = withShippedKeys(generated.enqueueExactCost, PROPBOOK_KEYS);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueExactCostWithBuilderV2`. */
export const enqueueExactCostWithBuilder = withShippedKeys(
	generated.enqueueExactCostWithBuilder,
	PROPBOOK_KEYS,
);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueRedeemOpenV2`. */
export const enqueueRedeemOpen = withShippedKeys(generated.enqueueRedeemOpen, PROPBOOK_KEYS);
/** Version 5 placement. From version 3 it ignores its Propbook objects: use `enqueueRedeemOpenWithBuilderV2`. */
export const enqueueRedeemOpenWithBuilder = withShippedKeys(
	generated.enqueueRedeemOpenWithBuilder,
	PROPBOOK_KEYS,
);

/** @deprecated Retired by `deepbook_predict_orders` version 3: aborts `EUseV2`. Use `commitV2`. */
export const commit = withShippedKeys(generated.commit, [
	'queue',
	'market',
	'desk',
	'config',
	'updates',
]);
