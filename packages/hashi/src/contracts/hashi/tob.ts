/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveEnum, MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as linked_table from './deps/sui/linked_table.js';
import * as committee from './committee.js';
const $moduleName = '@local-pkg/hashi::tob';
export const ProtocolType = new MoveEnum({
	name: `${$moduleName}::ProtocolType`,
	fields: {
		Dkg: null,
		KeyRotation: null,
		NonceGeneration: null,
	},
});
export const TobKey = new MoveStruct({
	name: `${$moduleName}::TobKey`,
	fields: {
		epoch: bcs.u64(),
		batch_index: bcs.option(bcs.u32()),
		protocol_type: ProtocolType,
	},
});
export const EpochCertsV1 = new MoveStruct({
	name: `${$moduleName}::EpochCertsV1`,
	fields: {
		epoch: bcs.u64(),
		protocol_type: ProtocolType,
		/** Dealer submissions indexed by dealer address (first-submission-wins). */
		certs: linked_table.LinkedTable(bcs.Address),
	},
});
export const DealerMessagesHashV1 = new MoveStruct({
	name: `${$moduleName}::DealerMessagesHashV1`,
	fields: {
		dealer_address: bcs.Address,
		messages_hash: bcs.vector(bcs.u8()),
	},
});
export const DealerSubmissionV1 = new MoveStruct({
	name: `${$moduleName}::DealerSubmissionV1`,
	fields: {
		message: DealerMessagesHashV1,
		signature: committee.CommitteeSignature,
	},
});
export const StampedDealerSubmissionV1 = new MoveStruct({
	name: `${$moduleName}::StampedDealerSubmissionV1`,
	fields: {
		submission: DealerSubmissionV1,
		timestamp_ms: bcs.u64(),
	},
});
export const StampedEpochCertsV1 = new MoveStruct({
	name: `${$moduleName}::StampedEpochCertsV1`,
	fields: {
		epoch: bcs.u64(),
		protocol_type: ProtocolType,
		/** Stamped nonce submissions indexed by dealer address (first-submission-wins). */
		certs: linked_table.LinkedTable(bcs.Address),
	},
});
