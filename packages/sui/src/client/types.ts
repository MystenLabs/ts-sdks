// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { EnumOutputShape } from '@mysten/bcs';
import type {
	SerializedTransactionDataV2,
	TransactionPlugin,
	Transaction as TransactionInstance,
} from '../transactions/index.js';
import type { Signer } from '../cryptography/keypair.js';
import type { ClientCache } from './cache.js';
import type { BaseClient } from './client.js';

export type SuiClientRegistration<
	T extends BaseClient = BaseClient,
	Name extends string = string,
	Extension = unknown,
> = {
	readonly name: Name;
	readonly register: (client: T) => Extension;
};

export type ClientWithExtensions<T, Base extends BaseClient = BaseClient> = Base & T;

export namespace SuiClientTypes {
	export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet' | (string & {});

	export interface SuiClientOptions {
		network: Network;
		base?: BaseClient;
		cache?: ClientCache;
	}

	export interface MvrOptions {
		url?: string;
		pageSize?: number;
		overrides?: {
			packages?: Record<string, string>;
			types?: Record<string, string>;
		};
	}

	export interface CoreClientMethodOptions {
		signal?: AbortSignal;
	}

	/** Object methods */
	export interface TransportMethods {
		getObjects: <Include extends ObjectInclude = {}>(
			options: GetObjectsOptions<Include>,
		) => Promise<GetObjectsResponse<Include>>;
		listOwnedObjects: <Include extends ObjectInclude = {}>(
			options: ListOwnedObjectsOptions<Include>,
		) => Promise<ListOwnedObjectsResponse<Include>>;
		listCoins: (options: ListCoinsOptions) => Promise<ListCoinsResponse>;
		listDynamicFields: (options: ListDynamicFieldsOptions) => Promise<ListDynamicFieldsResponse>;
		getDynamicField: (options: GetDynamicFieldOptions) => Promise<GetDynamicFieldResponse>;
	}

	export interface ObjectInclude {
		content?: boolean;
		previousTransaction?: boolean;
		objectBcs?: boolean;
		json?: boolean;
	}

	export interface GetObjectsOptions<
		Include extends ObjectInclude = {},
	> extends CoreClientMethodOptions {
		objectIds: string[];
		include?: Include;
	}

	export interface GetObjectOptions<
		Include extends ObjectInclude = {},
	> extends CoreClientMethodOptions {
		objectId: string;
		include?: Include;
	}

	export interface ListOwnedObjectsOptions<
		Include extends ObjectInclude = {},
	> extends CoreClientMethodOptions {
		owner: string;
		limit?: number;
		cursor?: string | null;
		type?: string;
		include?: Include;
	}

	export interface ListCoinsOptions extends CoreClientMethodOptions {
		owner: string;
		/** Defaults to `0x2::sui::SUI` */
		coinType?: string;
		limit?: number;
		cursor?: string | null;
	}

	export interface ListDynamicFieldsOptions extends CoreClientMethodOptions {
		parentId: string;
		limit?: number;
		cursor?: string | null;
	}

	export interface GetDynamicFieldOptions extends CoreClientMethodOptions {
		parentId: string;
		name: DynamicFieldName;
	}

	export interface GetObjectsResponse<out Include extends ObjectInclude = {}> {
		objects: (Object<Include> | Error)[];
	}

	export interface GetObjectResponse<out Include extends ObjectInclude = {}> {
		object: Object<Include>;
	}

	export interface ListOwnedObjectsResponse<out Include extends ObjectInclude = {}> {
		objects: Object<Include>[];
		hasNextPage: boolean;
		cursor: string | null;
	}

	export interface ListCoinsResponse {
		objects: Coin[];
		hasNextPage: boolean;
		cursor: string | null;
	}

