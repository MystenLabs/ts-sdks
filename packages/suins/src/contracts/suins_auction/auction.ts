/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bf_hmac_encryption from './deps/seal/bf_hmac_encryption.js';
import * as balance from './deps/sui/balance.js';
import * as suins_registration from './deps/suins/suins_registration.js';
import * as object_bag from './deps/sui/object_bag.js';
import * as table from './deps/sui/table.js';
import * as bag from './deps/sui/bag.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@suins/auction::auction';
export const AuctionWitness = new MoveStruct({
	name: `${$moduleName}::AuctionWitness`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const AdminCap = new MoveStruct({
	name: `${$moduleName}::AdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export const Auction = new MoveStruct({
	name: `${$moduleName}::Auction<phantom T>`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		start_time: bcs.u64(),
		end_time: bcs.u64(),
		min_bid: bcs.u64(),
		reserve_price: bcs.option(bf_hmac_encryption.EncryptedObject),
		highest_bidder: bcs.Address,
		highest_bid_balance: balance.Balance,
		suins_registration: suins_registration.SuinsRegistration,
	},
});
export const AuctionTable = new MoveStruct({
	name: `${$moduleName}::AuctionTable`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
		bag: object_bag.ObjectBag,
		allowed_tokens: table.Table,
		/** The key servers that must be used for seal encryption. */
		key_servers: bcs.vector(bcs.Address),
		/** The public keys for the key servers in the same order as `key_servers`. */
		public_keys: bcs.vector(bcs.vector(bcs.u8())),
		/** The threshold for the vote. */
		threshold: bcs.u8(),
		service_fee: bcs.u64(),
		/** Accumulated service fees for each token type */
		fees: bag.Bag,
	},
});
export const AuctionCreatedEvent = new MoveStruct({
	name: `${$moduleName}::AuctionCreatedEvent`,
	fields: {
		auction_id: bcs.Address,
		domain_name: bcs.string(),
		owner: bcs.Address,
		start_time: bcs.u64(),
		end_time: bcs.u64(),
		min_bid: bcs.u64(),
		reserve_price: bcs.option(bcs.vector(bcs.u8())),
		token: type_name.TypeName,
	},
});
export const BidPlacedEvent = new MoveStruct({
	name: `${$moduleName}::BidPlacedEvent`,
	fields: {
		auction_id: bcs.Address,
		domain_name: bcs.string(),
		bidder: bcs.Address,
		amount: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const AuctionFinalizedEvent = new MoveStruct({
	name: `${$moduleName}::AuctionFinalizedEvent`,
	fields: {
		auction_id: bcs.Address,
		domain_name: bcs.string(),
		highest_bidder: bcs.Address,
		amount: bcs.u64(),
		reserve_price: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const AuctionCancelledEvent = new MoveStruct({
	name: `${$moduleName}::AuctionCancelledEvent`,
	fields: {
		auction_id: bcs.Address,
		domain_name: bcs.string(),
		owner: bcs.Address,
		token: type_name.TypeName,
	},
});
export const MigrateEvent = new MoveStruct({
	name: `${$moduleName}::MigrateEvent`,
	fields: {
		old_version: bcs.u64(),
		new_version: bcs.u64(),
	},
});
export const SetSealConfig = new MoveStruct({
	name: `${$moduleName}::SetSealConfig`,
	fields: {
		key_servers: bcs.vector(bcs.Address),
		public_keys: bcs.vector(bcs.vector(bcs.u8())),
		threshold: bcs.u8(),
	},
});
export const SetServiceFee = new MoveStruct({
	name: `${$moduleName}::SetServiceFee`,
	fields: {
		service_fee: bcs.u64(),
	},
});
export const AddAllowedToken = new MoveStruct({
	name: `${$moduleName}::AddAllowedToken`,
	fields: {
		token: type_name.TypeName,
	},
});
export const RemoveAllowedToken = new MoveStruct({
	name: `${$moduleName}::RemoveAllowedToken`,
	fields: {
		token: type_name.TypeName,
	},
});
export const WithdrawFees = new MoveStruct({
	name: `${$moduleName}::WithdrawFees`,
	fields: {
		token: type_name.TypeName,
		amount: bcs.u64(),
		recipient: bcs.Address,
	},
});
export interface MigrateArguments {
	_: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
}
export interface MigrateOptions {
	package?: string;
	arguments:
		| MigrateArguments
		| [
				_: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
		  ];
}
export function migrate(options: MigrateOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'auctionTable', 'offerTable'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetSealConfigArguments {
	_: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	keyServers: RawTransactionArgument<string[]>;
	publicKeys: RawTransactionArgument<number[][]>;
	threshold: RawTransactionArgument<number>;
}
export interface SetSealConfigOptions {
	package?: string;
	arguments:
		| SetSealConfigArguments
		| [
				_: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				keyServers: RawTransactionArgument<string[]>,
				publicKeys: RawTransactionArgument<number[][]>,
				threshold: RawTransactionArgument<number>,
		  ];
}
export function setSealConfig(options: SetSealConfigOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, 'vector<address>', 'vector<vector<u8>>', 'u8'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['_', 'auctionTable', 'keyServers', 'publicKeys', 'threshold'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'set_seal_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetServiceFeeArguments {
	_: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
	serviceFee: RawTransactionArgument<number | bigint>;
}
export interface SetServiceFeeOptions {
	package?: string;
	arguments:
		| SetServiceFeeArguments
		| [
				_: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
				serviceFee: RawTransactionArgument<number | bigint>,
		  ];
}
export function setServiceFee(options: SetServiceFeeOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['_', 'auctionTable', 'offerTable', 'serviceFee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'set_service_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddAllowedTokenArguments {
	_: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
}
export interface AddAllowedTokenOptions {
	package?: string;
	arguments:
		| AddAllowedTokenArguments
		| [
				_: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
export function addAllowedToken(options: AddAllowedTokenOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'auctionTable', 'offerTable'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'add_allowed_token',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveAllowedTokenArguments {
	_: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
}
export interface RemoveAllowedTokenOptions {
	package?: string;
	arguments:
		| RemoveAllowedTokenArguments
		| [
				_: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
export function removeAllowedToken(options: RemoveAllowedTokenOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'auctionTable', 'offerTable'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'remove_allowed_token',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawFeesArguments {
	_: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
}
export interface WithdrawFeesOptions {
	package?: string;
	arguments:
		| WithdrawFeesArguments
		| [
				_: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Withdraw accumulated fees from both auction and offer tables */
export function withdrawFees(options: WithdrawFeesOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'auctionTable', 'offerTable'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'withdraw_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateAuctionArguments {
	auctionTable: RawTransactionArgument<string>;
	startTime: RawTransactionArgument<number | bigint>;
	endTime: RawTransactionArgument<number | bigint>;
	minBid: RawTransactionArgument<number | bigint>;
	encryptedReservePrice: RawTransactionArgument<number[] | null>;
	suinsRegistration: RawTransactionArgument<string>;
}
export interface CreateAuctionOptions {
	package?: string;
	arguments:
		| CreateAuctionArguments
		| [
				auctionTable: RawTransactionArgument<string>,
				startTime: RawTransactionArgument<number | bigint>,
				endTime: RawTransactionArgument<number | bigint>,
				minBid: RawTransactionArgument<number | bigint>,
				encryptedReservePrice: RawTransactionArgument<number[] | null>,
				suinsRegistration: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Create a new auction for a domain with a specific token required */
export function createAuction(options: CreateAuctionOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		null,
		'u64',
		'u64',
		'u64',
		'0x1::option::Option<vector<u8>>',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'auctionTable',
		'startTime',
		'endTime',
		'minBid',
		'encryptedReservePrice',
		'suinsRegistration',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'create_auction',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceBidArguments {
	auctionTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface PlaceBidOptions {
	package?: string;
	arguments:
		| PlaceBidArguments
		| [
				auctionTable: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Place a bid on an active auction */
export function placeBid(options: PlaceBidOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, '0x1::string::String', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['auctionTable', 'domainName', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'place_bid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeAuctionArguments {
	suins: RawTransactionArgument<string>;
	auctionTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	derivedKeys: RawTransactionArgument<number[][] | null>;
	keyServers: RawTransactionArgument<string[] | null>;
}
export interface FinalizeAuctionOptions {
	package?: string;
	arguments:
		| FinalizeAuctionArguments
		| [
				suins: RawTransactionArgument<string>,
				auctionTable: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				derivedKeys: RawTransactionArgument<number[][] | null>,
				keyServers: RawTransactionArgument<string[] | null>,
		  ];
	typeArguments: [string];
}
/** Finalize an auction after it ends, transfer domain and funds */
export function finalizeAuction(options: FinalizeAuctionOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		null,
		null,
		'0x1::string::String',
		'0x1::option::Option<vector<vector<u8>>>',
		'0x1::option::Option<vector<address>>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'auctionTable', 'domainName', 'derivedKeys', 'keyServers'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'finalize_auction',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelAuctionArguments {
	auctionTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface CancelAuctionOptions {
	package?: string;
	arguments:
		| CancelAuctionArguments
		| [auctionTable: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Cancel an auction */
export function cancelAuction(options: CancelAuctionOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, '0x1::string::String', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['auctionTable', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'cancel_auction',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetSuinsRegistrationFromAuctionArguments {
	auction: RawTransactionArgument<string>;
}
export interface GetSuinsRegistrationFromAuctionOptions {
	package?: string;
	arguments: GetSuinsRegistrationFromAuctionArguments | [auction: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function getSuinsRegistrationFromAuction(options: GetSuinsRegistrationFromAuctionOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['auction'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'get_suins_registration_from_auction',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SealApproveArguments {
	id: RawTransactionArgument<number[]>;
	auctionTable: RawTransactionArgument<string>;
}
export interface SealApproveOptions {
	package?: string;
	arguments:
		| SealApproveArguments
		| [id: RawTransactionArgument<number[]>, auctionTable: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function sealApprove(options: SealApproveOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>', null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['id', 'auctionTable'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'seal_approve',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
