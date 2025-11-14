// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import type { SerializedTransactionDataV2, TransactionPlugin } from '../transactions/index.js';
import type { ClientCache } from './cache.js';
import type { Experimental_BaseClient } from './client.js';

export type SuiClientRegistration<
	T extends Experimental_BaseClient = Experimental_BaseClient,
	Name extends string = string,
	Extension = unknown,
> = {
	readonly name: Name;
	readonly register: (client: T) => Extension;
};

export type ClientWithExtensions<
	T,
	Base extends Experimental_BaseClient = Experimental_BaseClient,
> = Base & T;

export namespace Experimental_SuiClientTypes {
	export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet' | (string & {});

	export interface SuiClientOptions {
		network: Network;
		base?: Experimental_BaseClient;
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
		getObjects: (options: GetObjectsOptions) => Promise<GetObjectsResponse>;
		getOwnedObjects: (options: GetOwnedObjectsOptions) => Promise<GetOwnedObjectsResponse>;
		getCoins: (options: GetCoinsOptions) => Promise<GetCoinsResponse>;
		getDynamicFields: (options: GetDynamicFieldsOptions) => Promise<GetDynamicFieldsResponse>;
		getDynamicField: (options: GetDynamicFieldOptions) => Promise<GetDynamicFieldResponse>;
	}

	export interface GetObjectsOptions extends CoreClientMethodOptions {
		objectIds: string[];
	}

	export interface GetObjectOptions extends CoreClientMethodOptions {
		objectId: string;
	}

	export interface GetOwnedObjectsOptions extends CoreClientMethodOptions {
		address: string;
		limit?: number;
		cursor?: string | null;
		type?: string;
	}

	export interface GetCoinsOptions extends CoreClientMethodOptions {
		address: string;
		coinType: string;
		limit?: number;
		cursor?: string | null;
	}

	export interface GetDynamicFieldsOptions extends CoreClientMethodOptions {
		parentId: string;
		limit?: number;
		cursor?: string | null;
	}

	export interface GetDynamicFieldOptions extends CoreClientMethodOptions {
		parentId: string;
		name: DynamicFieldName;
	}

	export interface GetObjectsResponse {
		objects: (ObjectResponse | Error)[];
	}

	export interface GetObjectResponse {
		object: ObjectResponse;
	}

	export interface GetOwnedObjectsResponse {
		objects: ObjectResponse[];
		hasNextPage: boolean;
		cursor: string | null;
	}

	export interface GetCoinsResponse {
		objects: CoinResponse[];
		hasNextPage: boolean;
		cursor: string | null;
	}

	export interface ObjectResponse {
		id: string;
		version: string;
		digest: string;
		owner: ObjectOwner;
		type: string;
		content: PromiseLike<Uint8Array>;
		previousTransaction: string | null;
	}

	export interface CoinResponse extends ObjectResponse {
		balance: string;
	}

	export interface GetDynamicFieldsResponse {
		hasNextPage: boolean;
		cursor: string | null;
		dynamicFields: {
			id: string;
			type: string;
			name: DynamicFieldName;
		}[];
	}

	export interface GetDynamicFieldResponse {
		dynamicField: {
			name: DynamicFieldName;
			value: DynamicFieldValue;
			id: string;
			version: string;
			digest: string;
			type: string;
			previousTransaction: string | null;
		};
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
		getAllBalances: (options: GetAllBalancesOptions) => Promise<GetAllBalancesResponse>;
	}

	export interface GetBalanceOptions extends CoreClientMethodOptions {
		address: string;
		coinType: string;
	}

	export interface CoinBalance {
		coinType: string;
		balance: string;
	}

	export interface GetBalanceResponse {
		balance: CoinBalance;
	}

	export interface GetAllBalancesOptions extends CoreClientMethodOptions {
		address: string;
		limit?: number;
		cursor?: string | null;
	}

	export interface GetAllBalancesResponse {
		balances: CoinBalance[];
		hasNextPage: boolean;
		cursor: string | null;
	}

	/** Transaction methods */
	export interface TransportMethods {
		getTransaction: (options: GetTransactionOptions) => Promise<GetTransactionResponse>;
		executeTransaction: (options: ExecuteTransactionOptions) => Promise<ExecuteTransactionResponse>;
		dryRunTransaction: (options: DryRunTransactionOptions) => Promise<DryRunTransactionResponse>;
		resolveTransactionPlugin: () => TransactionPlugin;
	}

	export interface TransactionResponse {
		digest: string;
		signatures: string[];
		epoch: string | null;
		effects: TransactionEffects;
		objectTypes: PromiseLike<Record<string, string>>;
		transaction: TransactionData;
		balanceChanges: BalanceChange[];
		// TODO: add events
		// events?: Uint8Array;
	}

	export interface BalanceChange {
		coinType: string;
		address: string;
		amount: string;
	}

	export interface TransactionData extends SerializedTransactionDataV2 {
		bcs: Uint8Array;
	}

	export interface GetTransactionOptions extends CoreClientMethodOptions {
		digest: string;
	}

	export interface GetTransactionResponse {
		transaction: TransactionResponse;
	}

	export interface ExecuteTransactionOptions extends CoreClientMethodOptions {
		transaction: Uint8Array;
		signatures: string[];
	}

	export interface DryRunTransactionOptions extends CoreClientMethodOptions {
		transaction: Uint8Array;
	}

	export interface DryRunTransactionResponse {
		transaction: TransactionResponse;
	}

	export interface ExecuteTransactionResponse {
		transaction: TransactionResponse;
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

	/** ZkLogin methods */
	export interface VerifyZkLoginSignatureOptions extends CoreClientMethodOptions {
		bytes: string;
		signature: string;
		intentScope: 'TransactionData' | 'PersonalMessage';
		author: string;
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
	}

	export interface ParentOwner {
		$kind: 'ObjectOwner';
		ObjectOwner: string;
	}

	export interface SharedOwner {
		$kind: 'Shared';
		Shared: {
			initialSharedVersion: string;
		};
	}

	export interface ImmutableOwner {
		$kind: 'Immutable';
		Immutable: true;
	}

	export interface ConsensusAddressOwner {
		$kind: 'ConsensusAddressOwner';
		ConsensusAddressOwner: {
			owner: string;
			startVersion: string;
		};
	}

	export interface UnknownOwner {
		$kind: 'Unknown';
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
		digest: string;
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
		id: string;
		inputState: 'Unknown' | 'DoesNotExist' | 'Exists';
		inputVersion: string | null;
		inputDigest: string | null;
		inputOwner: ObjectOwner | null;
		outputState: 'Unknown' | 'DoesNotExist' | 'ObjectWrite' | 'PackageWrite';
		outputVersion: string | null;
		outputDigest: string | null;
		outputOwner: ObjectOwner | null;
		idOperation: 'Unknown' | 'None' | 'Created' | 'Deleted';
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
				// TODO: this should probably be typed better: https://github.com/bmwill/sui/blob/646a2c819346dc140cc649eb9fea368fb14f96e5/crates/sui-rpc-api/proto/sui/rpc/v2beta/execution_status.proto#L22
				error: string;
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
}