	export interface Object<Include extends ObjectInclude = {}> {
		objectId: string;
		version: string;
		digest: string;
		owner: ObjectOwner;
		type: string;
		content: Include extends { content: true } ? Uint8Array<ArrayBuffer> : undefined;
		previousTransaction: Include extends { previousTransaction: true } ? string | null : undefined;
		objectBcs: Include extends { objectBcs: true } ? Uint8Array<ArrayBuffer> : undefined;
		/**
		 * The JSON representation of the object's Move struct content.
		 *
		 * **Warning:** The exact shape and field names of this data may vary between different
		 * API implementations (JSON-RPC vs gRPC or GraphQL). For consistent data across APIs use
		 * the `content` field and parse the BCS data directly.
		 */
		json: Include extends { json: true } ? Record<string, unknown> | null : undefined;
	}

	export interface Coin {
		objectId: string;
		version: string;
		digest: string;
		owner: ObjectOwner;
		type: string;
		balance: string;
	}

	export interface ListDynamicFieldsResponse {
		hasNextPage: boolean;
		cursor: string | null;
		dynamicFields: {
			fieldId: string;
			type: string;
			name: DynamicFieldName;
			valueType: string;
		}[];
	}

	export interface GetDynamicFieldResponse {
		dynamicField: {
			name: DynamicFieldName;
			value: DynamicFieldValue;
			fieldId: string;
			version: string;
			digest: string;
			type: string;
			previousTransaction: string | null;
		};
	}

	export interface GetDynamicObjectFieldOptions<
		Include extends ObjectInclude = {},
	> extends CoreClientMethodOptions {
		parentId: string;
		name: DynamicFieldName;
		include?: Include;
	}

	export interface GetDynamicObjectFieldResponse<out Include extends ObjectInclude = {}> {
		object: Object<Include>;
	}

	export interface DynamicFieldName {
		type: string;
		bcs: Uint8Array;
	}

	export interface DynamicFieldValue {
		type: string;
		bcs: Uint8Array;
	}

	/** Balance methods */
	export interface TransportMethods {
		getBalance: (options: GetBalanceOptions) => Promise<GetBalanceResponse>;
		listBalances: (options: ListBalancesOptions) => Promise<ListBalancesResponse>;
	}

	export interface GetBalanceOptions extends CoreClientMethodOptions {
		owner: string;
		/** Defaults to `0x2::sui::SUI` */
		coinType?: string;
	}

	export interface Balance {
		coinType: string;
		balance: string;
		coinBalance: string;
		addressBalance: string;
	}

	export interface GetBalanceResponse {
		balance: Balance;
	}

	export interface ListBalancesOptions extends CoreClientMethodOptions {
		owner: string;
		limit?: number;
		cursor?: string | null;
	}

	export interface ListBalancesResponse {
		balances: Balance[];
		hasNextPage: boolean;
		cursor: string | null;
	}

	/** Coin metadata methods */
	export interface TransportMethods {
		getCoinMetadata: (options: GetCoinMetadataOptions) => Promise<GetCoinMetadataResponse>;
	}

	export interface GetCoinMetadataOptions extends CoreClientMethodOptions {
		coinType: string;
	}

	export interface CoinMetadata {
		id: string | null;
		decimals: number;
		name: string;
		symbol: string;
		description: string;
		iconUrl: string | null;
	}

	export interface GetCoinMetadataResponse {
		coinMetadata: CoinMetadata | null;
	}

	/** Transaction methods */
	export interface TransportMethods {
		getTransaction: <Include extends TransactionInclude = {}>(
			options: GetTransactionOptions<Include>,
		) => Promise<TransactionResult<Include>>;
		executeTransaction: <Include extends TransactionInclude = {}>(
			options: ExecuteTransactionOptions<Include>,
		) => Promise<TransactionResult<Include>>;
		simulateTransaction: <Include extends SimulateTransactionInclude = {}>(
			options: SimulateTransactionOptions<Include>,
		) => Promise<SimulateTransactionResult<Include>>;
		resolveTransactionPlugin: () => TransactionPlugin;
	}

