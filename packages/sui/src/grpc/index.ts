// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { SuiGrpcClient, isSuiGrpcClient } from './client.js';
export { GrpcCoreClient } from './core.js';
export type { SuiGrpcClientOptions } from './client.js';
export type { GrpcCoreClientOptions } from './core.js';

// Export all gRPC proto types as a namespace
import * as GrpcTypes from './proto/types.js';
export { GrpcTypes };
