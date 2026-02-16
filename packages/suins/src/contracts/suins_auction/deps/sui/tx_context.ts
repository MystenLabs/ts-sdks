/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::tx_context';
export const TxContext = new MoveStruct({
	name: `${$moduleName}::TxContext`,
	fields: {
		/** The address of the user that signed the current transaction */
		sender: bcs.Address,
		/** Hash of the current transaction */
		tx_hash: bcs.vector(bcs.u8()),
		/** The current epoch number */
		epoch: bcs.u64(),
		/** Timestamp that the epoch started at */
		epoch_timestamp_ms: bcs.u64(),
		/**
		 * Counter recording the number of fresh id's created while executing this
		 * transaction. Always 0 at the start of a transaction
		 */
		ids_created: bcs.u64(),
	},
});
export interface SenderOptions {
	package: string;
	arguments?: [];
}
/** Return the address of the user that signed the current transaction */
export function sender(options: SenderOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'sender',
		});
}
export interface DigestOptions {
	package: string;
	arguments?: [];
}
/**
 * Return the transaction digest (hash of transaction inputs). Please do not use as
 * a source of randomness.
 */
export function digest(options: DigestOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'digest',
		});
}
export interface EpochOptions {
	package: string;
	arguments?: [];
}
/** Return the current epoch */
export function epoch(options: EpochOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'epoch',
		});
}
export interface EpochTimestampMsOptions {
	package: string;
	arguments?: [];
}
/** Return the epoch start time as a unix timestamp in milliseconds. */
export function epochTimestampMs(options: EpochTimestampMsOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'epoch_timestamp_ms',
		});
}
export interface SponsorOptions {
	package: string;
	arguments?: [];
}
/** Return the adress of the transaction sponsor or `None` if there was no sponsor. */
export function sponsor(options: SponsorOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'sponsor',
		});
}
export interface FreshObjectAddressOptions {
	package: string;
	arguments?: [];
}
/**
 * Create an `address` that has not been used. As it is an object address, it will
 * never occur as the address for a user. In other words, the generated address is
 * a globally unique object ID.
 */
export function freshObjectAddress(options: FreshObjectAddressOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'fresh_object_address',
		});
}
export interface ReferenceGasPriceOptions {
	package: string;
	arguments?: [];
}
/**
 * Return the reference gas price in effect for the epoch the transaction is being
 * executed in.
 */
export function referenceGasPrice(options: ReferenceGasPriceOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'reference_gas_price',
		});
}
export interface GasPriceOptions {
	package: string;
	arguments?: [];
}
/**
 * Return the gas price submitted for the current transaction. That is the value
 * the user submitted with the transaction data.
 */
export function gasPrice(options: GasPriceOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'gas_price',
		});
}
