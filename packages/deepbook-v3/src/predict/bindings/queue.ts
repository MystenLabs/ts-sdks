// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `queueMoveCalls`: the generated order-flow `queue` bindings, with the argument key
// `quote_redeem_open` shipped with (see `rename.ts`). Its `wrapper` parameter became `_wrapper` in
// predict_orders v2 (Testnet v3), when builder fees moved from the account to each trade.

import type { TransactionArgument } from '@mysten/sui/transactions';
import * as generated from '../../contracts/deepbook_predict_orders/queue.js';
import type { RawTransactionArgument } from '../../contracts/utils/index.js';
import { renameArguments } from './rename.js';

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
