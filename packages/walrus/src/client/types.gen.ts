// This file is auto-generated by @hey-api/openapi-ts

export type ApiSuccessBlobStatus = {
    success?: {
        code?: number;
        /**
         * Contains the certification status of a blob.
         *
         * If the a permanent blob exists, it also contains its end epoch and the ID of the Sui event
         * from which the latest status (registered or certified) resulted.
         */
        data?: ('nonexistent' | {
    /**
     * The blob ID has been marked as invalid.
     */
    invalid: {
        event: EventID;
    };
} | {
    /**
     * The blob exists within Walrus in a permanent state.
     */
    permanent: {
        deletable_counts: unknown;
        /**
         * The latest epoch at which the blob expires (non-inclusive).
         */
        end_epoch: number;
        initial_certified_epoch?: ((unknown) | null);
        /**
         * Whether the blob is certified (true) or only registered (false).
         */
        is_certified: boolean;
        status_event: EventID;
    };
} | {
    /**
     * The blob exists within Walrus; but there is no related permanent object, so it may be
     * deleted at any time.
     */
    deletable: {
        deletable_counts: unknown;
        initial_certified_epoch?: ((unknown) | null);
    };
});
    };
};

export type ApiSuccessMessage = {
    success?: {
        code?: number;
        data?: string;
    };
};

export type ApiSuccessServiceHealthInfo = {
    success?: {
        code?: number;
        /**
         * Represents information about the health of the storage node service.
         */
        data?: {
            /**
             * The epoch of the storage node.
             */
            epoch: number;
            eventProgress: unknown;
            /**
             * The status of the storage node.
             */
            nodeStatus: string;
            /**
             * The public key of the storage node.
             */
            publicKey: (Blob | File);
            shardDetail?: ((ShardStatusDetail) | null);
            shardSummary: ShardStatusSummary;
            /**
             * The uptime of the service.
             */
            uptime: {
                [key: string]: unknown;
            };
        };
    };
};

export type ApiSuccessSignedMessage = {
    success?: {
        code?: number;
        /**
         * A signed message from a storage node.
         */
        data?: {
            /**
             * The BCS-encoded message.
             *
             * This is serialized as a base64 string in human-readable encoding formats such as JSON.
             */
            serializedMessage: (Blob | File);
            /**
             * The signature over the BCS encoded message.
             */
            signature: (Blob | File);
        };
    };
};

export type ApiSuccessStorageConfirmation = {
    success?: {
        code?: number;
        /**
         * Confirmation from a storage node that it has stored the sliver pairs for a given blob.
         */
        data?: ({
    signed: SignedMessage;
});
    };
};

export type ApiSuccessStoredOnNodeStatus = {
    success?: {
        code?: number;
        /**
         * Contains the storage status of a sliver or metadata.
         */
        data?: 'nonexistent' | 'stored';
    };
};

/**
 * Contains the storage status of a sliver or metadata.
 */
export type data = 'nonexistent' | 'stored';

/**
 * A blob ID encoded as a URL-safe Base64 string, without the trailing equal (=) signs.
 */
export type BlobId = string;

export type EventID = {
    eventSeq: string;
    txDigest: (Blob | File);
};

/**
 * API response body for error responses as JSON.
 *
 * Contains the HTTP code as well as the textual reason.
 */
export type RestApiJsonError = {
    error: (((unknown) | null) & {
    /**
     * INV: This is a valid status code.
     */
    code: number;
    message: string;
});
};

/**
 * Represents information about the health of the storage node service.
 */
export type ServiceHealthInfo = {
    /**
     * The epoch of the storage node.
     */
    epoch: number;
    eventProgress: unknown;
    /**
     * The status of the storage node.
     */
    nodeStatus: string;
    /**
     * The public key of the storage node.
     */
    publicKey: (Blob | File);
    shardDetail?: ((ShardStatusDetail) | null);
    shardSummary: ShardStatusSummary;
    /**
     * The uptime of the service.
     */
    uptime: {
        [key: string]: unknown;
    };
};

/**
 * A shard with its status.
 */
export type ShardHealthInfo = {
    /**
     * The identifier of the shard in the walrus system.
     */
    shard: number;
    status: ShardStatus;
};

/**
 * The current state of a shard on the storage node.
 */
export type ShardStatus = 'unknown' | 'ready' | 'inTransfer' | 'inRecovery' | 'readOnly';

