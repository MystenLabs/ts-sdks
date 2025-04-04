// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import type { Experimental_SuiClient } from './client.js';

export type SuiClientRegistration<
	T extends Experimental_SuiClient = Experimental_SuiClient,
	Name extends string = string,
	Extension = unknown,
> =
	| {
			readonly name: Name;
			readonly register: (client: T) => Extension;
	  }
	| SelfRegisteringClientExtension<T, Name, Extension>;

export interface SelfRegisteringClientExtension<
	T extends Experimental_SuiClient = Experimental_SuiClient,
	Name extends string = string,
	Extension = unknown,
> {
	experimental_asClientExtension: () => {
		readonly name: Name;
		readonly register: (client: T) => Extension;
	};
}

export type Simplify<T> = {
	[K in keyof T]: T[K];
} & {};

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

export type ClientWithExtensions<T> = Experimental_SuiClient & T;

export namespace Experimental_SuiClientTypes {
	export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet' | (string & {});

	export interface SuiClientOptions {
		network: Network;
	}
	/** Object methods */
	export interface TransportMethods {
		getObjects?: (options: GetObjectsOptions) => Promise<GetObjectsResponse>;
		getOwnedObjects?: (options: GetOwnedObjectsOptions) => Promise<GetOwnedObjectsResponse>;
		getCoins?: (options: GetCoinsOptions) => Promise<GetCoinsResponse>;
	}

	export interface GetObjectsOptions {
		objectIds: string[];
	}

	export interface GetOwnedObjectsOptions {
		address: string;
		limit?: number;
		cursor?: string | null;
		type?: string;
	}

	export interface GetCoinsOptions {
		address: string;
		coinType: string;
	}

	export interface GetObjectsResponse {
		objects: (ObjectResponse | Error)[];
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
		balance: bigint;
	}

	/** Balance methods */
	export interface TransportMethods {
		getBalance?: (options: GetBalanceOptions) => Promise<GetBalanceResponse>;
		getAllBalances?: (options: GetAllBalancesOptions) => Promise<GetAllBalancesResponse>;
	}

	export interface GetBalanceOptions {
		address: string;
		coinType: string;
	}

	export interface CoinBalance {
		coinType: string;
		balance: bigint;
	}

	export interface GetBalanceResponse {
		balance: CoinBalance;
	}

	export interface GetAllBalancesOptions {
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
		getTransaction?: (options: GetTransactionOptions) => Promise<GetTransactionResponse>;
		executeTransaction?: (
			options: ExecuteTransactionOptions,
		) => Promise<ExecuteTransactionResponse>;
		dryRunTransaction?: (options: DryRunTransactionOptions) => Promise<DryRunTransactionResponse>;
	}

	export interface TransactionResponse {
		digest: string;
		signatures: string[];
		// TODO: Return parsed data:
		// We need structured representations of effects, events, and transaction data
		bcs: Uint8Array;
		effects: Uint8Array;
		events?: Uint8Array;
	}

	export interface GetTransactionOptions {
		digest: string;
	}

	export interface GetTransactionResponse {
		transaction: TransactionResponse;
	}

	export interface ExecuteTransactionOptions {
		transaction: Uint8Array;
		signatures: string[];
	}

	export interface DryRunTransactionOptions {
		transaction: Uint8Array;
	}

	export interface DryRunTransactionResponse {
		transaction: TransactionResponse;
	}

	export interface ExecuteTransactionResponse {
		transaction: TransactionResponse;
	}

	export interface TransportMethods {
		getReferenceGasPrice?: () => Promise<GetReferenceGasPriceResponse>;
	}

	export interface GetReferenceGasPriceResponse {
		referenceGasPrice: bigint;
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

	export interface ConsensusV2Owner {
		$kind: 'ConsensusV2';
		ConsensusV2Owner: {
			authenticator: ConsensusV2Authenticator;
			startVersion: string;
		};
	}

	export interface SingleOwnerAuthenticator {
		$kind: 'SingleOwner';
		SingleOwner: string;
	}

	export type ConsensusV2Authenticator = SingleOwnerAuthenticator;

	export type ObjectOwner =
		| AddressOwner
		| ParentOwner
		| SharedOwner
		| ImmutableOwner
		| ConsensusV2Owner;

	/** Effects */

	export interface TransactionEffects {
		bcs: Uint8Array;
		digest: string;
		version: number;
		status: ExecutionStatus;
		epoch: bigint | null;
		gasUsed: GasCostSummary;
		transactionDigest: string;
		gasObject: ChangedObject;
		eventsDigest: string | null;
		dependencies: string[];
		lamportVersion: bigint | null;
		changedObjects: ChangedObject[];
		unchangedSharedObjects: UnchangedSharedObject[];
		auxiliaryDataDigest: string | null;
	}

	export interface ChangedObject {
		id: string;
		inputState: 'Unknown' | 'DoesNotExist' | 'Exists';
		inputVersion: bigint | null;
		inputDigest: string | null;
		inputOwner: ObjectOwner | null;
		outputState: 'Unknown' | 'DoesNotExist' | 'ObjectWrite' | 'PackageWrite';
		outputVersion: bigint | null;
		outputDigest: string | null;
		outputOwner: ObjectOwner | null;
		idOperation: 'Unknown' | 'None' | 'Created' | 'Deleted';
		objectType: string | null;
	}

	export interface GasCostSummary {
		computationCost: bigint;
		storageCost: bigint;
		storageRebate: bigint;
		nonRefundableStorageFee: bigint;
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
			| 'Canceled'
			| 'PerEpochConfig';
		objectId: string;
		version: bigint;
		digest: string;
		objectType: string;
	}
}
