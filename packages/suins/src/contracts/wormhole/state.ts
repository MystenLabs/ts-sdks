/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import * as external_address from './external_address.js';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
import * as consumed_vaas from './consumed_vaas.js';
import * as fee_collector from './fee_collector.js';
import * as _package from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/package.js';
const $moduleName = '0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::state';
export const State = new MoveStruct({
	name: `${$moduleName}::State`,
	fields: {
		id: object.UID,
		governance_chain: bcs.u16(),
		governance_contract: external_address.ExternalAddress,
		guardian_set_index: bcs.u32(),
		guardian_sets: table.Table,
		guardian_set_seconds_to_live: bcs.u32(),
		consumed_vaas: consumed_vaas.ConsumedVAAs,
		fee_collector: fee_collector.FeeCollector,
		upgrade_cap: _package.UpgradeCap,
	},
});
