// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * State module represents the current state of the pool. It maintains all the
 * accounts, history, and governance information. It also processes all the
 * transactions and updates the state accordingly.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/sui/table.js';
import * as history from './history.js';
import * as governance from './governance.js';
import * as balances from './balances.js';
const $moduleName = '@deepbook/core::state';
export const State = new MoveStruct({
	name: `${$moduleName}::State`,
	fields: {
		accounts: table.Table,
		history: history.History,
		governance: governance.Governance,
	},
});
export const StakeEvent = new MoveStruct({
	name: `${$moduleName}::StakeEvent`,
	fields: {
		pool_id: bcs.Address,
		balance_manager_id: bcs.Address,
		epoch: bcs.u64(),
		amount: bcs.u64(),
		stake: bcs.bool(),
	},
});
export const ProposalEvent = new MoveStruct({
	name: `${$moduleName}::ProposalEvent`,
	fields: {
		pool_id: bcs.Address,
		balance_manager_id: bcs.Address,
		epoch: bcs.u64(),
		taker_fee: bcs.u64(),
		maker_fee: bcs.u64(),
		stake_required: bcs.u64(),
	},
});
export const VoteEvent = new MoveStruct({
	name: `${$moduleName}::VoteEvent`,
	fields: {
		pool_id: bcs.Address,
		balance_manager_id: bcs.Address,
		epoch: bcs.u64(),
		from_proposal_id: bcs.option(bcs.Address),
		to_proposal_id: bcs.Address,
		stake: bcs.u64(),
	},
});
export const RebateEventV2 = new MoveStruct({
	name: `${$moduleName}::RebateEventV2`,
	fields: {
		pool_id: bcs.Address,
		balance_manager_id: bcs.Address,
		epoch: bcs.u64(),
		claim_amount: balances.Balances,
	},
});
export const RebateEvent = new MoveStruct({
	name: `${$moduleName}::RebateEvent`,
	fields: {
		pool_id: bcs.Address,
		balance_manager_id: bcs.Address,
		epoch: bcs.u64(),
		claim_amount: bcs.u64(),
	},
});
