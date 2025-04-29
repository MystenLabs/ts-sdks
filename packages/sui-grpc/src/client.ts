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
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

interface SuiGrpcTransportOptions extends GrpcWebOptions {
	transport?: never;
}

export type SuiGrpcClientOptions = {
	network: Experimental_SuiClientTypes.Network;
} & (
	| {
			transport: RpcTransport;
	  }
	| SuiGrpcTransportOptions
);

export class SuiGrpcClient extends Experimental_BaseClient {
	core: GrpcCoreClient;
	transactionExecutionService: TransactionExecutionServiceClient;
	ledgerServiceClient: LedgerServiceClient;
	liveDataService: LiveDataServiceClient;
	subscriptionService: SubscriptionServiceClient;

	constructor(options: SuiGrpcClientOptions) {
		super({ network: options.network });
		const transport =
			options.transport ??
			new GrpcWebFetchTransport({ baseUrl: options.baseUrl, fetchInit: options.fetchInit });
		this.transactionExecutionService = new TransactionExecutionServiceClient(transport);
		this.ledgerServiceClient = new LedgerServiceClient(transport);
		this.liveDataService = new LiveDataServiceClient(transport);
		this.subscriptionService = new SubscriptionServiceClient(transport);
		this.core = new GrpcCoreClient({ client: this });
	}
}

const client = new SuiGrpcClient({
	network: 'mainnet',
	transport: new GrpcWebFetchTransport({ baseUrl: getFullnodeUrl('mainnet') }),
});

// client.core
// 	.getObjects({
// 		objectIds: [
// 			'0x189daa4ece0feb62093f57ba712669fe7ada26da3ab441b89b65c9555a6cd3a6',
// 			'0x1bd9891e42ce88d15bc9a17633767e7e65cb82f28a909fcc3bd4ead2aca49e22',
// 		],
// 	})
// 	.then((res) => {
// 		console.dir(res, { depth: null });
// 	});

new SuiClient({
	url: getFullnodeUrl('mainnet'),
})
	.getTransactionBlock({
		digest: 'HVcWBNrSY5EPM5jGkyTwzPUCXdDpgLcCHXozr6XoMMFQ',
		options: {
			showRawEffects: true,
		},
	})
	.then((res) => {
		// console.log(toHex(new Uint8Array(res.rawEffects!)));
		// const effects = bcs.TransactionEffects.parse(new Uint8Array(res.rawEffects!));
		// console.dir(effects, { depth: null });
	});

client.core
	.getTransaction({
		digest: 'HVcWBNrSY5EPM5jGkyTwzPUCXdDpgLcCHXozr6XoMMFQ',
	})
	.then((res) => {
		console.dir(res, { depth: null });
	})
	.catch((error) => {
		console.error(error);
	});
