// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { TransactionObjectArgument } from '@mysten/sui/transactions';

import type { StorageNodeInfo } from './contracts/storage_node.js';
import type { RequestOptions, StorageNodeClientOptions } from './storage-node/client.js';
import type {
	StorageConfirmation,
	StoreBlobMetadataRequestInput,
	StoreSliverRequestInput,
	Uploadable,
} from './storage-node/types.js';
import type { BlobMetadata, EncodingType } from './utils/bcs.js';

/**
 * Configuration for the Walrus package on sui
 *
 * This is used to configure the Walrus package to use a specific package ID, system object ID, staking pool ID, and WAL package ID.
 */
export interface WalrusPackageConfig {
	/** The package ID of the Walrus package */
	packageId: string;
	latestPackageId: string;
	/** The system object ID of the Walrus package */
	systemObjectId: string;
	/** The staking pool ID of the Walrus package */
	stakingPoolId: string;
	/** The package ID of the WAL coin */
	walPackageId: string;
	exchange?: {
		packageId: string;
		exchangeIds: string[];
	};
}

type SuiClientOrRpcUrl =
	| {
			suiClient: SuiClient;
			suiRpcUrl?: never;
	  }
	| {
			suiRpcUrl: string;
			suiClient?: never;
	  };

type WalrusNetworkOrPackageConfig =
	| {
			network: 'testnet';
			packageConfig?: WalrusPackageConfig;
	  }
	| {
			network?: never;
			packageConfig: WalrusPackageConfig;
	  };

/**
 * Configuration for the Walrus client.
 *
 * This is used to configure the Walrus client to use a specific storage node client options, network, and Sui client or RPC URL.
 */
export type WalrusClientConfig = {
	storageNodeClientOptions?: StorageNodeClientOptions;
} & WalrusNetworkOrPackageConfig &
	SuiClientOrRpcUrl;

export type WalrusClientRequestOptions = Pick<RequestOptions, 'signal'>;

export interface StorageNode {
	networkUrl: string;
	info: ReturnType<typeof StorageNodeInfo>['$inferType'];
	shardIndices: number[];
	nodeIndex: number;
	id: string;
}

export interface CommitteeInfo {
	byShardIndex: Map<number, StorageNode>;
	nodes: StorageNode[];
}

export interface StorageWithSizeOptions {
	/** The encoded size of the blob. */
	size: number;
	/** The number of epoch the storage will be reserved for. */
	epochs: number;
	/** optionally specify a WAL coin pay for the registration.  This will consume WAL from the signer by default. */
	walCoin?: TransactionObjectArgument;
}

export interface RegisterBlobOptions extends StorageWithSizeOptions {
	blobId: string;
	rootHash: Uint8Array;
	deletable: boolean;
	/** optionally specify a WAL coin pay for the registration.  This will consume WAL from the signer by default. */
	walCoin?: TransactionObjectArgument;
	/** The attributes to write for the blob. */
	attributes?: Record<string, string | null>;
}

export interface CertifyBlobOptions {
	blobId: string;
	blobObjectId: string;
	/** An array of confirmations.
	 * These confirmations must be provided in the same order as the nodes in the committee.
	 * For nodes that have not provided a confirmation you can pass `null` */
	confirmations: (StorageConfirmation | null)[];
	deletable: boolean;
}

type DeletableConfirmationOptions =
	| { deletable: false; objectId?: string }
	| { deletable: true; objectId: string };

export type GetStorageConfirmationOptions = {
	blobId: string;
	nodeIndex: number;
} & DeletableConfirmationOptions &
	WalrusClientRequestOptions;

export type ReadBlobOptions = {
	blobId: string;
} & WalrusClientRequestOptions;

export type GetCertificationEpochOptions = ReadBlobOptions;

export type GetBlobMetadataOptions = ReadBlobOptions;

export type GetSliversOptions = ReadBlobOptions;

export type GetVerifiedBlobStatusOptions = ReadBlobOptions;

export interface SliversForNode {
	primary: {
		sliverIndex: number;
		sliverPairIndex: number;
		shardIndex: number;
		sliver: Uint8Array;
	}[];
	secondary: {
		sliverIndex: number;
		sliverPairIndex: number;
		shardIndex: number;
		sliver: Uint8Array;
	}[];
}

export type WriteSliversToNodeOptions = {
	blobId: string;
	nodeIndex: number;
	slivers: SliversForNode;
} & WalrusClientRequestOptions;

export type WriteSliverOptions = StoreSliverRequestInput & WalrusClientRequestOptions;

export type WriteMetadataOptions = {
	nodeIndex: number;
	metadata: Uploadable | typeof BlobMetadata.$inferInput;
} & StoreBlobMetadataRequestInput &
	WalrusClientRequestOptions;

export type WriteEncodedBlobOptions = {
	blobId: string;
	nodeIndex: number;
	metadata: Uploadable | typeof BlobMetadata.$inferInput;
	slivers: SliversForNode;
} & DeletableConfirmationOptions &
	WalrusClientRequestOptions;

export type WriteEncodedBlobToNodesOptions = {
	blobId: string;
	metadata: Uploadable | typeof BlobMetadata.$inferInput;
	sliversByNode: SliversForNode[];
} & DeletableConfirmationOptions &
	WalrusClientRequestOptions;

export type WriteBlobOptions = {
	blob: Uint8Array;
	deletable: boolean;
	/** The number of epochs the blob should be stored for. */
	epochs: number;
	signer: Signer;
	/** Where the blob should be transferred to after it is registered.  Defaults to the signer address. */
	owner?: string;
	/** The attributes to write for the blob. */
	attributes?: Record<string, string | null>;
} & WalrusClientRequestOptions;

export interface DeleteBlobOptions {
	blobObjectId: string;
}

export type ExtendBlobOptions = {
	blobObjectId: string;
	/** optionally specify a WAL coin pay for the registration.  This will consume WAL from the signer by default. */
	walCoin?: TransactionObjectArgument;
} & (
	| {
			/** The number of epochs the blob should be stored for. */
			epochs: number;
			endEpoch?: never;
	  }
	| {
			/** The new end epoch for the storage period of the blob. */
			endEpoch: number;
			epochs?: never;
	  }
);

export type WriteBlobAttributesOptions = {
	attributes: Record<string, string | null>;
} & (
	| {
			blobObject: TransactionObjectArgument;
			blobObjectId?: never;
	  }
	| {
			blobObjectId: string;
			blobObject?: never;
	  }
);

export type EncodingType = Extract<typeof EncodingType.$inferInput, string>;
