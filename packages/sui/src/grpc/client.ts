// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { TransactionExecutionServiceClient } from './proto/sui/rpc/v2/transaction_execution_service.client.js';
import { LedgerServiceClient } from './proto/sui/rpc/v2/ledger_service.client.js';
import { MovePackageServiceClient } from './proto/sui/rpc/v2/move_package_service.client.js';
import { SignatureVerificationServiceClient } from './proto/sui/rpc/v2/signature_verification_service.client.js';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { StateServiceClient } from './proto/sui/rpc/v2/state_service.client.js';
import { SubscriptionServiceClient } from './proto/sui/rpc/v2/subscription_service.client.js';
import { GrpcCoreClient } from './core.js';
import type { SuiClientTypes } from '../client/index.js';
import { BaseClient } from '../client/index.js';
import { NameServiceClient } from './proto/sui/rpc/v2/name_service.client.js';
import type { Transaction } from '../transactions/index.js';
import type { Signer } from '../cryptography/keypair.js';

interface SuiGrpcTransportOptions extends GrpcWebOptions {
	transport?: never;
}

export type SuiGrpcClientOptions = {
	network: SuiClientTypes.Network;
	mvr?: SuiClientTypes.MvrOptions;
} & (
	| {
			transport: RpcTransport;
	  }
	| SuiGrpcTransportOptions
);

export class SuiGrpcClient extends BaseClient {
	core: GrpcCoreClient;
	transactionExecutionService: TransactionExecutionServiceClient;
	ledgerService: LedgerServiceClient;
	stateService: StateServiceClient;
	subscriptionService: SubscriptionServiceClient;
	movePackageService: MovePackageServiceClient;
	signatureVerificationService: SignatureVerificationServiceClient;
	nameService: NameServiceClient;

	constructor(options: SuiGrpcClientOptions) {
		super({ network: options.network });
		const transport =
			options.transport ??
			new GrpcWebFetchTransport({ baseUrl: options.baseUrl, fetchInit: options.fetchInit });
		this.transactionExecutionService = new TransactionExecutionServiceClient(transport);
		this.ledgerService = new LedgerServiceClient(transport);
		this.stateService = new StateServiceClient(transport);
		this.subscriptionService = new SubscriptionServiceClient(transport);
		this.movePackageService = new MovePackageServiceClient(transport);
		this.signatureVerificationService = new SignatureVerificationServiceClient(transport);
		this.nameService = new NameServiceClient(transport);

		this.core = new GrpcCoreClient({
			client: this,
			base: this,
			network: options.network,
			mvr: options.mvr,
		});
	}

	async signAndExecuteTransaction<Include extends SuiClientTypes.TransactionInclude = {}>({
		transaction,
		signer,
		additionalSignatures = [],
		...input
	}: {
		transaction: Uint8Array | Transaction;
		signer: Signer;
		additionalSignatures?: string[];
	} & Omit<
		SuiClientTypes.ExecuteTransactionOptions<Include>,
		'transaction' | 'signatures'
	>): Promise<SuiClientTypes.TransactionResult<Include>> {
		let transactionBytes;

		if (transaction instanceof Uint8Array) {
			transactionBytes = transaction;
		} else {
			transaction.setSenderIfNotSet(signer.toSuiAddress());
			transactionBytes = await transaction.build({ client: this as any });
		}

		const { signature } = await signer.signTransaction(transactionBytes);

		return this.core.executeTransaction({
			transaction: transactionBytes,
			signatures: [signature, ...additionalSignatures],
			...input,
		});
	}

	async waitForTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.WaitForTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		return this.core.waitForTransaction(input);
	}

	async executeTransaction<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.ExecuteTransactionOptions<Include>,
	): Promise<SuiClientTypes.TransactionResult<Include>> {
		return this.core.executeTransaction(input);
	}
}
