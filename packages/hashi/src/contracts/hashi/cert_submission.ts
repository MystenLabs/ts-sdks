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

import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import {
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
export interface SubmitDkgCertArguments {
	hashi?: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	dealer: RawTransactionArgument<string>;
	messagesHash: RawTransactionArgument<Array<number>>;
	cert: TransactionArgument;
}
export interface SubmitDkgCertOptions {
	package?: string;
	arguments:
		| SubmitDkgCertArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				epoch: RawTransactionArgument<number | bigint>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<Array<number>>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function submitDkgCert(options: SubmitDkgCertOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', 'address', 'vector<u8>', null] satisfies (string | null)[];
	const parameterNames = ['hashi', 'epoch', 'dealer', 'messagesHash', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'submit_dkg_cert',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'cert_submission',
									functionName: 'submit_dkg_cert',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SubmitRotationCertArguments {
	hashi?: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	dealer: RawTransactionArgument<string>;
	messagesHash: RawTransactionArgument<Array<number>>;
	cert: TransactionArgument;
}
export interface SubmitRotationCertOptions {
	package?: string;
	arguments:
		| SubmitRotationCertArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				epoch: RawTransactionArgument<number | bigint>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<Array<number>>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function submitRotationCert(options: SubmitRotationCertOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', 'address', 'vector<u8>', null] satisfies (string | null)[];
	const parameterNames = ['hashi', 'epoch', 'dealer', 'messagesHash', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'submit_rotation_cert',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'cert_submission',
									functionName: 'submit_rotation_cert',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SubmitNonceCertArguments {
	hashi?: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	batchIndex: RawTransactionArgument<number>;
	dealer: RawTransactionArgument<string>;
	messagesHash: RawTransactionArgument<Array<number>>;
	cert: TransactionArgument;
}
export interface SubmitNonceCertOptions {
	package?: string;
	arguments:
		| SubmitNonceCertArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				epoch: RawTransactionArgument<number | bigint>,
				batchIndex: RawTransactionArgument<number>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<Array<number>>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function submitNonceCert(options: SubmitNonceCertOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
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
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'cert_submission',
									functionName: 'submit_nonce_cert',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface DestroyAllCertsArguments {
	hashi?: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	batchIndex: RawTransactionArgument<number | null>;
	protocolType: TransactionArgument;
}
export interface DestroyAllCertsOptions {
	package?: string;
	arguments:
		| DestroyAllCertsArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				epoch: RawTransactionArgument<number | bigint>,
				batchIndex: RawTransactionArgument<number | null>,
				protocolType: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
/**
 * Garbage collection: deliberately NOT gated on pause/reconfig — cert buckets old
 * enough to destroy (see `tob::destroy_all`) carry no live state, and GC must stay
 * callable during an emergency pause.
 */
export function destroyAllCerts(options: DestroyAllCertsOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
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
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'cert_submission',
									functionName: 'destroy_all_certs',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