	export interface Transaction<out Include extends TransactionInclude = {}> {
		digest: string;
		signatures: string[];
		epoch: string | null;
		status: ExecutionStatus;
		balanceChanges: Include extends { balanceChanges: true } ? BalanceChange[] : undefined;
		effects: Include extends { effects: true } ? TransactionEffects : undefined;
		events: Include extends { events: true } ? Event[] : undefined;
		objectTypes: Include extends { objectTypes: true } ? Record<string, string> : undefined;
		transaction: Include extends { transaction: true } ? TransactionData : undefined;
		bcs: Include extends { bcs: true } ? Uint8Array : undefined;
	}

	export type TransactionResult<Include extends TransactionInclude = {}> =
		| {
				$kind: 'Transaction';
				Transaction: Transaction<Include>;
				FailedTransaction?: never;
		  }
		| {
				$kind: 'FailedTransaction';
				Transaction?: never;
				FailedTransaction: Transaction<Include>;
		  };

	export type SimulateTransactionResult<Include extends SimulateTransactionInclude = {}> =
		| {
				$kind: 'Transaction';
				Transaction: Transaction<Include>;
				FailedTransaction?: never;
				commandResults: Include extends { commandResults: true } ? CommandResult[] : undefined;
		  }
		| {
				$kind: 'FailedTransaction';
				Transaction?: never;
				FailedTransaction: Transaction<Include>;
				commandResults: Include extends { commandResults: true } ? CommandResult[] : undefined;
		  };

	export interface TransactionInclude {
		balanceChanges?: boolean;
		effects?: boolean;
		events?: boolean;
		objectTypes?: boolean;
		transaction?: boolean;
		bcs?: boolean;
	}

	export interface SimulateTransactionInclude extends TransactionInclude {
		commandResults?: boolean;
	}

	export interface CommandResult {
		returnValues: CommandOutput[];
		mutatedReferences: CommandOutput[];
	}

	export interface CommandOutput {
		bcs: Uint8Array;
	}

	export interface BalanceChange {
		coinType: string;
		address: string;
		amount: string;
	}

	export interface TransactionData extends SerializedTransactionDataV2 {}

	export interface GetTransactionOptions<
		Include extends TransactionInclude = {},
	> extends CoreClientMethodOptions {
		digest: string;
		include?: Include;
	}

	export type WaitForTransactionOptions<Include extends TransactionInclude = {}> =
		| WaitForTransactionByDigest<Include>
		| WaitForTransactionByResult<Include>;

	export interface WaitForTransactionByDigest<
		Include extends TransactionInclude = {},
	> extends GetTransactionOptions<Include> {
		timeout?: number;
		result?: never;
	}

	export interface WaitForTransactionByResult<
		Include extends TransactionInclude = {},
	> extends CoreClientMethodOptions {
		result: TransactionResult<any>;
		include?: Include;
		timeout?: number;
		digest?: never;
	}

	export interface ExecuteTransactionOptions<
		Include extends TransactionInclude = {},
	> extends CoreClientMethodOptions {
		transaction: Uint8Array;
		signatures: string[];
		include?: Include;
	}

	export interface SignAndExecuteTransactionOptions<
		Include extends TransactionInclude = {},
	> extends CoreClientMethodOptions {
		transaction: Uint8Array | TransactionInstance;
		signer: Signer;
		additionalSignatures?: string[];
		include?: Include;
	}

	export interface SimulateTransactionOptions<
		Include extends SimulateTransactionInclude = {},
	> extends CoreClientMethodOptions {
		transaction: Uint8Array | TransactionInstance;
		include?: Include;
	}

	export interface GetReferenceGasPriceOptions extends CoreClientMethodOptions {}

	export interface TransportMethods {
		getReferenceGasPrice?: (
			options?: GetReferenceGasPriceOptions,
		) => Promise<GetReferenceGasPriceResponse>;
	}

	export interface GetReferenceGasPriceResponse {
		referenceGasPrice: string;
	}

	export interface GetCurrentSystemStateOptions extends CoreClientMethodOptions {}

	export interface TransportMethods {
		getCurrentSystemState?: (
			options?: GetCurrentSystemStateOptions,
		) => Promise<GetCurrentSystemStateResponse>;
	}

