/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
import * as object_bag from './deps/sui/object_bag.js';
import * as bag from './deps/sui/bag.js';
import * as balance from './deps/sui/balance.js';
import * as suins_registration from './deps/suins/suins_registration.js';
import * as type_name from './type_name.js';
const $moduleName = '@suins/auction::offer';
export const OfferTable = new MoveStruct({
	name: `${$moduleName}::OfferTable`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
		table: table.Table,
		listings: object_bag.ObjectBag,
		allowed_tokens: table.Table,
		service_fee: bcs.u64(),
		/** Accumulated service fees for each token type */
		fees: bag.Bag,
	},
});
export const Offer = new MoveStruct({
	name: `${$moduleName}::Offer<phantom T>`,
	fields: {
		balance: balance.Balance,
		counter_offer: bcs.u64(),
		expires_at: bcs.option(bcs.u64()),
	},
});
export const Listing = new MoveStruct({
	name: `${$moduleName}::Listing<phantom T>`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		price: bcs.u64(),
		expires_at: bcs.option(bcs.u64()),
		suins_registration: suins_registration.SuinsRegistration,
	},
});
export const OfferPlacedEvent = new MoveStruct({
	name: `${$moduleName}::OfferPlacedEvent`,
	fields: {
		domain_name: bcs.string(),
		address: bcs.Address,
		value: bcs.u64(),
		token: type_name.TypeName,
		expires_at: bcs.option(bcs.u64()),
	},
});
export const OfferCancelledEvent = new MoveStruct({
	name: `${$moduleName}::OfferCancelledEvent`,
	fields: {
		domain_name: bcs.string(),
		address: bcs.Address,
		value: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const OfferAcceptedEvent = new MoveStruct({
	name: `${$moduleName}::OfferAcceptedEvent`,
	fields: {
		domain_name: bcs.string(),
		owner: bcs.Address,
		buyer: bcs.Address,
		value: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const OfferDeclinedEvent = new MoveStruct({
	name: `${$moduleName}::OfferDeclinedEvent`,
	fields: {
		domain_name: bcs.string(),
		owner: bcs.Address,
		buyer: bcs.Address,
		value: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const MakeCounterOfferEvent = new MoveStruct({
	name: `${$moduleName}::MakeCounterOfferEvent`,
	fields: {
		domain_name: bcs.string(),
		owner: bcs.Address,
		buyer: bcs.Address,
		value: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const AcceptCounterOfferEvent = new MoveStruct({
	name: `${$moduleName}::AcceptCounterOfferEvent`,
	fields: {
		domain_name: bcs.string(),
		buyer: bcs.Address,
		value: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const ListingCreatedEvent = new MoveStruct({
	name: `${$moduleName}::ListingCreatedEvent`,
	fields: {
		listing_id: bcs.Address,
		domain_name: bcs.string(),
		owner: bcs.Address,
		price: bcs.u64(),
		expires_at: bcs.option(bcs.u64()),
		token: type_name.TypeName,
	},
});
export const ListingBoughtEvent = new MoveStruct({
	name: `${$moduleName}::ListingBoughtEvent`,
	fields: {
		listing_id: bcs.Address,
		domain_name: bcs.string(),
		buyer: bcs.Address,
		amount: bcs.u64(),
		token: type_name.TypeName,
	},
});
export const ListingCancelledEvent = new MoveStruct({
	name: `${$moduleName}::ListingCancelledEvent`,
	fields: {
		listing_id: bcs.Address,
		domain_name: bcs.string(),
		owner: bcs.Address,
		token: type_name.TypeName,
	},
});
export interface PlaceOfferArguments {
	suins: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
	expiresAt: RawTransactionArgument<number | bigint | null>;
}
export interface PlaceOfferOptions {
	package?: string;
	arguments:
		| PlaceOfferArguments
		| [
				suins: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
				expiresAt: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string];
}
/** Place an offer on a domain */
export function placeOffer(options: PlaceOfferOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		null,
		null,
		'0x1::string::String',
		null,
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'offerTable', 'domainName', 'coin', 'expiresAt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'place_offer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelOfferArguments {
	offerTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface CancelOfferOptions {
	package?: string;
	arguments:
		| CancelOfferArguments
		| [offerTable: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Cancel an offer on a domain */
export function cancelOffer(options: CancelOfferOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['offerTable', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'cancel_offer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AcceptOfferArguments {
	suins: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
	suinsRegistration: RawTransactionArgument<string>;
	address: RawTransactionArgument<string>;
}
export interface AcceptOfferOptions {
	package?: string;
	arguments:
		| AcceptOfferArguments
		| [
				suins: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
				suinsRegistration: RawTransactionArgument<string>,
				address: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Accept an offer */
export function acceptOffer(options: AcceptOfferOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, null, 'address', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'offerTable', 'suinsRegistration', 'address'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'accept_offer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeclineOfferArguments {
	offerTable: RawTransactionArgument<string>;
	suinsRegistration: RawTransactionArgument<string>;
	address: RawTransactionArgument<string>;
}
export interface DeclineOfferOptions {
	package?: string;
	arguments:
		| DeclineOfferArguments
		| [
				offerTable: RawTransactionArgument<string>,
				suinsRegistration: RawTransactionArgument<string>,
				address: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Decline an offer */
export function declineOffer(options: DeclineOfferOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	const parameterNames = ['offerTable', 'suinsRegistration', 'address'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'decline_offer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MakeCounterOfferArguments {
	offerTable: RawTransactionArgument<string>;
	suinsRegistration: RawTransactionArgument<string>;
	address: RawTransactionArgument<string>;
	counterOfferValue: RawTransactionArgument<number | bigint>;
}
export interface MakeCounterOfferOptions {
	package?: string;
	arguments:
		| MakeCounterOfferArguments
		| [
				offerTable: RawTransactionArgument<string>,
				suinsRegistration: RawTransactionArgument<string>,
				address: RawTransactionArgument<string>,
				counterOfferValue: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/** Make a counter offer */
export function makeCounterOffer(options: MakeCounterOfferOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, 'address', 'u64'] satisfies (string | null)[];
	const parameterNames = ['offerTable', 'suinsRegistration', 'address', 'counterOfferValue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'make_counter_offer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AcceptCounterOfferArguments {
	offerTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface AcceptCounterOfferOptions {
	package?: string;
	arguments:
		| AcceptCounterOfferArguments
		| [
				offerTable: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Accept a counter offer */
export function acceptCounterOffer(options: AcceptCounterOfferOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, '0x1::string::String', null] satisfies (string | null)[];
	const parameterNames = ['offerTable', 'domainName', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'accept_counter_offer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateListingArguments {
	offerTable: RawTransactionArgument<string>;
	price: RawTransactionArgument<number | bigint>;
	expiresAt: RawTransactionArgument<number | bigint | null>;
	suinsRegistration: RawTransactionArgument<string>;
}
export interface CreateListingOptions {
	package?: string;
	arguments:
		| CreateListingArguments
		| [
				offerTable: RawTransactionArgument<string>,
				price: RawTransactionArgument<number | bigint>,
				expiresAt: RawTransactionArgument<number | bigint | null>,
				suinsRegistration: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Create a listing for a domain with a fixed price */
export function createListing(options: CreateListingOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		null,
		'u64',
		'0x1::option::Option<u64>',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['offerTable', 'price', 'expiresAt', 'suinsRegistration'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'create_listing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BuyListingArguments {
	suins: RawTransactionArgument<string>;
	offerTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface BuyListingOptions {
	package?: string;
	arguments:
		| BuyListingArguments
		| [
				suins: RawTransactionArgument<string>,
				offerTable: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Buy a listing */
export function buyListing(options: BuyListingOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null, '0x1::string::String', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'offerTable', 'domainName', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'buy_listing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelListingArguments {
	offerTable: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface CancelListingOptions {
	package?: string;
	arguments:
		| CancelListingArguments
		| [offerTable: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Cancel a listing */
export function cancelListing(options: CancelListingOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['offerTable', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'offer',
			function: 'cancel_listing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
