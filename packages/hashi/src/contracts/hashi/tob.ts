/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Totally Ordered Broadcast (TOB) certificate storage for MPC ceremonies. Dealer
 * submissions — a dealer-messages hash plus its committee signature — are bucketed
 * per (epoch, optional batch, protocol type) in `EpochCertsV1`,
 * first-submission-wins per dealer. Signature verification is deferred to
 * off-chain readers, and a bucket may be destroyed once the current epoch is at
 * least two past the bucket's epoch.
 */

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