	export interface GetCurrentSystemStateResponse {
		systemState: SystemStateInfo;
	}

	export interface GetChainIdentifierOptions extends CoreClientMethodOptions {}

	export interface TransportMethods {
		getChainIdentifier?: (
			options?: GetChainIdentifierOptions,
		) => Promise<GetChainIdentifierResponse>;
	}

	/** The 32-byte genesis checkpoint digest (uniquely identifies the network), base58 encoded. */
	export interface GetChainIdentifierResponse {
		chainIdentifier: string;
	}

	export interface SystemStateInfo {
		systemStateVersion: string;
		epoch: string;
		protocolVersion: string;
		referenceGasPrice: string;
		epochStartTimestampMs: string;
		safeMode: boolean;
		safeModeStorageRewards: string;
		safeModeComputationRewards: string;
		safeModeStorageRebates: string;
		safeModeNonRefundableStorageFee: string;
		parameters: SystemParameters;
		storageFund: StorageFund;
		stakeSubsidy: StakeSubsidy;
	}

	export interface SystemParameters {
		epochDurationMs: string;
		stakeSubsidyStartEpoch: string;
		maxValidatorCount: string;
		minValidatorJoiningStake: string;
		validatorLowStakeThreshold: string;
		validatorLowStakeGracePeriod: string;
	}

	export interface StorageFund {
		totalObjectStorageRebates: string;
		nonRefundableBalance: string;
	}

	export interface StakeSubsidy {
		balance: string;
		distributionCounter: string;
		currentDistributionAmount: string;
		stakeSubsidyPeriodLength: string;
		stakeSubsidyDecreaseRate: number;
	}

	/** ZkLogin methods */
	export interface VerifyZkLoginSignatureOptions extends CoreClientMethodOptions {
		bytes: string;
		signature: string;
		intentScope: 'TransactionData' | 'PersonalMessage';
		address: string;
	}

	export interface ZkLoginVerifyResponse {
		success: boolean;
		errors: string[];
	}

	export interface TransportMethods {
		verifyZkLoginSignature: (
			options: VerifyZkLoginSignatureOptions,
		) => Promise<ZkLoginVerifyResponse>;
	}

	/** Name service methods */
	export interface DefaultNameServiceNameOptions extends CoreClientMethodOptions {
		address: string;
	}

	export interface DefaultNameServiceNameResponse {
		data: {
			name: string | null;
		};
	}

	export interface TransportMethods {
		defaultNameServiceName: (
			options: DefaultNameServiceNameOptions,
		) => Promise<DefaultNameServiceNameResponse>;
	}

	/** MVR methods */

	export interface TransportMethods {
		mvr: MvrMethods;
	}

	export interface MvrMethods {
		resolvePackage: (options: MvrResolvePackageOptions) => Promise<MvrResolvePackageResponse>;
		resolveType: (options: MvrResolveTypeOptions) => Promise<MvrResolveTypeResponse>;
		resolve: (options: MvrResolveOptions) => Promise<MvrResolveResponse>;
	}

	export interface MvrResolvePackageOptions extends CoreClientMethodOptions {
		package: string;
	}

	export interface MvrResolveTypeOptions extends CoreClientMethodOptions {
		type: string;
	}

	export interface MvrResolveOptions extends CoreClientMethodOptions {
		packages?: string[];
		types?: string[];
	}

	export interface MvrResolvePackageResponse {
		package: string;
	}

	export interface MvrResolveTypeResponse {
		type: string;
	}

	export interface MvrResolveResponse {
		packages: Record<
			string,
			{
				package: string;
			}
		>;
		types: Record<
			string,
			{
				type: string;
			}
		>;
	}

	/** Move package methods */

	export interface TransportMethods {
		getMoveFunction: (options: GetMoveFunctionOptions) => Promise<GetMoveFunctionResponse>;
	}

	export interface GetMovePackageOptions extends CoreClientMethodOptions {
		packageId: string;
	}

