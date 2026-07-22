// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Checkpoint,
	DynamicFieldInfo,
	SuiCallArg,
	SuiMoveNormalizedModule,
	SuiParsedData,
	SuiTransaction,
	SuiValidatorSummary,
} from './generated.js';

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type ResolvedNameServiceNames = {
	data: string[];
	hasNextPage: boolean;
	nextCursor: string | null;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type EpochInfo = {
	epoch: string;
	validators: SuiValidatorSummary[];
	epochTotalTransactions: string;
	firstCheckpointId: string;
	epochStartTimestamp: string;
	endOfEpochInfo: EndOfEpochInfo | null;
	referenceGasPrice: number | null;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type EpochMetrics = {
	epoch: string;
	epochTotalTransactions: string;
	firstCheckpointId: string;
	epochStartTimestamp: string;
	endOfEpochInfo: EndOfEpochInfo | null;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type EpochPage = {
	data: EpochInfo[];
	nextCursor: string | null;
	hasNextPage: boolean;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type EpochMetricsPage = {
	data: EpochMetrics[];
	nextCursor: string | null;
	hasNextPage: boolean;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type EndOfEpochInfo = {
	lastCheckpointId: string;
	epochEndTimestamp: string;
	protocolVersion: string;
	referenceGasPrice: string;
	totalStake: string;
	storageFundReinvestment: string;
	storageCharge: string;
	storageRebate: string;
	storageFundBalance: string;
	stakeSubsidyAmount: string;
	totalGasFees: string;
	totalStakeRewardsDistributed: string;
	leftoverStorageFundInflow: string;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type CheckpointPage = {
	data: Checkpoint[];
	nextCursor: string | null;
	hasNextPage: boolean;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type NetworkMetrics = {
	currentTps: number;
	tps30Days: number;
	currentCheckpoint: string;
	currentEpoch: string;
	totalAddresses: string;
	totalObjects: string;
	totalPackages: string;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type AddressMetrics = {
	checkpoint: number;
	epoch: number;
	timestampMs: number;
	cumulativeAddresses: number;
	cumulativeActiveAddresses: number;
	dailyActiveAddresses: number;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type AllEpochsAddressMetrics = AddressMetrics[];

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type MoveCallMetrics = {
	rank3Days: MoveCallMetric[];
	rank7Days: MoveCallMetric[];
	rank30Days: MoveCallMetric[];
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type MoveCallMetric = [
	{
		module: string;
		package: string;
		function: string;
	},
	string,
];

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type DynamicFieldPage = {
	data: DynamicFieldInfo[];
	nextCursor: string | null;
	hasNextPage: boolean;
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiMoveNormalizedModules = Record<string, SuiMoveNormalizedModule>;

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiMoveObject = Extract<SuiParsedData, { dataType: 'moveObject' }>;
/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiMovePackage = Extract<SuiParsedData, { dataType: 'package' }>;

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type ProgrammableTransaction = {
	transactions: SuiTransaction[];
	inputs: SuiCallArg[];
};
