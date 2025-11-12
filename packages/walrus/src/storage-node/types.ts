// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BlobMetadata, BlobMetadataWithId, SliverData } from '../utils/bcs.js';

export type BlobMetadataWithId = typeof BlobMetadataWithId.$inferType;

export type SliverType = 'primary' | 'secondary';

export type SliverData = typeof SliverData.$inferType;

export type Uploadable = Uint8Array | ArrayBuffer | ReadableStream | Blob;

export type StorageConfirmation = {
	serializedMessage: string;
	signature: string;
};

export type GetBlobStatusRequestInput = {
	blobId: string;
};

export type GetBlobStatusResponse = BlobStatus;

export type BlobStatus =
	| { type: 'nonexistent' }
	| ({ type: 'invalid' } & InvalidBlobStatus['invalid'])
	| ({ type: 'permanent' } & PermanentBlobStatus['permanent'])
	| ({ type: 'deletable' } & DeletableBlobStatus['deletable']);

export type RawGetBlobStatusResponse = {
	code: number;
	success: {
		data: RawBlobStatus;
	};
};

export type RawBlobStatus =
	| 'nonexistent'
	| InvalidBlobStatus
	| PermanentBlobStatus
	| DeletableBlobStatus;

export type InvalidBlobStatus = {
	invalid: {
		event: StatusEvent;
	};
};

export type PermanentBlobStatus = {
	permanent: {
		deletableCounts: DeletableCounts;
		endEpoch: number;
		isCertified: boolean;
		statusEvent: StatusEvent;
		initialCertifiedEpoch: number | null;
	};
};

export type DeletableBlobStatus = {
	deletable: {
		deletableCounts: DeletableCounts;
		initialCertifiedEpoch: number | null;
	};
};

export type DeletableCounts = {
	count_deletable_total: number;
	count_deletable_certified: number;
};

export type StatusEvent = {
	eventSeq: string;
	txDigest: string;
};

export type GetBlobMetadataRequestInput = {
	blobId: string;
};

export type GetBlobMetadataResponse = BlobMetadataWithId;

export type StoreBlobMetadataRequestInput = {
	blobId: string;
	metadata: Uploadable | typeof BlobMetadata.$inferInput;
};

export type StoreBlobMetadataResponse = {
	success: {
		code: number;
		data: string;
	};
};

export type GetSliverRequestInput = {
	blobId: string;
	sliverType: SliverType;
	sliverPairIndex: number;
};
export type GetSliverResponse = Uint8Array;

export type StoreSliverRequestInput = {
	blobId: string;
	sliver: Uploadable | typeof SliverData.$inferInput;
	sliverType: SliverType;
	sliverPairIndex: number;
};
export type StoreSliverResponse = {
	success: {
		code: number;
		data: string;
	};
};

export type GetDeletableBlobConfirmationRequestInput = {
	blobId: string;
	objectId: string;
};

export type GetDeletableBlobConfirmationResponse = {
	success: {
		code: number;
		data: {
			signed: StorageConfirmation;
		};
	};
};

export type GetPermanentBlobConfirmationRequestInput = {
	blobId: string;
};

export type GetPermanentBlobConfirmationResponse = {
	success: {
		code: number;
		data: {
			signed: StorageConfirmation;
		};
	};
};
