// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function ProofOfPossessionMessage() {
	return bcs.struct('ProofOfPossessionMessage', {
		intent_type: bcs.u8(),
		intent_version: bcs.u8(),
		intent_app: bcs.u8(),
		epoch: bcs.u32(),
		sui_address: bcs.Address,
		bls_key: bcs.vector(bcs.u8()),
	});
}
export function CertifiedMessage() {
	return bcs.struct('CertifiedMessage', {
		intent_type: bcs.u8(),
		intent_version: bcs.u8(),
		cert_epoch: bcs.u32(),
		message: bcs.vector(bcs.u8()),
		stake_support: bcs.u16(),
	});
}
export function CertifiedBlobMessage() {
	return bcs.struct('CertifiedBlobMessage', {
		blob_id: bcs.u256(),
		blob_persistence_type: BlobPersistenceType(),
	});
}
export function CertifiedInvalidBlobId() {
	return bcs.struct('CertifiedInvalidBlobId', {
		blob_id: bcs.u256(),
	});
}
export function DenyListUpdateMessage() {
	return bcs.struct('DenyListUpdateMessage', {
		storage_node_id: bcs.Address,
		deny_list_sequence_number: bcs.u64(),
		deny_list_size: bcs.u64(),
		deny_list_root: bcs.u256(),
	});
}
export function DenyListBlobDeleted() {
	return bcs.struct('DenyListBlobDeleted', {
		blob_id: bcs.u256(),
	});
}
export function BlobPersistenceType() {
	return bcs.enum('BlobPersistenceType', {
		Permanent: null,
		Deletable: bcs.Address,
	});
}
export function init(packageAddress: string) {
	function new_proof_of_possession_msg(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = ['u32', 'address', 'vector<u8>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'new_proof_of_possession_msg',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function to_bcs(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::ProofOfPossessionMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'to_bcs',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function verify_proof_of_possession(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = [`${packageAddress}::messages::ProofOfPossessionMessage`, 'vector<u8>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'verify_proof_of_possession',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function new_certified_message(options: {
		arguments: [
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = ['vector<u8>', 'u32', 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'new_certified_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function certify_blob_message(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'certify_blob_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function certified_event_blob_message(options: {
		arguments: [RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = ['u256'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'certified_event_blob_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function invalid_blob_id_message(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'invalid_blob_id_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function deny_list_update_message(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'deny_list_update_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function deny_list_blob_deleted_message(options: {
		arguments: [RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'deny_list_blob_deleted_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function intent_type(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'intent_type',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function intent_version(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'intent_version',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function cert_epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'cert_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function stake_support(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'stake_support',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function message(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function into_message(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'into_message',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function certified_blob_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedBlobMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'certified_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function blob_persistence_type(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedBlobMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'blob_persistence_type',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function invalid_blob_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::CertifiedInvalidBlobId`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'invalid_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function storage_node_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::DenyListUpdateMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'storage_node_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function sequence_number(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::DenyListUpdateMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'sequence_number',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function size(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::DenyListUpdateMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function root(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::DenyListUpdateMessage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'root',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function blob_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::DenyListBlobDeleted`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_deletable(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::BlobPersistenceType`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'is_deletable',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function object_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::messages::BlobPersistenceType`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'object_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function peel_blob_persistence_type(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::bcs::BCS',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'messages',
				function: 'peel_blob_persistence_type',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		new_proof_of_possession_msg,
		to_bcs,
		verify_proof_of_possession,
		new_certified_message,
		certify_blob_message,
		certified_event_blob_message,
		invalid_blob_id_message,
		deny_list_update_message,
		deny_list_blob_deleted_message,
		intent_type,
		intent_version,
		cert_epoch,
		stake_support,
		message,
		into_message,
		certified_blob_id,
		blob_persistence_type,
		invalid_blob_id,
		storage_node_id,
		sequence_number,
		size,
		root,
		blob_id,
		is_deletable,
		object_id,
		peel_blob_persistence_type,
	};
}