	export interface GetMovePackageResponse {
		package: PackageResponse;
	}

	export interface PackageResponse {
		storageId: string;
		originalId: string;
		version: string;
		modules: ModuleResponse[];
	}

	export interface ModuleResponse {
		name: string;
		datatypes: DatatypeResponse[];
		functions: FunctionResponse[];
	}

	export type DatatypeResponse =
		| {
				$kind: 'struct';
				typeName: string;
				definingId: string;
				moduleName: string;
				name: string;
				abilities: Ability[];
				typeParameters: TypeParameter[];
				fields: FieldDescriptor[];
		  }
		| {
				$kind: 'enum';
				typeName: string;
				definingId: string;
				moduleName: string;
				name: string;
				abilities: Ability[];
				typeParameters: TypeParameter[];
				variants: VariantDescriptor[];
		  };

	export type Ability = 'copy' | 'drop' | 'store' | 'key' | 'unknown';
	export type DatatypeKind = 'struct' | 'enum' | 'unknown';

	export interface TypeParameter {
		constraints: Ability[];
		isPhantom: boolean;
	}

	export interface FieldDescriptor {
		name: string;
		position: number;
		type: OpenSignatureBody;
	}

	export interface VariantDescriptor {
		name: string;
		position: number;
		fields: FieldDescriptor[];
	}

	export interface GetMoveFunctionOptions extends CoreClientMethodOptions {
		packageId: string;
		moduleName: string;
		name: string;
	}

	export interface GetMoveFunctionResponse {
		function: FunctionResponse;
	}

	export interface GetMoveDatatypeOptions extends CoreClientMethodOptions {
		packageId: string;
		moduleName: string;
		name: string;
	}

	export interface GetMoveDatatypeResponse {
		datatype: DatatypeResponse;
	}

	export type Visibility = 'public' | 'friend' | 'private' | 'unknown';

	export interface FunctionResponse {
		packageId: string;
		moduleName: string;
		name: string;
		visibility: Visibility;
		isEntry: boolean;
		typeParameters: TypeParameter[];
		parameters: OpenSignature[];
		returns: OpenSignature[];
	}

	export type ReferenceType = 'mutable' | 'immutable' | 'unknown';
	export type OpenSignature = {
		reference: ReferenceType | null;
		body: OpenSignatureBody;
	};

	export type OpenSignatureBody =
		| {
				$kind: 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256' | 'bool' | 'address' | 'unknown';
		  }
		| {
				$kind: 'vector';
				vector: OpenSignatureBody;
		  }
		| {
				$kind: 'datatype';
				datatype: {
					typeName: string;
					typeParameters: OpenSignatureBody[];
				};
		  }
		| {
				$kind: 'typeParameter';
				index: number;
		  };

	/** ObjectOwner types */

	export interface AddressOwner {
		$kind: 'AddressOwner';
		AddressOwner: string;
		ObjectOwner?: never;
		Shared?: never;
		Immutable?: never;
		ConsensusAddressOwner?: never;
	}

	export interface ParentOwner {
		$kind: 'ObjectOwner';
		ObjectOwner: string;
		AddressOwner?: never;
		Shared?: never;
		Immutable?: never;
		ConsensusAddressOwner?: never;
	}

	export interface SharedOwner {
		$kind: 'Shared';
		Shared: {
			initialSharedVersion: string;
		};
		AddressOwner?: never;
		ObjectOwner?: never;
		Immutable?: never;
		ConsensusAddressOwner?: never;
	}

	export interface ImmutableOwner {
		$kind: 'Immutable';
		Immutable: true;
		AddressOwner?: never;
		ObjectOwner?: never;
		Shared?: never;
		ConsensusAddressOwner?: never;
	}

	export interface ConsensusAddressOwner {
		$kind: 'ConsensusAddressOwner';
		ConsensusAddressOwner: {
			startVersion: string;
			owner: string;
		};
		AddressOwner?: never;
		ObjectOwner?: never;
		Shared?: never;
		Immutable?: never;
	}

