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
import type { BlobMetadata } from './utils/bcs.js';

export interface WalrusPackageConfig {
	packageId: string;
	systemObjectId: string;
	stakingPoolId: string;
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
	size: number;
	epochs: number;
	walCoin?: TransactionObjectArgument;
}

export interface RegisterBlobOptions extends StorageWithSizeOptions {
	blobId: string;
	rootHash: Uint8Array;
	deletable: boolean;
	walCoin?: TransactionObjectArgument;
}

export interface CertifyBlobOptions {
	blobId: string;
	blobObjectId: string;
	confirmations: (StorageConfirmation | null)[];
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

export type WriteBlobOptions = {
	blob: Uint8Array;
	deletable: boolean;
	epochs: number;
	signer: Signer;
	owner?: string;
} & WalrusClientRequestOptions;

export interface DeleteBlobOptions {
	blobObjectId: string;
}

export type ExtendBlobOptions = {
	blobObjectId: string;
	walCoin?: TransactionObjectArgument;
} & (
	| {
			epochs: number;
			endEpoch?: never;
	  }
	| {
			endEpoch: number;
			epochs?: never;
	  }
);
