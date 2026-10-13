// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { SuiGrpcClient, isSuiGrpcClient } from './client.js';
export {
	GrpcCoreClient,
	parseGrpcSimulateTransactionResponse,
	parseGrpcTransactionResponse,
} from './core.js';
export type {
	GrpcExecuteTransactionOptions,
	GrpcGetTransactionOptions,
	GrpcSignAndExecuteTransactionOptions,
	GrpcSimulateTransactionInclude,
	GrpcSimulateTransactionOptions,
	GrpcSimulateTransactionProtoJson,
	GrpcSimulateTransactionResult,
	GrpcTransactionInclude,
	GrpcTransactionProtoJson,
	GrpcTransactionResult,
	GrpcWaitForTransactionOptions,
	SuiGrpcClientOptions,
} from './client.js';
export type { GrpcCoreClientOptions } from './core.js';

// Subclasses `@protobuf-ts/grpcweb-transport`'s transport to fix its error handling and to read
// server streams on demand.
export {
	GrpcWebFetchTransport,
	grpcStatusFromAbortReason,
	hasDecodedStatusMessage,
	markGrpcStatusMessageDecoded,
	normalizeGrpcError,
} from './transport.js';
export type { GrpcWebFetchTransportOptions } from './transport.js';
export { isNonRetryable, markNonRetryable, supportsServerStreamingIterable } from './pull.js';
export type { PullServerStreamingTransport, ServerStreamingIterableCall } from './pull.js';

// Re-exported so users can configure a transport, and narrow and code the errors it produces,
// without adding @protobuf-ts/* as a dependency.
export { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
export type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
export { RpcError } from '@protobuf-ts/runtime-rpc';
export type { RpcTransport } from '@protobuf-ts/runtime-rpc';

// Export all gRPC proto types as a namespace
import * as GrpcTypes from './proto/types.js';
export { GrpcTypes };

export type {
	GrpcStreamInclude,
	GrpcStreamTransactionInclude,
	GrpcStreamStage,
	GrpcStreamQueryEnd,
	GrpcStreamProgressFrame,
	GrpcStreamCheckpointsOptions,
	GrpcStreamTransactionsOptions,
	GrpcStreamEventsOptions,
	GrpcStreamCheckpointResult,
	GrpcStreamTransactionResult,
	GrpcStreamEventResult,
} from './stream-types.js';
