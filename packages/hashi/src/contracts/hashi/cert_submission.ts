/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface SubmitDkgCertArguments {
	hashi: RawTransactionArgument<string>;
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
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<Array<number>>,
				cert: TransactionArgument,
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
	messagesHash: RawTransactionArgument<Array<number>>;
	cert: TransactionArgument;
}
export interface SubmitRotationCertOptions {
	package?: string;
	arguments:
		| SubmitRotationCertArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				dealer: RawTransactionArgument<string>,
				messagesHash: RawTransactionArgument<Array<number>>,
				cert: TransactionArgument,
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
	messagesHash: RawTransactionArgument<Array<number>>;
	cert: TransactionArgument;
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
				messagesHash: RawTransactionArgument<Array<number>>,
				cert: TransactionArgument,
		  ];
}
export function submitNonceCert(options: SubmitNonceCertOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [
		null,
		'u64',
		'u32',
		'address',
		'vector<u8>',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
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
	protocolType: TransactionArgument;
}
export interface DestroyAllCertsOptions {
	package?: string;
	arguments:
		| DestroyAllCertsArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				batchIndex: RawTransactionArgument<number | null>,
				protocolType: TransactionArgument,
		  ];
}
/**
 * Deprecated entry, retained as defense in depth. Non-public `entry` functions are
 * not linkage-checked, so the upgrade policy would permit deleting this; it is
 * kept so any historical caller path routes through the protocol-specific floors
 * below instead of the legacy `+2` rule. `ProtocolType` has no public constructors
 * and cannot currently be supplied as a PTB pure argument, so this entry is
 * unreachable today; the routing guards against that restriction ever loosening.
 */
export function destroyAllCerts(options: DestroyAllCertsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', '0x1::option::Option<u32>', null] satisfies (
		string | null
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
export interface DestroyKeyGenCertsArguments {
	hashi: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
}
export interface DestroyKeyGenCertsOptions {
	package?: string;
	arguments:
		| DestroyKeyGenCertsArguments
		| [hashi: RawTransactionArgument<string>, epoch: RawTransactionArgument<number | bigint>];
}
/**
 * Destroy the key-generation (DKG or rotation) cert buckets of `epoch`. Garbage
 * collection: permissionless and deliberately NOT gated on pause/reconfig — see
 * `destroy_all_certs`.
 *
 * A key-generation bucket stays live longer than its certs' epoch: the NEXT
 * rotation reads the PREVIOUS committee's bucket to seed the handoff, and
 * committee epochs can gap, so an age floor alone cannot identify the previous
 * committee's bucket. Both floors are asserted unconditionally (premature calls
 * abort even when the bucket is absent); an eligible-but-absent bucket is a no-op
 * so batched GC transactions and permissionless racers cannot poison each other.
 */
export function destroyKeyGenCerts(options: DestroyKeyGenCertsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'epoch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'destroy_key_gen_certs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DestroyNonceCertsArguments {
	hashi: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	batchIndex: RawTransactionArgument<number>;
}
export interface DestroyNonceCertsOptions {
	package?: string;
	arguments:
		| DestroyNonceCertsArguments
		| [
				hashi: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				batchIndex: RawTransactionArgument<number>,
		  ];
}
/**
 * Destroy the nonce-generation cert bucket of `(epoch, batch_index)`. Garbage
 * collection: permissionless and deliberately NOT gated on pause/reconfig — see
 * `destroy_all_certs`. Nonce buckets are only ever read during their own epoch, so
 * no committee-awareness is needed. The floor is asserted unconditionally; an
 * eligible-but-absent bucket is a no-op (see `destroy_key_gen_certs`).
 */
export function destroyNonceCerts(options: DestroyNonceCertsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', 'u32'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'epoch', 'batchIndex'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'cert_submission',
			function: 'destroy_nonce_certs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
