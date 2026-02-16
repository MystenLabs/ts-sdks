/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from '../sui/vec_map.js';
const $moduleName = 'bridge::committee';
export const CommitteeMember = new MoveStruct({
	name: `${$moduleName}::CommitteeMember`,
	fields: {
		/** The Sui Address of the validator */
		sui_address: bcs.Address,
		/** The public key bytes of the bridge key */
		bridge_pubkey_bytes: bcs.vector(bcs.u8()),
		/** Voting power, values are voting power in the scale of 10000. */
		voting_power: bcs.u64(),
		/**
		 * The HTTP REST URL the member's node listens to it looks like
		 * b'https://127.0.0.1:9191'
		 */
		http_rest_url: bcs.vector(bcs.u8()),
		/** If this member is blocklisted */
		blocklisted: bcs.bool(),
	},
});
export const CommitteeMemberRegistration = new MoveStruct({
	name: `${$moduleName}::CommitteeMemberRegistration`,
	fields: {
		/** The Sui Address of the validator */
		sui_address: bcs.Address,
		/** The public key bytes of the bridge key */
		bridge_pubkey_bytes: bcs.vector(bcs.u8()),
		/**
		 * The HTTP REST URL the member's node listens to it looks like
		 * b'https://127.0.0.1:9191'
		 */
		http_rest_url: bcs.vector(bcs.u8()),
	},
});
export const BridgeCommittee = new MoveStruct({
	name: `${$moduleName}::BridgeCommittee`,
	fields: {
		members: vec_map.VecMap(bcs.vector(bcs.u8()), CommitteeMember),
		member_registrations: vec_map.VecMap(bcs.Address, CommitteeMemberRegistration),
		last_committee_update_epoch: bcs.u64(),
	},
});
export const BlocklistValidatorEvent = new MoveStruct({
	name: `${$moduleName}::BlocklistValidatorEvent`,
	fields: {
		blocklisted: bcs.bool(),
		public_keys: bcs.vector(bcs.vector(bcs.u8())),
	},
});
export const CommitteeUpdateEvent = new MoveStruct({
	name: `${$moduleName}::CommitteeUpdateEvent`,
	fields: {
		members: vec_map.VecMap(bcs.vector(bcs.u8()), CommitteeMember),
		stake_participation_percentage: bcs.u64(),
	},
});
export const CommitteeMemberUrlUpdateEvent = new MoveStruct({
	name: `${$moduleName}::CommitteeMemberUrlUpdateEvent`,
	fields: {
		member: bcs.vector(bcs.u8()),
		new_url: bcs.vector(bcs.u8()),
	},
});
export interface VerifySignaturesArguments {
	self: RawTransactionArgument<string>;
	message: RawTransactionArgument<string>;
	signatures: RawTransactionArgument<number[][]>;
}
export interface VerifySignaturesOptions {
	package: string;
	arguments:
		| VerifySignaturesArguments
		| [
				self: RawTransactionArgument<string>,
				message: RawTransactionArgument<string>,
				signatures: RawTransactionArgument<number[][]>,
		  ];
}
export function verifySignatures(options: VerifySignaturesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, 'vector<vector<u8>>'] satisfies (string | null)[];
	const parameterNames = ['self', 'message', 'signatures'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'committee',
			function: 'verify_signatures',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
