// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** A demo NFT contract with Display configuration for the Sui demo app */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
const $moduleName = 'demo.sui/nft::demo_nft';
export const DemoNFT = new MoveStruct({
	name: `${$moduleName}::DemoNFT`,
	fields: {
		id: object.UID,
		name: bcs.string(),
		description: bcs.string(),
		image_url: bcs.string(),
		creator: bcs.Address,
	},
});
export const DEMO_NFT = new MoveStruct({
	name: `${$moduleName}::DEMO_NFT`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface MintNftArguments {
	name: RawTransactionArgument<string>;
	description: RawTransactionArgument<string>;
	imageUrl: RawTransactionArgument<string>;
	recipient: RawTransactionArgument<string>;
}
export interface MintNftOptions {
	package?: string;
	arguments:
		| MintNftArguments
		| [
				name: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
				imageUrl: RawTransactionArgument<string>,
				recipient: RawTransactionArgument<string>,
		  ];
}
/** Mint a new DemoNFT */
export function mintNft(options: MintNftOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'address',
	] satisfies string[];
	const parameterNames = ['name', 'description', 'imageUrl', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'mint_nft',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintArguments {
	name: RawTransactionArgument<string>;
	description: RawTransactionArgument<string>;
	imageUrl: RawTransactionArgument<string>;
}
export interface MintOptions {
	package?: string;
	arguments:
		| MintArguments
		| [
				name: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
				imageUrl: RawTransactionArgument<string>,
		  ];
}
/** Public function to mint NFT with strings (for easier frontend integration) */
export function mint(options: MintOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['name', 'description', 'imageUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'mint',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NameArguments {
	nft: RawTransactionArgument<string>;
}
export interface NameOptions {
	package?: string;
	arguments: NameArguments | [nft: RawTransactionArgument<string>];
}
export function name(options: NameOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [`${packageAddress}::demo_nft::DemoNFT`] satisfies string[];
	const parameterNames = ['nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DescriptionArguments {
	nft: RawTransactionArgument<string>;
}
export interface DescriptionOptions {
	package?: string;
	arguments: DescriptionArguments | [nft: RawTransactionArgument<string>];
}
export function description(options: DescriptionOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [`${packageAddress}::demo_nft::DemoNFT`] satisfies string[];
	const parameterNames = ['nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ImageUrlArguments {
	nft: RawTransactionArgument<string>;
}
export interface ImageUrlOptions {
	package?: string;
	arguments: ImageUrlArguments | [nft: RawTransactionArgument<string>];
}
export function imageUrl(options: ImageUrlOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [`${packageAddress}::demo_nft::DemoNFT`] satisfies string[];
	const parameterNames = ['nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'image_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreatorArguments {
	nft: RawTransactionArgument<string>;
}
export interface CreatorOptions {
	package?: string;
	arguments: CreatorArguments | [nft: RawTransactionArgument<string>];
}
export function creator(options: CreatorOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [`${packageAddress}::demo_nft::DemoNFT`] satisfies string[];
	const parameterNames = ['nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'creator',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnArguments {
	nft: RawTransactionArgument<string>;
}
export interface BurnOptions {
	package?: string;
	arguments: BurnArguments | [nft: RawTransactionArgument<string>];
}
/** Burn an NFT */
export function burn(options: BurnOptions) {
	const packageAddress = options.package ?? 'demo.sui/nft';
	const argumentsTypes = [`${packageAddress}::demo_nft::DemoNFT`] satisfies string[];
	const parameterNames = ['nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'demo_nft',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
