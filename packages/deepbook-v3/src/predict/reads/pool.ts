// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { type GeneratedConfig } from '../config/generated.js';
import * as plp from '../../contracts/deepbook_predict/plp.js';
import { inspectReturns, type ReadClient } from './inspect.js';
import { parseU64LE } from './parse.js';

export interface PoolStats {
	plpTotalSupply: bigint;
	idleBalance: bigint;
	supplyRequestsPending: bigint;
	withdrawRequestsPending: bigint;
}

// The pool's four u64 vault stats batched into one PTB (command order fixed below).
// `plp::{plp_total_supply, idle_balance, supply_requests_pending,
// withdraw_requests_pending}(vault)` — see
// packages/predict/sources/plp/plp.move:{164,149,169,174}.
export async function poolStats(client: ReadClient, config: GeneratedConfig): Promise<PoolStats> {
	const tx = new Transaction();
	for (const fn of [
		plp.plpTotalSupply,
		plp.idleBalance,
		plp.supplyRequestsPending,
		plp.withdrawRequestsPending,
	]) {
		tx.add(fn({ config }));
	}
	const cmds = await inspectReturns(client, tx);
	return {
		plpTotalSupply: parseU64LE(cmds[0][0]),
		idleBalance: parseU64LE(cmds[1][0]),
		supplyRequestsPending: parseU64LE(cmds[2][0]),
		withdrawRequestsPending: parseU64LE(cmds[3][0]),
	};
}
