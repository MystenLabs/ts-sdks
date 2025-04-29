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
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
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
	network: 'testnet',
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

// new SuiClient({
// 	url: getFullnodeUrl('testnet'),
// }).core
// 	.getTransaction({
// 		digest: 'HVcWBNrSY5EPM5jGkyTwzPUCXdDpgLcCHXozr6XoMMFQ',
// 	})
// 	.then((res) => {
// 		// console.log(JSON.stringify(res, null, 2));

// 		console.log('\n\n\n\n');
// 		client.core
// 			.getTransaction({
// 				digest: 'HVcWBNrSY5EPM5jGkyTwzPUCXdDpgLcCHXozr6XoMMFQ',
// 			})
// 			.then((res) => {
// 				console.dir(res, { depth: null });
// 				// console.log(JSON.stringify(res, null, 2));
// 			})
// 			.catch((error) => {
// 				console.error(error);
// 			});
// 	});

async function main() {
	const suiClient = new SuiClient({
		url: getFullnodeUrl('testnet'),
	});

	const keypair = Ed25519Keypair.fromSecretKey(
		'suiprivkey1qzmcxscyglnl9hnq82crqsuns0q33frkseks5jw0fye3tuh83l7e6ajfhxx',
	);

	const tx = new Transaction();

	const coin = tx.splitCoins(tx.gas, [1]);
	tx.transferObjects([coin], keypair.toSuiAddress());

	const txBytes = await tx.build({ client: suiClient });
	const { signature } = await keypair.signTransaction(txBytes);

	const res = await client.core.executeTransaction({
		transaction: txBytes,
		signatures: [signature],
	});

	console.dir(res, { depth: null });
}

main().catch(console.error);
