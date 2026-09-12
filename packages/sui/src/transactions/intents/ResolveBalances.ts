// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { IntentResolverOptions } from '../resolve.js';
import type { TransactionDataBuilder } from '../TransactionData.js';
import { ALLOWANCE_BALANCE, COIN_WITH_BALANCE } from './BalanceIntentNames.js';
import { resolveAllowanceBalance } from './AllowanceBalance.js';
import { resolveCoinBalance } from './CoinWithBalance.js';

export async function resolveBalances(
	transactionData: TransactionDataBuilder,
	options: IntentResolverOptions,
	next: () => Promise<void>,
) {
	const intents = new Set(options.intentNames ?? [ALLOWANCE_BALANCE, COIN_WITH_BALANCE]);
	const shouldResolve = (name: string) =>
		intents.has(name) &&
		!options.supportedIntents?.includes(name) &&
		transactionData.commands.some((command) => command.$Intent?.name === name);

	// Reserve allowance withdrawals before ordinary coin selection, including when
	// the sender is also the funder. Keep separate intents for wallet negotiation.
	if (shouldResolve(ALLOWANCE_BALANCE)) {
		await resolveAllowanceBalance(transactionData, options, async () => {});
	}
	if (shouldResolve(COIN_WITH_BALANCE)) {
		await resolveCoinBalance(transactionData, options, async () => {});
	}
	await next();
}