	export interface UnknownOwner {
		$kind: 'Unknown';
		AddressOwner?: never;
		ObjectOwner?: never;
		Shared?: never;
		Immutable?: never;
		ConsensusAddressOwner?: never;
	}

	export type ObjectOwner =
		| AddressOwner
		| ParentOwner
		| SharedOwner
		| ImmutableOwner
		| ConsensusAddressOwner
		| UnknownOwner;

	/** Effects */

	export interface TransactionEffects {
		bcs: Uint8Array | null;
		version: number;
		status: ExecutionStatus;
		gasUsed: GasCostSummary;
		transactionDigest: string;
		gasObject: ChangedObject | null;
		eventsDigest: string | null;
		dependencies: string[];
		lamportVersion: string | null;
		changedObjects: ChangedObject[];
		unchangedConsensusObjects: UnchangedConsensusObject[];
		auxiliaryDataDigest: string | null;
	}

	export interface ChangedObject {
		objectId: string;
		inputState: 'Unknown' | 'DoesNotExist' | 'Exists';
		inputVersion: string | null;
		inputDigest: string | null;
		inputOwner: ObjectOwner | null;
		outputState: 'Unknown' | 'DoesNotExist' | 'ObjectWrite' | 'PackageWrite' | 'AccumulatorWriteV1';
		outputVersion: string | null;
		outputDigest: string | null;
		outputOwner: ObjectOwner | null;
		idOperation: 'Unknown' | 'None' | 'Created' | 'Deleted';
		// TODO: add accumulatorWrite field once its widely available
	}

	export interface GasCostSummary {
		computationCost: string;
		storageCost: string;
		storageRebate: string;
		nonRefundableStorageFee: string;
	}

	export type ExecutionStatus =
		| {
				success: true;
				error: null;
		  }
		| {
				success: false;
				error: ExecutionError;
		  };

	export interface UnchangedConsensusObject {
		kind:
			| 'Unknown'
			| 'ReadOnlyRoot'
			| 'MutateConsensusStreamEnded'
			| 'ReadConsensusStreamEnded'
			| 'Cancelled'
			| 'PerEpochConfig';
		objectId: string;
		version: string | null;
		digest: string | null;
	}

	export interface Event {
		packageId: string;
		module: string;
		sender: string;
		eventType: string;
		bcs: Uint8Array;
	}

	export interface MoveAbort {
		abortCode: string;
		location?: MoveLocation;
		cleverError?: CleverError;
	}

	export interface MoveLocation {
		package?: string;
		module?: string;
		function?: number;
		functionName?: string;
		instruction?: number;
	}

	export interface CleverError {
		errorCode?: number;
		lineNumber?: number;
		constantName?: string;
		constantType?: string;
		value?: string;
	}

	export interface SizeError {
		name: string;
		size: number;
		maxSize: number;
	}

	export interface CommandArgumentError {
		argument: number;
		name: string;
	}

	export interface TypeArgumentError {
		typeArgument: number;
		name: string;
	}

	export interface PackageUpgradeError {
		name: string;
		packageId?: string;
		digest?: string;
	}

	export interface CoinDenyListError {
		name: string;
		coinType: string;
		address?: string;
	}

	export interface CongestedObjects {
		name: string;
		objects: string[];
	}

	export interface IndexError {
		index?: number;
		subresult?: number;
	}

	export interface ObjectIdError {
		name?: string;
		objectId: string;
	}

	export type ExecutionError = {
		message: string;
		command?: number;
	} & EnumOutputShape<{
		MoveAbort: MoveAbort;
		SizeError: SizeError;
		CommandArgumentError: CommandArgumentError;
		TypeArgumentError: TypeArgumentError;
		PackageUpgradeError: PackageUpgradeError;
		IndexError: IndexError;
		CoinDenyListError: CoinDenyListError;
		CongestedObjects: CongestedObjects;
		ObjectIdError: ObjectIdError;
		Unknown: null;
	}>;
}
