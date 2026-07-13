// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiObjectChange } from './generated.js';

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiObjectChangePublished = Extract<SuiObjectChange, { type: 'published' }>;
/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiObjectChangeTransferred = Extract<SuiObjectChange, { type: 'transferred' }>;
/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiObjectChangeMutated = Extract<SuiObjectChange, { type: 'mutated' }>;
/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiObjectChangeDeleted = Extract<SuiObjectChange, { type: 'deleted' }>;
/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiObjectChangeWrapped = Extract<SuiObjectChange, { type: 'wrapped' }>;
/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type SuiObjectChangeCreated = Extract<SuiObjectChange, { type: 'created' }>;
