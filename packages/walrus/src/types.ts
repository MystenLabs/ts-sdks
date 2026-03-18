// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import type { StorageNodeInfo } from './contracts/walrus/storage_node.js';
import type { RequestOptions, StorageNodeClientOptions } from './storage-node/client.js';
import type {
	StorageConfirmation,
	StoreBlobMetadataRequestInput,
	StoreSliverRequestInput,
	Uploadable,
} from './storage-node/types.js';
import type { BlobMetadata, EncodingType } from './utils/bcs.js';
import type { UploadRelayClientOptions } from './upload-relay/client.js';
import type { WalrusFile } from './files/file.js';
import type { Blob } from './contracts/walrus/blob.js';

/**
 * Configuration for the Walrus package on sui
 *
 * This is used to configure the Walrus package to use a specific package ID, system object ID, staking pool ID, and WAL package ID.
 */
export interface WalrusPackageConfig {
	/** The system object ID of the Walrus package */
	systemObjectId: string;
	/** The staking pool ID of the Walrus package */
	stakingPoolId: string;
	exchangeIds?: string[];
}

type WalrusNetworkOrPackageConfig =
	| {
			network: 'mainnet' | 'testnet';
			packageConfig?: WalrusPackageConfig;
	  }
	| {
			network?: never;
			packageConfig: WalrusPackageConfig;
	  };

export type TipStrategy =
	| {
			const: number | bigint;
	  }
	| {
			linear: {
				base: number | bigint;
				perEncodedKib: number | bigint;
			};
	  };

export type UploadRelayTipConfig = {
	address: string;
	max?: number;
	kind: TipStrategy;
};

export interface UploadRelayConfig extends UploadRelayClientOptions {
	sendTip?:
		| null
		| UploadRelayTipConfig
		| {
				max: number;
		  };
}

interface BaseWalrusClientConfig {
	storageNodeClientOptions?: StorageNodeClientOptions;
	wasmUrl?: string;
	uploadRelay?: UploadRelayConfig;
}

/**
 * Configuration for the Walrus client.
 *
 * This is used to configure the Walrus client to use a specific storage node client options, network, and Sui client or RPC URL.
 */
export type WalrusClientConfig = BaseWalrusClientConfig &
	WalrusNetworkOrPackageConfig & {
		suiClient: ClientWithCoreApi;
	};

export type WalrusOptions<Name = 'walrus'> = BaseWalrusClientConfig & {
	packageConfig?: WalrusPackageConfig;
	name?: Name;
};

export type WalrusClientExtensionOptions = BaseWalrusClientConfig & {
	packageConfig?: WalrusPackageConfig;
};

export type WalrusClientRequestOptions = Pick<RequestOptions, 'signal'>;

