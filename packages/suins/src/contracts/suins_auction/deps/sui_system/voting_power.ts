/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x3::voting_power';
export const VotingPowerInfo = new MoveStruct({
	name: `${$moduleName}::VotingPowerInfo`,
	fields: {
		validator_index: bcs.u64(),
		voting_power: bcs.u64(),
	},
});
export const VotingPowerInfoV2 = new MoveStruct({
	name: `${$moduleName}::VotingPowerInfoV2`,
	fields: {
		validator_index: bcs.u64(),
		voting_power: bcs.u64(),
		stake: bcs.u64(),
	},
});
export interface TotalVotingPowerOptions {
	package: string;
	arguments?: [];
}
/** Return the (constant) total voting power */
export function totalVotingPower(options: TotalVotingPowerOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'voting_power',
			function: 'total_voting_power',
		});
}
export interface QuorumThresholdOptions {
	package: string;
	arguments?: [];
}
/** Return the (constant) quorum threshold */
export function quorumThreshold(options: QuorumThresholdOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'voting_power',
			function: 'quorum_threshold',
		});
}
