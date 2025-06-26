// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Implementation of auction module. More information in: ../../../docs */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
import * as linked_table from './deps/sui/linked_table.js';
import * as domain from './domain.js';
import * as coin from './deps/sui/coin.js';
import * as suins_registration from './suins_registration.js';
export function App() {
	return bcs.struct('App', {
		dummy_field: bcs.bool(),
	});
}
export function AuctionHouse() {
	return bcs.struct('AuctionHouse', {
		id: object.UID(),
		balance: balance.Balance(),
		auctions: linked_table.LinkedTable(domain.Domain()),
	});
}
export function Auction() {
	return bcs.struct('Auction', {
		domain: domain.Domain(),
		start_timestamp_ms: bcs.u64(),
		end_timestamp_ms: bcs.u64(),
		winner: bcs.Address,
		current_bid: coin.Coin(),
		nft: suins_registration.SuinsRegistration(),
	});
}
export function AuctionStartedEvent() {
	return bcs.struct('AuctionStartedEvent', {
		domain: domain.Domain(),
		start_timestamp_ms: bcs.u64(),
		end_timestamp_ms: bcs.u64(),
		starting_bid: bcs.u64(),
		bidder: bcs.Address,
	});
}
export function AuctionFinalizedEvent() {
	return bcs.struct('AuctionFinalizedEvent', {
		domain: domain.Domain(),
		start_timestamp_ms: bcs.u64(),
		end_timestamp_ms: bcs.u64(),
		winning_bid: bcs.u64(),
		winner: bcs.Address,
	});
}
export function BidEvent() {
	return bcs.struct('BidEvent', {
		domain: domain.Domain(),
		bid: bcs.u64(),
		bidder: bcs.Address,
	});
}
export function AuctionExtendedEvent() {
	return bcs.struct('AuctionExtendedEvent', {
		domain: domain.Domain(),
		end_timestamp_ms: bcs.u64(),
	});
}
export interface StartAuctionAndPlaceBidArguments {
	self: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	bid: RawTransactionArgument<string>;
}
export interface StartAuctionAndPlaceBidOptions {
	package?: string;
	arguments:
		| StartAuctionAndPlaceBidArguments
		| [
				self: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				bid: RawTransactionArgument<string>,
		  ];
}
/** Start an auction if it's not started yet; and make the first bid. */
export function startAuctionAndPlaceBid(options: StartAuctionAndPlaceBidOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::auction::AuctionHouse`,
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'suins', 'domainName', 'bid', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'start_auction_and_place_bid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PlaceBidArguments {
	self: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	bid: RawTransactionArgument<string>;
}
export interface PlaceBidOptions {
	package?: string;
	arguments:
		| PlaceBidArguments
		| [
				self: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				bid: RawTransactionArgument<string>,
		  ];
}
/**
 * #### Notice
 *
 * Bidders use this function to place a new bid.
 *
 * Panics Panics if `domain` is invalid or there isn't an auction for `domain` or
 * `bid` is too low,
 */
export function placeBid(options: PlaceBidOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::auction::AuctionHouse`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'domainName', 'bid', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'place_bid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClaimArguments {
	self: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface ClaimOptions {
	package?: string;
	arguments:
		| ClaimArguments
		| [self: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
}
/**
 * #### Notice
 *
 * Auction winner can come and claim the NFT
 *
 * Panics sender is not the winner
 */
export function claim(options: ClaimOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::auction::AuctionHouse`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'domainName', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'claim',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetAuctionMetadataArguments {
	self: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface GetAuctionMetadataOptions {
	package?: string;
	arguments:
		| GetAuctionMetadataArguments
		| [self: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
}
/**
 * #### Notice
 *
 * Get metadata of an auction
 *
 * #### Params
 *
 * The domain name being auctioned.
 *
 * #### Return
 *
 * (`start_timestamp_ms`, `end_timestamp_ms`, `winner`, `highest_amount`)
 */
export function getAuctionMetadata(options: GetAuctionMetadataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::auction::AuctionHouse`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'get_auction_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CollectWinningAuctionFundArguments {
	self: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface CollectWinningAuctionFundOptions {
	package?: string;
	arguments:
		| CollectWinningAuctionFundArguments
		| [self: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
}
export function collectWinningAuctionFund(options: CollectWinningAuctionFundOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::auction::AuctionHouse`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'domainName', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'collect_winning_auction_fund',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AdminWithdrawFundsArguments {
	_: RawTransactionArgument<string>;
	self: RawTransactionArgument<string>;
}
export interface AdminWithdrawFundsOptions {
	package?: string;
	arguments:
		| AdminWithdrawFundsArguments
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>];
}
export function adminWithdrawFunds(options: AdminWithdrawFundsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::auction::AuctionHouse`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'admin_withdraw_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AdminFinalizeAuctionArguments {
	admin: RawTransactionArgument<string>;
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface AdminFinalizeAuctionOptions {
	package?: string;
	arguments:
		| AdminFinalizeAuctionArguments
		| [
				admin: RawTransactionArgument<string>,
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
		  ];
}
/**
 * Admin functionality used to finalize a single auction.
 *
 * An `operation_limit` limit must be provided which controls how many individual
 * operations to perform. This allows the admin to be able to make forward progress
 * in finalizing auctions even in the presence of thousands of bids.
 *
 * This will attempt to do as much as possible of the following based on the
 * provided `operation_limit`:
 *
 * - claim the winning bid and place in `AuctionHouse.balance`
 * - push the `SuinsRegistration` to the winner
 * - push loosing bids back to their respective account owners
 *
 * Once all of the above has been done the auction is destroyed, freeing on-chain
 * storage.
 */
export function adminFinalizeAuction(options: AdminFinalizeAuctionOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::auction::AuctionHouse`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['admin', 'self', 'domain', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'admin_finalize_auction',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AdminTryFinalizeAuctionsArguments {
	admin: RawTransactionArgument<string>;
	self: RawTransactionArgument<string>;
	operationLimit: RawTransactionArgument<number | bigint>;
}
export interface AdminTryFinalizeAuctionsOptions {
	package?: string;
	arguments:
		| AdminTryFinalizeAuctionsArguments
		| [
				admin: RawTransactionArgument<string>,
				self: RawTransactionArgument<string>,
				operationLimit: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Admin functionality used to finalize an arbitrary number of auctions.
 *
 * An `operation_limit` limit must be provided which controls how many individual
 * operations to perform. This allows the admin to be able to make forward progress
 * in finalizing auctions even in the presence of thousands of auctions/bids.
 */
export function adminTryFinalizeAuctions(options: AdminTryFinalizeAuctionsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::auction::AuctionHouse`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['admin', 'self', 'operationLimit', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auction',
			function: 'admin_try_finalize_auctions',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
