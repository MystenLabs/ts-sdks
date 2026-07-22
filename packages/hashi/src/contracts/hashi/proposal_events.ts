/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/hashi::proposal_events';
export const ProposalCreatedEvent = new MoveStruct({
	name: `${$moduleName}::ProposalCreatedEvent<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
		timestamp_ms: bcs.u64(),
	},
});
export const VoteCastEvent = new MoveStruct({
	name: `${$moduleName}::VoteCastEvent<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
		voter: bcs.Address,
	},
});
export const VoteRemovedEvent = new MoveStruct({
	name: `${$moduleName}::VoteRemovedEvent<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
		voter: bcs.Address,
	},
});
export const ProposalDeletedEvent = new MoveStruct({
	name: `${$moduleName}::ProposalDeletedEvent<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
	},
});
export function ProposalExecutedEvent<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::ProposalExecutedEvent<${typeParameters[0].name as T['name']}>`,
		fields: {
			proposal_id: bcs.Address,
			data: typeParameters[0],
		},
	});
}
export const QuorumReachedEvent = new MoveStruct({
	name: `${$moduleName}::QuorumReachedEvent<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
	},
});
export const PackageUpgradedEvent = new MoveStruct({
	name: `${$moduleName}::PackageUpgradedEvent`,
	fields: {
		package: bcs.Address,
		version: bcs.u64(),
	},
});
