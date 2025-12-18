/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as external_address from './deps/0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94/external_address.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::set_governance_data_source';
export const GovernanceDataSource = new MoveStruct({
	name: `${$moduleName}::GovernanceDataSource`,
	fields: {
		emitter_chain_id: bcs.u64(),
		emitter_address: external_address.ExternalAddress,
		initial_sequence: bcs.u64(),
	},
});
