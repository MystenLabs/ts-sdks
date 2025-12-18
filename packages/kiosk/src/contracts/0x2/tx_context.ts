/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::tx_context';
export const TxContext = new MoveStruct({
	name: `${$moduleName}::TxContext`,
	fields: {
		sender: bcs.Address,
		tx_hash: bcs.vector(bcs.u8()),
		epoch: bcs.u64(),
		epoch_timestamp_ms: bcs.u64(),
		ids_created: bcs.u64(),
	},
});
export interface SenderOptions {
	package?: string;
	arguments?: [];
}
export function sender(options: SenderOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'sender',
		});
}
export interface DigestOptions {
	package?: string;
	arguments?: [];
}
export function digest(options: DigestOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'digest',
		});
}
export interface EpochOptions {
	package?: string;
	arguments?: [];
}
export function epoch(options: EpochOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'epoch',
		});
}
export interface EpochTimestampMsOptions {
	package?: string;
	arguments?: [];
}
export function epochTimestampMs(options: EpochTimestampMsOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'epoch_timestamp_ms',
		});
}
export interface SponsorOptions {
	package?: string;
	arguments?: [];
}
export function sponsor(options: SponsorOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'sponsor',
		});
}
export interface FreshObjectAddressOptions {
	package?: string;
	arguments?: [];
}
export function freshObjectAddress(options: FreshObjectAddressOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'fresh_object_address',
		});
}
export interface ReferenceGasPriceOptions {
	package?: string;
	arguments?: [];
}
export function referenceGasPrice(options: ReferenceGasPriceOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'reference_gas_price',
		});
}
export interface GasPriceOptions {
	package?: string;
	arguments?: [];
}
export function gasPrice(options: GasPriceOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'tx_context',
			function: 'gas_price',
		});
}
