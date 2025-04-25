// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import type { Experimental_BaseClient } from './client.js';

export type SuiClientRegistration<
	T extends Experimental_BaseClient = Experimental_BaseClient,
	Name extends string = string,
	Extension = unknown,
> =
	| {
			readonly name: Name;
			readonly register: (client: T) => Extension;
	  }
	| SelfRegisteringClientExtension<T, Name, Extension>;

export interface SelfRegisteringClientExtension<
	T extends Experimental_BaseClient = Experimental_BaseClient,
	Name extends string = string,
	Extension = unknown,
> {
	experimental_asClientExtension: () => {
		readonly name: Name;
		readonly register: (client: T) => Extension;
	};
}

export type ClientWithExtensions<
	T,
	Base extends Experimental_BaseClient = Experimental_BaseClient,
> = Base & T;

export namespace Experimental_SuiClientTypes {
	export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet' | (string & {});

	export interface SuiClientOptions {
		network: Network;
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
		content: Uint8Array;
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
	}

	export interface TransactionResponse {
		digest: string;
		signatures: string[];
		effects: TransactionEffects;
		// TODO: Return parsed data:
		// We need structured representations events, and transaction data
		bcs: Uint8Array;
		// events?: Uint8Array;
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
		verifyZkLoginSignature?: (
			options: VerifyZkLoginSignatureOptions,
		) => Promise<ZkLoginVerifyResponse>;
	}

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

	export interface ConsensusV2 {
		$kind: 'ConsensusV2';
		ConsensusV2: {
			authenticator: ConsensusV2Authenticator;
			startVersion: string;
		};
	}

	export interface SingleOwnerAuthenticator {
		$kind: 'SingleOwner';
		SingleOwner: string;
	}

	export type ConsensusV2Authenticator = SingleOwnerAuthenticator;

	export type ObjectOwner = AddressOwner | ParentOwner | SharedOwner | ImmutableOwner | ConsensusV2;

	/** Effects */

	export interface TransactionEffects {
		bcs: Uint8Array | null;
		digest: string;
		version: number;
		status: ExecutionStatus;
		epoch: string | null;
		gasUsed: GasCostSummary;
		transactionDigest: string;
		gasObject: ChangedObject | null;
		eventsDigest: string | null;
		dependencies: string[];
		lamportVersion: string | null;
		changedObjects: ChangedObject[];
		unchangedSharedObjects: UnchangedSharedObject[];
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
		objectType: string | null;
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

	export interface UnchangedSharedObject {
		kind:
			| 'Unknown'
			| 'ReadOnlyRoot'
			| 'MutateDeleted'
			| 'ReadDeleted'
			| 'Cancelled'
			| 'PerEpochConfig';
		objectId: string;
		version: string | null;
		digest: string | null;
		objectType: string | null;
	}
}