export interface StorageNode {
	networkUrl: string;
	info: (typeof StorageNodeInfo)['$inferType'];
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

export type CertifyBlobOptions = {
	blobId: string;
	blobObjectId: string;
	deletable: boolean;
} & (
	| {
			/** An array of confirmations.
			 * These confirmations must be provided in the same order as the nodes in the committee.
			 * For nodes that have not provided a confirmation you can pass `null` */
			confirmations: (StorageConfirmation | null)[];
			certificate?: never;
	  }
	| {
			/** A certificate from the upload relay or combined confirmations.
			 * Accepts either a ProtocolMessageCertificate object or a BCS-encoded base64 string. */
			certificate: ProtocolMessageCertificate | string;
			confirmations?: never;
	  }
);

export type DeletableConfirmationOptions =
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

export interface GetSecondarySliverOptions extends WalrusClientRequestOptions {
	blobId: string;
	index: number;
}

export type GetVerifiedBlobStatusOptions = ReadBlobOptions;

export type ComputeBlobMetadataOptions = {
	bytes: Uint8Array;
	numShards?: number;
	/** Provide a nonce from a prior encode to ensure deterministic resume. If omitted, a random nonce is generated. */
	nonce?: Uint8Array;
};

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

export type WriteBlobToUploadRelayOptions = {
	blobId: string;
	blob: Uint8Array;
	nonce: Uint8Array;
	txDigest: string;
	blobObjectId: string;
	deletable: boolean;
	encodingType?: EncodingType;
} & WalrusClientRequestOptions;

export interface WriteBlobBaseOptions {
	deletable: boolean;
	/** The number of epochs the blob should be stored for. */
	epochs: number;
	/** Where the blob should be transferred to after it is registered. Defaults to the signer address. */
	owner?: string;
	/** The attributes to write for the blob. */
	attributes?: Record<string, string | null>;
}

export interface WriteBlobOptions extends WriteBlobBaseOptions, WalrusClientRequestOptions {
	blob: Uint8Array;
	signer: Signer;
	onStep?: (step: WriteBlobStep) => void | Promise<void>;
	resume?: WriteBlobStep;
}

export interface WriteQuiltOptions extends Omit<WriteBlobOptions, 'blob'> {
	blobs: {
		contents: Uint8Array;
		identifier: string;
		tags?: Record<string, string>;
	}[];
}

export interface WriteFilesOptions extends Omit<WriteBlobOptions, 'blob'> {
	files: WalrusFile[];
}

export type WriteBlobStep =
	| WriteBlobStepEncoded
	| WriteBlobStepRegistered
	| WriteBlobStepUploaded
	| WriteBlobStepCertified;

export interface WriteBlobStepEncoded {
	step: 'encoded';
	blobId: string;
	rootHash: string;
	unencodedSize: number;
	nonce?: string;
}

export interface WriteBlobStepRegistered {
	step: 'registered';
	blobId: string;
	blobObjectId: string;
	txDigest: string;
	nonce?: string;
}

export interface WriteBlobStepUploaded {
	step: 'uploaded';
	blobId: string;
	blobObjectId: string;
	txDigest?: string;
	certificate: string;
}

export interface WriteBlobStepCertified {
	step: 'certified';
	blobId: string;
	blobObjectId: string;
	blobObject: (typeof Blob)['$inferType'];
}

export interface WriteFilesFlowOptions {
	files: WalrusFile[];
	resume?: WriteBlobStep;
}

export interface WriteFilesFlowRegisterOptions extends WriteBlobBaseOptions {
	owner: string;
}

export interface WriteFilesFlowUploadOptions {
	digest?: string;
}

export interface WriteFilesFlowRunOptions extends WriteBlobBaseOptions, WalrusClientRequestOptions {
	signer: Signer;
}

export interface WriteFilesFlow {
	encode: () => Promise<WriteBlobStepEncoded>;
	register: (options: WriteFilesFlowRegisterOptions) => Transaction;
	upload: (options?: WriteFilesFlowUploadOptions) => Promise<WriteBlobStepUploaded>;
	certify: () => Transaction;
	listFiles: () => Promise<
		{
			id: string;
			blobId: string;
			blobObject: (typeof Blob)['$inferType'];
		}[]
	>;

	executeRegister: (
		options: WriteFilesFlowRegisterOptions & { signer: Signer },
	) => Promise<WriteBlobStepRegistered>;
	executeCertify: (options: { signer: Signer }) => Promise<WriteBlobStepCertified>;

	run: (options: WriteFilesFlowRunOptions) => AsyncIterable<WriteBlobStep>;
}

export interface WriteBlobFlowOptions {
	blob: Uint8Array;
	resume?: WriteBlobStep;
}

export interface WriteBlobFlowRegisterOptions extends WriteBlobBaseOptions {
	owner: string;
}

export interface WriteBlobFlowUploadOptions extends WalrusClientRequestOptions {
	digest?: string;
	/** Override the deletable flag when resuming without a prior register step. */
	deletable?: boolean;
}

export interface WriteBlobFlowRunOptions extends WriteBlobBaseOptions, WalrusClientRequestOptions {
	signer: Signer;
}

export interface WriteBlobFlow {
	encode: () => Promise<WriteBlobStepEncoded>;
	register: (options: WriteBlobFlowRegisterOptions) => Transaction;
	upload: (options?: WriteBlobFlowUploadOptions) => Promise<WriteBlobStepUploaded>;
	certify: () => Transaction;
	getBlob: () => Promise<WriteBlobStepCertified>;

	executeRegister: (
		options: WriteBlobFlowRegisterOptions & { signer: Signer },
	) => Promise<WriteBlobStepRegistered>;
	executeCertify: (options: { signer: Signer }) => Promise<WriteBlobStepCertified>;

	run: (options: WriteBlobFlowRunOptions) => AsyncIterable<WriteBlobStep>;
}

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

export interface ProtocolMessageCertificate {
	signers: number[];
	serializedMessage: Uint8Array;
	signature: Uint8Array;
}
