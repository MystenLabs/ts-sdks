// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as group_ops from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/group_ops.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function BlsCommitteeMember() {
	return bcs.struct('BlsCommitteeMember', {
		public_key: group_ops.Element(),
		weight: bcs.u16(),
		node_id: bcs.Address,
	});
}
export function BlsCommittee() {
	return bcs.struct('BlsCommittee', {
		members: bcs.vector(BlsCommitteeMember()),
		n_shards: bcs.u16(),
		epoch: bcs.u32(),
		total_aggregated_key: group_ops.Element(),
	});
}
export function RequiredWeight() {
	return bcs.enum('RequiredWeight', {
		Quorum: null,
		OneCorrectNode: null,
	});
}
export function init(packageAddress: string) {
	function new_bls_committee(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<string[]>];
	}) {
		const argumentsTypes = ['u32', `vector<${packageAddress}::bls_aggregate::BlsCommitteeMember>`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'new_bls_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function new_bls_committee_member(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::group_ops::Element<0x0000000000000000000000000000000000000000000000000000000000000002::bls12381::UncompressedG1>',
			'u16',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'new_bls_committee_member',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function node_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommitteeMember`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'node_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function n_shards(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'n_shards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function n_members(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'n_members',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_idx(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'get_idx',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function contains(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'contains',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_member_weight(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'get_member_weight',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function find_index(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'find_index',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function to_vec_map(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'to_vec_map',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function verify_quorum_in_epoch(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'verify_quorum_in_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_quorum(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`, 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'is_quorum',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function verify_one_correct_node_in_epoch(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'verify_one_correct_node_in_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function includes_one_correct_node(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::bls_aggregate::BlsCommittee`, 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'includes_one_correct_node',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function verify_certificate_and_weight(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
			`${packageAddress}::bls_aggregate::RequiredWeight`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'bls_aggregate',
				function: 'verify_certificate_and_weight',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		new_bls_committee,
		new_bls_committee_member,
		node_id,
		epoch,
		n_shards,
		n_members,
		get_idx,
		contains,
		get_member_weight,
		find_index,
		to_vec_map,
		verify_quorum_in_epoch,
		is_quorum,
		verify_one_correct_node_in_epoch,
		includes_one_correct_node,
		verify_certificate_and_weight,
	};
}
