// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as vec_map from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function EventBlobAttestation() {
	return bcs.struct('EventBlobAttestation', {
		checkpoint_sequence_num: bcs.u64(),
		epoch: bcs.u32(),
	});
}
export function EventBlob() {
	return bcs.struct('EventBlob', {
		blob_id: bcs.u256(),
		ending_checkpoint_sequence_number: bcs.u64(),
	});
}
export function EventBlobCertificationState() {
	return bcs.struct('EventBlobCertificationState', {
		latest_certified_blob: bcs.option(EventBlob()),
		aggregate_weight_per_blob: vec_map.VecMap(bcs.u256(), bcs.u16()),
	});
}
export function init(packageAddress: string) {
	function new_attestation(options: {
		arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = ['u64', 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'new_attestation',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function last_attested_event_blob_checkpoint_seq_num(options: {
		arguments: [RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobAttestation`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'last_attested_event_blob_checkpoint_seq_num',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function last_attested_event_blob_epoch(options: {
		arguments: [RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobAttestation`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'last_attested_event_blob_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function new_event_blob(options: {
		arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = ['u64', 'u256'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'new_event_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function blob_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlob`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function ending_checkpoint_sequence_number(options: {
		arguments: [RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlob`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'ending_checkpoint_sequence_number',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function create_with_empty_state(options: { arguments: [] }) {
		const argumentsTypes: string[] = [];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'create_with_empty_state',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_latest_certified_blob_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobCertificationState`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'get_latest_certified_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_latest_certified_checkpoint_sequence_number(options: {
		arguments: [RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobCertificationState`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'get_latest_certified_checkpoint_sequence_number',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_num_tracked_blobs(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobCertificationState`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'get_num_tracked_blobs',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_blob_already_certified(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobCertificationState`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'is_blob_already_certified',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function update_latest_certified_event_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::event_blob::EventBlobCertificationState`,
			'u64',
			'u256',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'update_latest_certified_event_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function update_aggregate_weight(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::event_blob::EventBlobCertificationState`,
			'u256',
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'update_aggregate_weight',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function start_tracking_blob(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobCertificationState`, 'u256'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'start_tracking_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function reset(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::event_blob::EventBlobCertificationState`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'event_blob',
				function: 'reset',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		new_attestation,
		last_attested_event_blob_checkpoint_seq_num,
		last_attested_event_blob_epoch,
		new_event_blob,
		blob_id,
		ending_checkpoint_sequence_number,
		create_with_empty_state,
		get_latest_certified_blob_id,
		get_latest_certified_checkpoint_sequence_number,
		get_num_tracked_blobs,
		is_blob_already_certified,
		update_latest_certified_event_blob,
		update_aggregate_weight,
		start_tracking_blob,
		reset,
	};
}
