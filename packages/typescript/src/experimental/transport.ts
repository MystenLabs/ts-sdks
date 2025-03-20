// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// TODO: HOW do we namespace all these types to avoid further polluting/confusing these with existing types?

/** Object methods */
export interface Experimental_ClientTransport {
	getObjects?: (options: GetObjectsOptions) => Promise<GetObjectsResponse>;
	getOwnedObjects?: (options: GetOwnedObjectsOptions) => Promise<GetOwnedObjectsResponse>;
}

export interface GetObjectsOptions {
	objectIds: string[];
	include?: {
		bcs?: boolean;
		// TODO: Json representations are inconsistent across transports...
		json?: boolean;
		// TODo: Do we support everything here, or push people to use transport specific methods?
		// display?: boolean;
		// previousTransaction?: boolean
		// storageRebate?: boolean
	};
}

export interface GetOwnedObjectsOptions {
	address: string;
	limit?: number;
	cursor?: string | null;
	type?: string;
	include?: {
		bcs?: boolean;
		json?: boolean;
		// TODo: Do we support everything here, or push people to use transport specific methods?
		// display?: boolean;
		// previousTransaction?: boolean
		// storageRebate?: boolean
	};
}

export interface GetObjectsResponse {
	objects: ObjectResponse[];
}

export interface GetOwnedObjectsResponse {
	objects: ObjectResponse[];
	hasNextPage: boolean;
	cursor: string | null;
}

export interface ObjectResponse {
	id: string;
	version: number;
	digest: string;
	owner: ObjectOwner;
	type: string;
	include?: {
		bcs?: Uint8Array;
		json?: unknown;
	};
}

/** Balance methods */
export interface Experimental_ClientTransportMethods {
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
	balance: CoinBalance[];
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
export interface Experimental_ClientTransportMethods {
	getTransaction?: (options: GetTransactionOptions) => Promise<GetTransactionResponse>;
	executeTransaction?: (options: ExecuteTransactionOptions) => Promise<ExecuteTransactionResponse>;
	dryRunTransaction?: (options: DryRunTransactionOptions) => Promise<DryRunTransactionResponse>;
	// TODO: Do we want to support any transaction queries (eg by sender?).  Leaning towards leaving this for extensions
}

export interface TransactionResponse {
	digest: string;
	signatures: string[];
	// TODO: I think we always want to load transaction data as bcs, but I am not sure if we should parse in the transport or the base client, leaning towards the base client
	bcs?: Uint8Array;
	effects?: Uint8Array;
	events?: Uint8Array;
	// TODO: Object changes and balance changes (object changes only add types)
}

export interface GetTransactionOptions {
	digest: string;
	include?: {
		bcs?: boolean;
		effects?: boolean;
		events?: boolean;
	};
}

export interface GetTransactionResponse {
	transaction: TransactionResponse;
}

export interface ExecuteTransactionOptions {
	transaction: Uint8Array;
	signatures: string[];
	include?: {
		bcs?: boolean;
		effects?: boolean;
		events?: boolean;
	};
}

export interface DryRunTransactionOptions {
	transaction: Uint8Array;
	signatures: string[];
}

export interface DryRunTransactionResponse {
	transaction: TransactionResponse;
}

export interface ExecuteTransactionResponse {
	transaction: TransactionResponse;
}

export interface Experimental_ClientTransportMethods {
	getReferenceGasPrice?: () => Promise<GetReferenceGasPriceResponse>;
}

export interface GetReferenceGasPriceResponse {
	referenceGasPrice: bigint;
}

/** ObjectOwner types */

// TODO: We should make sure these are compatible with related BCS types
export interface AddressOwner {
	$kind: 'AddressOwner';
	address: string;
}

export interface ParentOwner {
	$kind: 'ObjectOwner';
	address: string;
}

export interface SharedOwner {
	$kind: 'Shared';
	initialSharedVersion: string;
}

export interface ImmutableOwner {
	$kind: 'Immutable';
}

export interface ConsensusV2Owner {
	$kind: 'ConsensusV2';
	authenticator: ConsensusV2Authenticator;
	startVersion: string;
}

export interface SingleOwnerAuthenticator {
	$kind: 'SingleOwner';
	address: string;
}

export type ConsensusV2Authenticator = SingleOwnerAuthenticator;

export type ObjectOwner =
	| AddressOwner
	| ParentOwner
	| SharedOwner
	| ImmutableOwner
	| ConsensusV2Owner;
