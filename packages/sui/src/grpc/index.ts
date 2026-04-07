// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { SuiGrpcClient, isSuiGrpcClient } from './client.js';
export { GrpcCoreClient } from './core.js';
export type { SuiGrpcClientOptions } from './client.js';
export type { GrpcCoreClientOptions } from './core.js';

// Re-export transports and types so users can configure custom transports
// without adding @protobuf-ts/* as direct dependencies.
export { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
export type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
export type { RpcTransport } from '@protobuf-ts/runtime-rpc';

// Export all gRPC proto types as a namespace
import * as GrpcTypes from './proto/types.js';
export { GrpcTypes };
