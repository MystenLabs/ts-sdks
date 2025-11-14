// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * History module tracks the volume data for the current epoch and past epochs. It
 * also tracks past trade params. Past maker fees are used to calculate fills for
 * old orders. The historic median is used to calculate rebates and burns.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balances from './balances.js';
import * as trade_params from './trade_params.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@deepbook/core::history';
export const Volumes = new MoveStruct({
	name: `${$moduleName}::Volumes`,
	fields: {
		total_volume: bcs.u128(),
		total_staked_volume: bcs.u128(),
		total_fees_collected: balances.Balances,
		historic_median: bcs.u128(),
		trade_params: trade_params.TradeParams,
	},
});
export const History = new MoveStruct({
	name: `${$moduleName}::History`,
	fields: {
		epoch: bcs.u64(),
		epoch_created: bcs.u64(),
		volumes: Volumes,
		historic_volumes: table.Table,
		balance_to_burn: bcs.u64(),
	},
});
export const EpochData = new MoveStruct({
	name: `${$moduleName}::EpochData`,
	fields: {
		epoch: bcs.u64(),
		pool_id: bcs.Address,
		total_volume: bcs.u128(),
		total_staked_volume: bcs.u128(),
		base_fees_collected: bcs.u64(),
		quote_fees_collected: bcs.u64(),
		deep_fees_collected: bcs.u64(),
		historic_median: bcs.u128(),
		taker_fee: bcs.u64(),
		maker_fee: bcs.u64(),
		stake_required: bcs.u64(),
	},
});
