/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::accumulator_settlement';
export const EventStreamHead = new MoveStruct({
	name: `${$moduleName}::EventStreamHead`,
	fields: {
		/** Merkle Mountain Range of all events in the stream. */
		mmr: bcs.vector(bcs.u256()),
		/** Checkpoint sequence number at which the event stream was written. */
		checkpoint_seq: bcs.u64(),
		/** Number of events in the stream. */
		num_events: bcs.u64(),
	},
});