/**
 * Detail statuses of individual shards.
 *
 * Provides the status of each shard for which the node is responsible. Additionally, will provide
 * the status of shards which the node is not responsible for in the current epoch, but
 * nonetheless currently stores. These will not appear in the [`ShardStatusSummary`].
 */
export type ShardStatusDetail = {
    /**
     * Statuses of other shards the node currently stores.
     */
    other: Array<ShardHealthInfo>;
    /**
     * Statuses of the shards for which the node is responsible in this epoch.
     */
    owned: Array<ShardHealthInfo>;
};

/**
 * Summary of the shard statuses.
 *
 * Summarises the number of nodes for which this node is responsible, as well as those that are
 * being transferred to another storage node.
 */
export type ShardStatusSummary = {
    /**
     * The number of shards, for which this node is responsible.
     *
     * Their statuses are summarized in `owned_shard_status`.
     */
    owned: number;
    ownedShardStatus: unknown;
    /**
     * The number of shards, no longer owned by the node, that are read only,
     * i.e., only serving reads from this node.
     */
    readOnly: number;
};

/**
 * A signed message from a storage node.
 */
export type SignedMessage = {
    /**
     * The BCS-encoded message.
     *
     * This is serialized as a base64 string in human-readable encoding formats such as JSON.
     */
    serializedMessage: (Blob | File);
    /**
     * The signature over the BCS encoded message.
     */
    signature: (Blob | File);
};

/**
 * Represents the index of a sliver pair.
 *
 * As blobs are encoded into as many pairs of slivers as there are shards in the committee,
 * this value ranges be from 0 to the number of shards (exclusive).
 */
export type SliverPairIndex = number;

/**
 * A type indicating either a primary or secondary sliver.
 */
export type SliverType = 'primary' | 'secondary';

export type GetStorageConfirmationData = {
    path: {
        blob_id: unknown;
    };
};

export type GetStorageConfirmationResponse = (ApiSuccessStorageConfirmation);

export type GetStorageConfirmationError = (RestApiJsonError);

export type InconsistencyProofData = {
    /**
     * BCS-encoded inconsistency proof
     */
    body: (Blob | File);
    path: {
        blob_id: unknown;
        sliver_type: SliverType;
    };
};

export type InconsistencyProofResponse = (ApiSuccessSignedMessage);

export type InconsistencyProofError = (RestApiJsonError);

export type GetMetadataData = {
    path: {
        blob_id: unknown;
    };
};

export type GetMetadataResponse = ((Blob | File));

export type GetMetadataError = (RestApiJsonError);

export type PutMetadataData = {
    /**
     * BCS-encoded metadata octet-stream
     */
    body: (Blob | File);
    path: {
        blob_id: unknown;
    };
};

export type PutMetadataResponse = (ApiSuccessMessage);

export type PutMetadataError = (RestApiJsonError);

export type GetSliverData = {
    path: {
        blob_id: unknown;
        sliver_pair_index: SliverPairIndex;
        sliver_type: SliverType;
    };
};

export type GetSliverResponse = ((Blob | File));

export type GetSliverError = (RestApiJsonError);

export type PutSliverData = {
    /**
     * BCS-encoded sliver octet-stream
     */
    body: (Blob | File);
    path: {
        blob_id: unknown;
        sliver_pair_index: SliverPairIndex;
        sliver_type: SliverType;
    };
};

export type PutSliverResponse = (ApiSuccessMessage);

export type PutSliverError = (RestApiJsonError);

export type GetRecoverySymbolData = {
    path: {
        blob_id: unknown;
        sliver_pair_index: SliverPairIndex;
        sliver_type: SliverType;
        target_pair_index: SliverPairIndex;
    };
};

export type GetRecoverySymbolResponse = ((Blob | File));

export type GetRecoverySymbolError = (RestApiJsonError);

export type GetBlobStatusData = {
    path: {
        blob_id: unknown;
    };
};

export type GetBlobStatusResponse = (ApiSuccessBlobStatus);

export type GetBlobStatusError = unknown;

export type HealthInfoData = {
    query?: {
        /**
         * When true, includes the status of each start in the health info.
         */
        detailed?: boolean;
    };
};

export type HealthInfoResponse = (ApiSuccessServiceHealthInfo);

export type HealthInfoError = unknown;