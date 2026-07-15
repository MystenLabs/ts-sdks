/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Entry points for submitting TOB dealer certificates. Committee members (or their
 * delegated operators) post certified dealer-messages hashes for the DKG,
 * key-rotation, and nonce-generation MPC ceremonies into per-(epoch, batch,
 * protocol) buckets stored on `Hashi`, and garbage-collect buckets once they are
 * old enough.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface SubmitDkgCertArguments {
	hashi: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	dealer: RawTransactionArgument<string>;
	messagesHash: RawTransactionArgument<number[]>;
	cert: RawTransactionArgument<string>;
}
export interface SubmitDkgCertOptions {
	package?: string;
	arguments:
		| SubmitDkgCertArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<number[]>,
				cert: RawTransactionArgument<string>,
		  ];
}
export function submitDkgCert(options: SubmitDkgCertOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', 'address', 'vector<u8>', null] satisfies (string | null)[];
	const parameterNames = ['hashi', 'epoch', 'dealer', 'messagesHash', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'submit_dkg_cert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubmitRotationCertArguments {
	hashi: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	dealer: RawTransactionArgument<string>;
	messagesHash: RawTransactionArgument<number[]>;
	cert: RawTransactionArgument<string>;
}
export interface SubmitRotationCertOptions {
	package?: string;
	arguments:
		| SubmitRotationCertArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<number[]>,
				cert: RawTransactionArgument<string>,
		  ];
}
export function submitRotationCert(options: SubmitRotationCertOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', 'address', 'vector<u8>', null] satisfies (string | null)[];
	const parameterNames = ['hashi', 'epoch', 'dealer', 'messagesHash', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'submit_rotation_cert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubmitNonceCertArguments {
	hashi: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	batchIndex: RawTransactionArgument<number>;
	dealer: RawTransactionArgument<string>;
	messagesHash: RawTransactionArgument<number[]>;
	cert: RawTransactionArgument<string>;
}
export interface SubmitNonceCertOptions {
	package?: string;
	arguments:
		| SubmitNonceCertArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				batchIndex: RawTransactionArgument<number>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<number[]>,
				cert: RawTransactionArgument<string>,
		  ];
}
export function submitNonceCert(options: SubmitNonceCertOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', 'u32', 'address', 'vector<u8>', null] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'epoch', 'batchIndex', 'dealer', 'messagesHash', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'submit_nonce_cert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DestroyAllCertsArguments {
	hashi: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	batchIndex: RawTransactionArgument<number | null>;
	protocolType: RawTransactionArgument<string>;
}
export interface DestroyAllCertsOptions {
	package?: string;
	arguments:
		| DestroyAllCertsArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				batchIndex: RawTransactionArgument<number | null>,
				protocolType: RawTransactionArgument<string>,
		  ];
}
/**
 * Garbage collection: deliberately NOT gated on pause/reconfig — cert buckets old
 * enough to destroy (see `tob::destroy_all`) carry no live state, and GC must stay
 * callable during an emergency pause.
 */
export function destroyAllCerts(options: DestroyAllCertsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', '0x1::option::Option<u32>', null] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'epoch', 'batchIndex', 'protocolType'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'destroy_all_certs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
