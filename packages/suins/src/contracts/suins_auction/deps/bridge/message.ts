/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = 'bridge::message';
export const BridgeMessageKey = new MoveStruct({
	name: `${$moduleName}::BridgeMessageKey`,
	fields: {
		source_chain: bcs.u8(),
		message_type: bcs.u8(),
		bridge_seq_num: bcs.u64(),
	},
});
export const BridgeMessage = new MoveStruct({
	name: `${$moduleName}::BridgeMessage`,
	fields: {
		message_type: bcs.u8(),
		message_version: bcs.u8(),
		seq_num: bcs.u64(),
		source_chain: bcs.u8(),
		payload: bcs.vector(bcs.u8()),
	},
});
export const TokenTransferPayload = new MoveStruct({
	name: `${$moduleName}::TokenTransferPayload`,
	fields: {
		sender_address: bcs.vector(bcs.u8()),
		target_chain: bcs.u8(),
		target_address: bcs.vector(bcs.u8()),
		token_type: bcs.u8(),
		amount: bcs.u64(),
	},
});
export const EmergencyOp = new MoveStruct({
	name: `${$moduleName}::EmergencyOp`,
	fields: {
		op_type: bcs.u8(),
	},
});
export const Blocklist = new MoveStruct({
	name: `${$moduleName}::Blocklist`,
	fields: {
		blocklist_type: bcs.u8(),
		validator_eth_addresses: bcs.vector(bcs.vector(bcs.u8())),
	},
});
export const UpdateBridgeLimit = new MoveStruct({
	name: `${$moduleName}::UpdateBridgeLimit`,
	fields: {
		receiving_chain: bcs.u8(),
		sending_chain: bcs.u8(),
		limit: bcs.u64(),
	},
});
export const UpdateAssetPrice = new MoveStruct({
	name: `${$moduleName}::UpdateAssetPrice`,
	fields: {
		token_id: bcs.u8(),
		new_price: bcs.u64(),
	},
});
export const AddTokenOnSui = new MoveStruct({
	name: `${$moduleName}::AddTokenOnSui`,
	fields: {
		native_token: bcs.bool(),
		token_ids: bcs.vector(bcs.u8()),
		token_type_names: bcs.vector(bcs.string()),
		token_prices: bcs.vector(bcs.u64()),
	},
});
export const ParsedTokenTransferMessage = new MoveStruct({
	name: `${$moduleName}::ParsedTokenTransferMessage`,
	fields: {
		message_version: bcs.u8(),
		seq_num: bcs.u64(),
		source_chain: bcs.u8(),
		payload: bcs.vector(bcs.u8()),
		parsed_payload: TokenTransferPayload,
	},
});
export interface ExtractTokenBridgePayloadArguments {
	message: RawTransactionArgument<string>;
}
export interface ExtractTokenBridgePayloadOptions {
	package: string;
	arguments: ExtractTokenBridgePayloadArguments | [message: RawTransactionArgument<string>];
}
export function extractTokenBridgePayload(options: ExtractTokenBridgePayloadOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'extract_token_bridge_payload',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtractEmergencyOpPayloadArguments {
	message: RawTransactionArgument<string>;
}
export interface ExtractEmergencyOpPayloadOptions {
	package: string;
	arguments: ExtractEmergencyOpPayloadArguments | [message: RawTransactionArgument<string>];
}
/** Emergency op payload is just a single byte */
export function extractEmergencyOpPayload(options: ExtractEmergencyOpPayloadOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'extract_emergency_op_payload',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtractBlocklistPayloadArguments {
	message: RawTransactionArgument<string>;
}
export interface ExtractBlocklistPayloadOptions {
	package: string;
	arguments: ExtractBlocklistPayloadArguments | [message: RawTransactionArgument<string>];
}
export function extractBlocklistPayload(options: ExtractBlocklistPayloadOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'extract_blocklist_payload',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtractUpdateBridgeLimitArguments {
	message: RawTransactionArgument<string>;
}
export interface ExtractUpdateBridgeLimitOptions {
	package: string;
	arguments: ExtractUpdateBridgeLimitArguments | [message: RawTransactionArgument<string>];
}
export function extractUpdateBridgeLimit(options: ExtractUpdateBridgeLimitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'extract_update_bridge_limit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtractUpdateAssetPriceArguments {
	message: RawTransactionArgument<string>;
}
export interface ExtractUpdateAssetPriceOptions {
	package: string;
	arguments: ExtractUpdateAssetPriceArguments | [message: RawTransactionArgument<string>];
}
export function extractUpdateAssetPrice(options: ExtractUpdateAssetPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'extract_update_asset_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtractAddTokensOnSuiArguments {
	message: RawTransactionArgument<string>;
}
export interface ExtractAddTokensOnSuiOptions {
	package: string;
	arguments: ExtractAddTokensOnSuiArguments | [message: RawTransactionArgument<string>];
}
export function extractAddTokensOnSui(options: ExtractAddTokensOnSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'extract_add_tokens_on_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SerializeMessageArguments {
	message: RawTransactionArgument<string>;
}
export interface SerializeMessageOptions {
	package: string;
	arguments: SerializeMessageArguments | [message: RawTransactionArgument<string>];
}
export function serializeMessage(options: SerializeMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'serialize_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateTokenBridgeMessageArguments {
	sourceChain: RawTransactionArgument<number>;
	seqNum: RawTransactionArgument<number | bigint>;
	senderAddress: RawTransactionArgument<number[]>;
	targetChain: RawTransactionArgument<number>;
	targetAddress: RawTransactionArgument<number[]>;
	tokenType: RawTransactionArgument<number>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface CreateTokenBridgeMessageOptions {
	package: string;
	arguments:
		| CreateTokenBridgeMessageArguments
		| [
				sourceChain: RawTransactionArgument<number>,
				seqNum: RawTransactionArgument<number | bigint>,
				senderAddress: RawTransactionArgument<number[]>,
				targetChain: RawTransactionArgument<number>,
				targetAddress: RawTransactionArgument<number[]>,
				tokenType: RawTransactionArgument<number>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Token Transfer Message Format: [message_type: u8] [version:u8] [nonce:u64]
 * [source_chain: u8] [sender_address_length:u8] [sender_address: byte[]]
 * [target_chain:u8] [target_address_length:u8] [target_address: byte[]]
 * [token_type:u8] [amount:u64]
 */
export function createTokenBridgeMessage(options: CreateTokenBridgeMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u64', 'vector<u8>', 'u8', 'vector<u8>', 'u8', 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'sourceChain',
		'seqNum',
		'senderAddress',
		'targetChain',
		'targetAddress',
		'tokenType',
		'amount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_token_bridge_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateEmergencyOpMessageArguments {
	sourceChain: RawTransactionArgument<number>;
	seqNum: RawTransactionArgument<number | bigint>;
	opType: RawTransactionArgument<number>;
}
export interface CreateEmergencyOpMessageOptions {
	package: string;
	arguments:
		| CreateEmergencyOpMessageArguments
		| [
				sourceChain: RawTransactionArgument<number>,
				seqNum: RawTransactionArgument<number | bigint>,
				opType: RawTransactionArgument<number>,
		  ];
}
/**
 * Emergency Op Message Format: [message_type: u8] [version:u8] [nonce:u64]
 * [chain_id: u8] [op_type: u8]
 */
export function createEmergencyOpMessage(options: CreateEmergencyOpMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u64', 'u8'] satisfies (string | null)[];
	const parameterNames = ['sourceChain', 'seqNum', 'opType'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_emergency_op_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateBlocklistMessageArguments {
	sourceChain: RawTransactionArgument<number>;
	seqNum: RawTransactionArgument<number | bigint>;
	blocklistType: RawTransactionArgument<number>;
	validatorEcdsaAddresses: RawTransactionArgument<number[][]>;
}
export interface CreateBlocklistMessageOptions {
	package: string;
	arguments:
		| CreateBlocklistMessageArguments
		| [
				sourceChain: RawTransactionArgument<number>,
				seqNum: RawTransactionArgument<number | bigint>,
				blocklistType: RawTransactionArgument<number>,
				validatorEcdsaAddresses: RawTransactionArgument<number[][]>,
		  ];
}
/**
 * Blocklist Message Format: [message_type: u8] [version:u8] [nonce:u64] [chain_id:
 * u8] [blocklist_type: u8] [validator_length: u8] [validator_ecdsa_addresses:
 * byte[][]]
 */
export function createBlocklistMessage(options: CreateBlocklistMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u64', 'u8', 'vector<vector<u8>>'] satisfies (string | null)[];
	const parameterNames = ['sourceChain', 'seqNum', 'blocklistType', 'validatorEcdsaAddresses'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_blocklist_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateUpdateBridgeLimitMessageArguments {
	receivingChain: RawTransactionArgument<number>;
	seqNum: RawTransactionArgument<number | bigint>;
	sendingChain: RawTransactionArgument<number>;
	newLimit: RawTransactionArgument<number | bigint>;
}
export interface CreateUpdateBridgeLimitMessageOptions {
	package: string;
	arguments:
		| CreateUpdateBridgeLimitMessageArguments
		| [
				receivingChain: RawTransactionArgument<number>,
				seqNum: RawTransactionArgument<number | bigint>,
				sendingChain: RawTransactionArgument<number>,
				newLimit: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Update bridge limit Message Format: [message_type: u8] [version:u8] [nonce:u64]
 * [receiving_chain_id: u8] [sending_chain_id: u8] [new_limit: u64]
 */
export function createUpdateBridgeLimitMessage(options: CreateUpdateBridgeLimitMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u64', 'u8', 'u64'] satisfies (string | null)[];
	const parameterNames = ['receivingChain', 'seqNum', 'sendingChain', 'newLimit'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_update_bridge_limit_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateUpdateAssetPriceMessageArguments {
	tokenId: RawTransactionArgument<number>;
	sourceChain: RawTransactionArgument<number>;
	seqNum: RawTransactionArgument<number | bigint>;
	newPrice: RawTransactionArgument<number | bigint>;
}
export interface CreateUpdateAssetPriceMessageOptions {
	package: string;
	arguments:
		| CreateUpdateAssetPriceMessageArguments
		| [
				tokenId: RawTransactionArgument<number>,
				sourceChain: RawTransactionArgument<number>,
				seqNum: RawTransactionArgument<number | bigint>,
				newPrice: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Update asset price message [message_type: u8] [version:u8] [nonce:u64]
 * [chain_id: u8] [token_id: u8] [new_price:u64]
 */
export function createUpdateAssetPriceMessage(options: CreateUpdateAssetPriceMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u8', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['tokenId', 'sourceChain', 'seqNum', 'newPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_update_asset_price_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAddTokensOnSuiMessageArguments {
	sourceChain: RawTransactionArgument<number>;
	seqNum: RawTransactionArgument<number | bigint>;
	nativeToken: RawTransactionArgument<boolean>;
	tokenIds: RawTransactionArgument<number[]>;
	typeNames: RawTransactionArgument<string[]>;
	tokenPrices: RawTransactionArgument<number | bigint[]>;
}
export interface CreateAddTokensOnSuiMessageOptions {
	package: string;
	arguments:
		| CreateAddTokensOnSuiMessageArguments
		| [
				sourceChain: RawTransactionArgument<number>,
				seqNum: RawTransactionArgument<number | bigint>,
				nativeToken: RawTransactionArgument<boolean>,
				tokenIds: RawTransactionArgument<number[]>,
				typeNames: RawTransactionArgument<string[]>,
				tokenPrices: RawTransactionArgument<number | bigint[]>,
		  ];
}
/**
 * Update Sui token message [message_type:u8] [version:u8] [nonce:u64] [chain_id:
 * u8] [native_token:bool] [token_ids:vector<u8>] [token_type_name:vector<String>]
 * [token_prices:vector<u64>]
 */
export function createAddTokensOnSuiMessage(options: CreateAddTokensOnSuiMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'u8',
		'u64',
		'bool',
		'vector<u8>',
		'vector<0x1::string::String>',
		'vector<u64>',
	] satisfies (string | null)[];
	const parameterNames = [
		'sourceChain',
		'seqNum',
		'nativeToken',
		'tokenIds',
		'typeNames',
		'tokenPrices',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_add_tokens_on_sui_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateKeyArguments {
	sourceChain: RawTransactionArgument<number>;
	messageType: RawTransactionArgument<number>;
	bridgeSeqNum: RawTransactionArgument<number | bigint>;
}
export interface CreateKeyOptions {
	package: string;
	arguments:
		| CreateKeyArguments
		| [
				sourceChain: RawTransactionArgument<number>,
				messageType: RawTransactionArgument<number>,
				bridgeSeqNum: RawTransactionArgument<number | bigint>,
		  ];
}
export function createKey(options: CreateKeyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u8', 'u8', 'u64'] satisfies (string | null)[];
	const parameterNames = ['sourceChain', 'messageType', 'bridgeSeqNum'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'create_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface KeyArguments {
	self: RawTransactionArgument<string>;
}
export interface KeyOptions {
	package: string;
	arguments: KeyArguments | [self: RawTransactionArgument<string>];
}
export function key(options: KeyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MessageVersionArguments {
	self: RawTransactionArgument<string>;
}
export interface MessageVersionOptions {
	package: string;
	arguments: MessageVersionArguments | [self: RawTransactionArgument<string>];
}
export function messageVersion(options: MessageVersionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'message_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MessageTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface MessageTypeOptions {
	package: string;
	arguments: MessageTypeArguments | [self: RawTransactionArgument<string>];
}
export function messageType(options: MessageTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'message_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SeqNumArguments {
	self: RawTransactionArgument<string>;
}
export interface SeqNumOptions {
	package: string;
	arguments: SeqNumArguments | [self: RawTransactionArgument<string>];
}
export function seqNum(options: SeqNumOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'seq_num',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SourceChainArguments {
	self: RawTransactionArgument<string>;
}
export interface SourceChainOptions {
	package: string;
	arguments: SourceChainArguments | [self: RawTransactionArgument<string>];
}
export function sourceChain(options: SourceChainOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'source_chain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PayloadArguments {
	self: RawTransactionArgument<string>;
}
export interface PayloadOptions {
	package: string;
	arguments: PayloadArguments | [self: RawTransactionArgument<string>];
}
export function payload(options: PayloadOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'payload',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenTargetChainArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenTargetChainOptions {
	package: string;
	arguments: TokenTargetChainArguments | [self: RawTransactionArgument<string>];
}
export function tokenTargetChain(options: TokenTargetChainOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_target_chain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenTargetAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenTargetAddressOptions {
	package: string;
	arguments: TokenTargetAddressArguments | [self: RawTransactionArgument<string>];
}
export function tokenTargetAddress(options: TokenTargetAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenTypeOptions {
	package: string;
	arguments: TokenTypeArguments | [self: RawTransactionArgument<string>];
}
export function tokenType(options: TokenTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenAmountOptions {
	package: string;
	arguments: TokenAmountArguments | [self: RawTransactionArgument<string>];
}
export function tokenAmount(options: TokenAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EmergencyOpTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface EmergencyOpTypeOptions {
	package: string;
	arguments: EmergencyOpTypeArguments | [self: RawTransactionArgument<string>];
}
export function emergencyOpType(options: EmergencyOpTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'emergency_op_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlocklistTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface BlocklistTypeOptions {
	package: string;
	arguments: BlocklistTypeArguments | [self: RawTransactionArgument<string>];
}
export function blocklistType(options: BlocklistTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'blocklist_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlocklistValidatorAddressesArguments {
	self: RawTransactionArgument<string>;
}
export interface BlocklistValidatorAddressesOptions {
	package: string;
	arguments: BlocklistValidatorAddressesArguments | [self: RawTransactionArgument<string>];
}
export function blocklistValidatorAddresses(options: BlocklistValidatorAddressesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'blocklist_validator_addresses',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateBridgeLimitPayloadSendingChainArguments {
	self: RawTransactionArgument<string>;
}
export interface UpdateBridgeLimitPayloadSendingChainOptions {
	package: string;
	arguments: UpdateBridgeLimitPayloadSendingChainArguments | [self: RawTransactionArgument<string>];
}
export function updateBridgeLimitPayloadSendingChain(
	options: UpdateBridgeLimitPayloadSendingChainOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'update_bridge_limit_payload_sending_chain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateBridgeLimitPayloadReceivingChainArguments {
	self: RawTransactionArgument<string>;
}
export interface UpdateBridgeLimitPayloadReceivingChainOptions {
	package: string;
	arguments:
		| UpdateBridgeLimitPayloadReceivingChainArguments
		| [self: RawTransactionArgument<string>];
}
export function updateBridgeLimitPayloadReceivingChain(
	options: UpdateBridgeLimitPayloadReceivingChainOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'update_bridge_limit_payload_receiving_chain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateBridgeLimitPayloadLimitArguments {
	self: RawTransactionArgument<string>;
}
export interface UpdateBridgeLimitPayloadLimitOptions {
	package: string;
	arguments: UpdateBridgeLimitPayloadLimitArguments | [self: RawTransactionArgument<string>];
}
export function updateBridgeLimitPayloadLimit(options: UpdateBridgeLimitPayloadLimitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'update_bridge_limit_payload_limit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateAssetPricePayloadTokenIdArguments {
	self: RawTransactionArgument<string>;
}
export interface UpdateAssetPricePayloadTokenIdOptions {
	package: string;
	arguments: UpdateAssetPricePayloadTokenIdArguments | [self: RawTransactionArgument<string>];
}
export function updateAssetPricePayloadTokenId(options: UpdateAssetPricePayloadTokenIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'update_asset_price_payload_token_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateAssetPricePayloadNewPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface UpdateAssetPricePayloadNewPriceOptions {
	package: string;
	arguments: UpdateAssetPricePayloadNewPriceArguments | [self: RawTransactionArgument<string>];
}
export function updateAssetPricePayloadNewPrice(options: UpdateAssetPricePayloadNewPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'update_asset_price_payload_new_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsNativeArguments {
	self: RawTransactionArgument<string>;
}
export interface IsNativeOptions {
	package: string;
	arguments: IsNativeArguments | [self: RawTransactionArgument<string>];
}
export function isNative(options: IsNativeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'is_native',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenIdsArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenIdsOptions {
	package: string;
	arguments: TokenIdsArguments | [self: RawTransactionArgument<string>];
}
export function tokenIds(options: TokenIdsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_ids',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenTypeNamesArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenTypeNamesOptions {
	package: string;
	arguments: TokenTypeNamesArguments | [self: RawTransactionArgument<string>];
}
export function tokenTypeNames(options: TokenTypeNamesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_type_names',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TokenPricesArguments {
	self: RawTransactionArgument<string>;
}
export interface TokenPricesOptions {
	package: string;
	arguments: TokenPricesArguments | [self: RawTransactionArgument<string>];
}
export function tokenPrices(options: TokenPricesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'token_prices',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EmergencyOpPauseOptions {
	package: string;
	arguments?: [];
}
export function emergencyOpPause(options: EmergencyOpPauseOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'emergency_op_pause',
		});
}
export interface EmergencyOpUnpauseOptions {
	package: string;
	arguments?: [];
}
export function emergencyOpUnpause(options: EmergencyOpUnpauseOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'emergency_op_unpause',
		});
}
export interface RequiredVotingPowerArguments {
	self: RawTransactionArgument<string>;
}
export interface RequiredVotingPowerOptions {
	package: string;
	arguments: RequiredVotingPowerArguments | [self: RawTransactionArgument<string>];
}
/**
 * Return the required signature threshold for the message, values are voting power
 * in the scale of 10000
 */
export function requiredVotingPower(options: RequiredVotingPowerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'required_voting_power',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToParsedTokenTransferMessageArguments {
	message: RawTransactionArgument<string>;
}
export interface ToParsedTokenTransferMessageOptions {
	package: string;
	arguments: ToParsedTokenTransferMessageArguments | [message: RawTransactionArgument<string>];
}
export function toParsedTokenTransferMessage(options: ToParsedTokenTransferMessageOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'message',
			function: 'to_parsed_token_transfer_message',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
