// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type CoinBalance = {
	coinType: string;
	coinObjectCount: number;
	totalBalance: string;
	lockedBalance: Record<string, string>;
	fundsInAddressBalance?: string;
};
