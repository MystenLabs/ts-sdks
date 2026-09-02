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

// The transport `SuiGrpcClient` builds by default: grpc-web, with the error defects of the
// upstream transport repaired. Construct it directly to configure a transport the client does not
// take options for, such as one carrying interceptors.
export { SuiGrpcWebTransport } from './transport.js';

// Re-export transports and types so users can configure custom transports
// without adding @protobuf-ts/* as direct dependencies. `GrpcWebFetchTransport` is upstream's,
// unmodified; prefer `SuiGrpcWebTransport` above.
export { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
export type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
export type { RpcTransport } from '@protobuf-ts/runtime-rpc';

// Export all gRPC proto types as a namespace
import * as GrpcTypes from './proto/types.js';
export { GrpcTypes };
