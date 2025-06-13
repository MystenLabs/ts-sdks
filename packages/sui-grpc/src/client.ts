// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { TransactionExecutionServiceClient } from './proto/sui/rpc/v2beta/transaction_execution_service.client.js';
import { LedgerServiceClient } from './proto/sui/rpc/v2beta/ledger_service.client.js';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { LiveDataServiceClient } from './proto/sui/rpc/v2alpha/live_data_service.client.js';
import { SubscriptionServiceClient } from './proto/sui/rpc/v2alpha/subscription_service.client.js';
import { GrpcCoreClient } from './core.js';
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { Experimental_BaseClient } from '@mysten/sui/experimental';

interface SuiGrpcTransportOptions extends GrpcWebOptions {
	transport?: never;
}

export type SuiGrpcClientOptions = {
	network: Experimental_SuiClientTypes.Network;
	mvr?: Experimental_SuiClientTypes.MvrOptions;
} & (
	| {
			transport: RpcTransport;
	  }
	| SuiGrpcTransportOptions
);

export class SuiGrpcClient extends Experimental_BaseClient {
	core: GrpcCoreClient;
	transactionExecutionService: TransactionExecutionServiceClient;
	ledgerService: LedgerServiceClient;
	liveDataService: LiveDataServiceClient;
	subscriptionService: SubscriptionServiceClient;

	constructor(options: SuiGrpcClientOptions) {
		super({ network: options.network });
		const transport =
			options.transport ??
			new GrpcWebFetchTransport({ baseUrl: options.baseUrl, fetchInit: options.fetchInit });
		this.transactionExecutionService = new TransactionExecutionServiceClient(transport);
		this.ledgerService = new LedgerServiceClient(transport);
		this.liveDataService = new LiveDataServiceClient(transport);
		this.subscriptionService = new SubscriptionServiceClient(transport);
		this.core = new GrpcCoreClient({
			client: this,
			base: this,
			network: options.network,
			mvr: options.mvr,
		});
	}
}
