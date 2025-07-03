// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { TransactionExecutionServiceClient } from './proto/sui/rpc/v2beta2/transaction_execution_service.client.js';
import { LedgerServiceClient } from './proto/sui/rpc/v2beta2/ledger_service.client.js';
import { MovePackageServiceClient } from './proto/sui/rpc/v2beta2/move_package_service.client.js';
import { SignatureVerificationServiceClient } from './proto/sui/rpc/v2beta2/signature_verification_service.client.js';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { LiveDataServiceClient } from './proto/sui/rpc/v2beta2/live_data_service.client.js';
import { SubscriptionServiceClient } from './proto/sui/rpc/v2beta2/subscription_service.client.js';
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
	movePackageService: MovePackageServiceClient;
	signatureVerificationService: SignatureVerificationServiceClient;

	constructor(options: SuiGrpcClientOptions) {
		super({ network: options.network });
		const transport =
			options.transport ??
			new GrpcWebFetchTransport({ baseUrl: options.baseUrl, fetchInit: options.fetchInit });
		this.transactionExecutionService = new TransactionExecutionServiceClient(transport);
		this.ledgerService = new LedgerServiceClient(transport);
		this.liveDataService = new LiveDataServiceClient(transport);
		this.subscriptionService = new SubscriptionServiceClient(transport);
		this.movePackageService = new MovePackageServiceClient(transport);
		this.signatureVerificationService = new SignatureVerificationServiceClient(transport);

		this.core = new GrpcCoreClient({
			client: this,
			base: this,
			network: options.network,
			mvr: options.mvr,
		});
	}
}
