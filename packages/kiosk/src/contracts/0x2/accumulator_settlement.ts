/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::accumulator_settlement';
export const EventStreamHead = new MoveStruct({
	name: `${$moduleName}::EventStreamHead`,
	fields: {
		mmr: bcs.vector(bcs.u256()),
		checkpoint_seq: bcs.u64(),
		num_events: bcs.u64(),
	},
});
