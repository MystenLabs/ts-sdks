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

// The transport `SuiGrpcClient` builds by default, and the one to construct for a custom transport:
// `@protobuf-ts/grpcweb-transport`'s, subclassed to repair its error defects. Exported here rather
// than re-exported from that package so a caller following these types gets the fixes.
export { GrpcWebFetchTransport } from './transport.js';

// Re-export transport types so users can configure custom transports
// without adding @protobuf-ts/* as direct dependencies.
export type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
export type { RpcTransport } from '@protobuf-ts/runtime-rpc';

// Export all gRPC proto types as a namespace
import * as GrpcTypes from './proto/types.js';
export { GrpcTypes };
