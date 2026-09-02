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

// `@protobuf-ts/grpcweb-transport`'s transport, subclassed to fix its error handling. Exported
// here instead of re-exporting that package's, so a custom transport gets the fixes too.
export { GrpcWebFetchTransport } from './transport.js';

// Re-exported so users can configure a transport without adding @protobuf-ts/* as a dependency.
export type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
export type { RpcTransport } from '@protobuf-ts/runtime-rpc';

// Export all gRPC proto types as a namespace
import * as GrpcTypes from './proto/types.js';
export { GrpcTypes };
