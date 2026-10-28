// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TransactionExecutionServiceClient } from './proto/sui/rpc/v2/transaction_execution_service.client.js';
import { LedgerServiceClient } from './proto/sui/rpc/v2/ledger_service.client.js';
import { MovePackageServiceClient } from './proto/sui/rpc/v2/move_package_service.client.js';
import { SignatureVerificationServiceClient } from './proto/sui/rpc/v2/signature_verification_service.client.js';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { StateServiceClient } from './proto/sui/rpc/v2/state_service.client.js';
import { SubscriptionServiceClient } from './proto/sui/rpc/v2/subscription_service.client.js';
import { GrpcCoreClient, registerClientTransport } from './core.js';
import type { SuiClientTypes } from '../client/index.js';
import { BaseClient } from '../client/index.js';
import { NameServiceClient } from './proto/sui/rpc/v2/name_service.client.js';
import { ForkingServiceClient } from './proto/sui/forking/v1alpha/forking_service.client.js';
import type { TransactionPlugin } from '../transactions/index.js';
import { GrpcWebFetchTransport, withClientProtocolVersion } from './transport.js';
import type { GrpcWebFetchTransportOptions } from './transport.js';
import type {
	GrpcStreamCheckpointsOptions,
	GrpcStreamEventsOptions,
	GrpcStreamTransactionsOptions,
} from './stream-types.js';

interface SuiGrpcTransportOptions extends GrpcWebFetchTransportOptions {
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

const SUI_CLIENT_BRAND = Symbol.for('@mysten/SuiGrpcClient') as never;

export function isSuiGrpcClient(client: unknown): client is SuiGrpcClient {
	return (
		typeof client === 'object' && client !== null && (client as any)[SUI_CLIENT_BRAND] === true
	);
}

export interface GrpcTransactionInclude extends SuiClientTypes.TransactionInclude {
	/** Include the parsed protobuf JSON value for the gRPC transaction response. */
	protoJson?: boolean;
}

export interface GrpcSimulateTransactionInclude extends SuiClientTypes.SimulateTransactionInclude {
	/** Include the parsed protobuf JSON value for the gRPC simulation response. */
	protoJson?: boolean;
}

export type GrpcTransactionProtoJson = ReturnType<
	typeof import('./proto/sui/rpc/v2/executed_transaction.js').ExecutedTransaction.toJson
>;

export type GrpcSimulateTransactionProtoJson = ReturnType<
	typeof import('./proto/sui/rpc/v2/transaction_execution_service.js').SimulateTransactionResponse.toJson
>;

type ProtoJson<Include extends { protoJson?: boolean }, Json> = Include['protoJson'] extends true
	? Json
	: undefined;

export type GrpcTransactionResult<Include extends GrpcTransactionInclude = {}> =
	SuiClientTypes.TransactionResult<Include> & {
		protoJson: ProtoJson<Include, GrpcTransactionProtoJson>;
	};

export type GrpcSimulateTransactionResult<Include extends GrpcSimulateTransactionInclude = {}> =
	SuiClientTypes.SimulateTransactionResult<Include> & {
		protoJson: ProtoJson<Include, GrpcSimulateTransactionProtoJson>;
	};

export interface GrpcGetTransactionOptions<
	Include extends GrpcTransactionInclude = {},
> extends SuiClientTypes.GetTransactionOptions<Include> {
	include?: Include & GrpcTransactionInclude;
}

export interface GrpcWaitForTransactionByDigest<
	Include extends GrpcTransactionInclude = {},
> extends SuiClientTypes.WaitForTransactionByDigest<Include> {
	include?: Include & GrpcTransactionInclude;
}

export interface GrpcWaitForTransactionByResult<
	Include extends GrpcTransactionInclude = {},
> extends SuiClientTypes.WaitForTransactionByResult<Include> {
	include?: Include & GrpcTransactionInclude;
}

export type GrpcWaitForTransactionOptions<Include extends GrpcTransactionInclude = {}> =
	GrpcWaitForTransactionByDigest<Include> | GrpcWaitForTransactionByResult<Include>;

export interface GrpcExecuteTransactionOptions<
	Include extends GrpcTransactionInclude = {},
> extends SuiClientTypes.ExecuteTransactionOptions<Include> {
	include?: Include & GrpcTransactionInclude;
}

export interface GrpcSignAndExecuteTransactionOptions<
	Include extends GrpcTransactionInclude = {},
> extends SuiClientTypes.SignAndExecuteTransactionOptions<Include> {
	include?: Include & GrpcTransactionInclude;
}

export interface GrpcSimulateTransactionOptions<
	Include extends GrpcSimulateTransactionInclude = {},
> extends SuiClientTypes.SimulateTransactionOptions<Include> {
	include?: Include & GrpcSimulateTransactionInclude;
}

export class SuiGrpcClient extends BaseClient implements SuiClientTypes.TransportMethods {
	core: GrpcCoreClient;
	get mvr(): SuiClientTypes.MvrMethods {
		return this.core.mvr;
	}
	transactionExecutionService: TransactionExecutionServiceClient;
	ledgerService: LedgerServiceClient;
	stateService: StateServiceClient;
	subscriptionService: SubscriptionServiceClient;
	movePackageService: MovePackageServiceClient;
	signatureVerificationService: SignatureVerificationServiceClient;
	nameService: NameServiceClient;
	forkingService: ForkingServiceClient;

	get [SUI_CLIENT_BRAND]() {
		return true;
	}

	constructor(options: SuiGrpcClientOptions) {
		super({ network: options.network });
		const {
			network: _network,
			mvr: _mvr,
			// Not forwarded: every Core API call passes its own `signal`, which would overwrite it.
			abort: _abort,
			transport: providedTransport,
			...transportOptions
		} = options as SuiGrpcClientOptions & SuiGrpcTransportOptions & { transport?: RpcTransport };

		// Add the protocol-version default for every transport, including native gRPC.
		const transport = withClientProtocolVersion(
			providedTransport ?? new GrpcWebFetchTransport(transportOptions),
		);
		this.transactionExecutionService = new TransactionExecutionServiceClient(transport);
		this.ledgerService = new LedgerServiceClient(transport);
		this.stateService = new StateServiceClient(transport);
		this.subscriptionService = new SubscriptionServiceClient(transport);
		this.movePackageService = new MovePackageServiceClient(transport);
		this.signatureVerificationService = new SignatureVerificationServiceClient(transport);
		this.nameService = new NameServiceClient(transport);
		this.forkingService = new ForkingServiceClient(transport);
		registerClientTransport(this, transport);

		this.core = new GrpcCoreClient({
			client: this,
			base: this,
			network: options.network,
			mvr: options.mvr,
		});
	}

	getObjects<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.GetObjectsOptions<Include>,
	): Promise<SuiClientTypes.GetObjectsResponse<Include>> {
		return this.core.getObjects(input);
	}

	getObject<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.GetObjectOptions<Include>,
	): Promise<SuiClientTypes.GetObjectResponse<Include>> {
		return this.core.getObject(input);
	}

	listCoins(input: SuiClientTypes.ListCoinsOptions): Promise<SuiClientTypes.ListCoinsResponse> {
		return this.core.listCoins(input);
	}

	listOwnedObjects<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.ListOwnedObjectsOptions<Include>,
	): Promise<SuiClientTypes.ListOwnedObjectsResponse<Include>> {
		return this.core.listOwnedObjects(input);
	}

	getBalance(input: SuiClientTypes.GetBalanceOptions): Promise<SuiClientTypes.GetBalanceResponse> {
		return this.core.getBalance(input);
	}

	listBalances(
		input: SuiClientTypes.ListBalancesOptions,
	): Promise<SuiClientTypes.ListBalancesResponse> {
		return this.core.listBalances(input);
	}

	getCoinMetadata(
		input: SuiClientTypes.GetCoinMetadataOptions,
	): Promise<SuiClientTypes.GetCoinMetadataResponse> {
		return this.core.getCoinMetadata(input);
	}

	getTransaction<Include extends GrpcTransactionInclude = {}>(
		input: GrpcGetTransactionOptions<Include>,
	): Promise<GrpcTransactionResult<Include>> {
		return this.core.getTransaction(input) as Promise<GrpcTransactionResult<Include>>;
	}

	executeTransaction<Include extends GrpcTransactionInclude = {}>(
		input: GrpcExecuteTransactionOptions<Include>,
	): Promise<GrpcTransactionResult<Include>> {
		return this.core.executeTransaction(input) as Promise<GrpcTransactionResult<Include>>;
	}

	signAndExecuteTransaction<Include extends GrpcTransactionInclude = {}>(
		input: GrpcSignAndExecuteTransactionOptions<Include>,
	): Promise<GrpcTransactionResult<Include>> {
		return this.core.signAndExecuteTransaction(input) as Promise<GrpcTransactionResult<Include>>;
	}

	waitForTransaction<Include extends GrpcTransactionInclude = {}>(
		input: GrpcWaitForTransactionOptions<Include>,
	): Promise<GrpcTransactionResult<Include>> {
		return this.core.waitForTransaction(input) as Promise<GrpcTransactionResult<Include>>;
	}

	simulateTransaction<Include extends GrpcSimulateTransactionInclude = {}>(
		input: GrpcSimulateTransactionOptions<Include>,
	): Promise<GrpcSimulateTransactionResult<Include>> {
		return this.core.simulateTransaction(input) as Promise<GrpcSimulateTransactionResult<Include>>;
	}

	getReferenceGasPrice(
		input?: SuiClientTypes.GetReferenceGasPriceOptions,
	): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		return this.core.getReferenceGasPrice(input);
	}

	getCurrentSystemState(
		input?: SuiClientTypes.GetCurrentSystemStateOptions,
	): Promise<SuiClientTypes.GetCurrentSystemStateResponse> {
		return this.core.getCurrentSystemState(input);
	}

	getProtocolConfig(
		input?: SuiClientTypes.GetProtocolConfigOptions,
	): Promise<SuiClientTypes.GetProtocolConfigResponse> {
		return this.core.getProtocolConfig(input);
	}

	getChainIdentifier(
		input?: SuiClientTypes.GetChainIdentifierOptions,
	): Promise<SuiClientTypes.GetChainIdentifierResponse> {
		return this.core.getChainIdentifier(input);
	}

	listDynamicFields<Include extends SuiClientTypes.DynamicFieldInclude = {}>(
		input: SuiClientTypes.ListDynamicFieldsOptions<Include>,
	): Promise<SuiClientTypes.ListDynamicFieldsResponse<Include>> {
		return this.core.listDynamicFields(input);
	}

	getDynamicField(
		input: SuiClientTypes.GetDynamicFieldOptions,
	): Promise<SuiClientTypes.GetDynamicFieldResponse> {
		return this.core.getDynamicField(input);
	}

	getDynamicObjectField<Include extends SuiClientTypes.ObjectInclude = {}>(
		input: SuiClientTypes.GetDynamicObjectFieldOptions<Include>,
	): Promise<SuiClientTypes.GetDynamicObjectFieldResponse<Include>> {
		return this.core.getDynamicObjectField(input);
	}

	listTransactions<Include extends SuiClientTypes.TransactionInclude = {}>(
		input: SuiClientTypes.ListTransactionsOptions<Include>,
	): Promise<SuiClientTypes.ListTransactionsResponse<Include>> {
		return this.core.listTransactions(input);
	}

	listEvents(input: SuiClientTypes.ListEventsOptions): Promise<SuiClientTypes.ListEventsResponse> {
		return this.core.listEvents(input);
	}

	listCheckpoints(
		input: SuiClientTypes.ListCheckpointsOptions,
	): Promise<SuiClientTypes.ListCheckpointsResponse> {
		return this.core.listCheckpoints(input);
	}

	getMoveFunction(
		input: SuiClientTypes.GetMoveFunctionOptions,
	): Promise<SuiClientTypes.GetMoveFunctionResponse> {
		return this.core.getMoveFunction(input);
	}

	resolveTransactionPlugin(): TransactionPlugin {
		return this.core.resolveTransactionPlugin();
	}

	verifyZkLoginSignature(
		input: SuiClientTypes.VerifyZkLoginSignatureOptions,
	): Promise<SuiClientTypes.ZkLoginVerifyResponse> {
		return this.core.verifyZkLoginSignature(input);
	}

	defaultNameServiceName(
		input: SuiClientTypes.DefaultNameServiceNameOptions,
	): Promise<SuiClientTypes.DefaultNameServiceNameResponse> {
		return this.core.defaultNameServiceName(input);
	}

	resolveNameServiceAddress(
		input: SuiClientTypes.ResolveNameServiceAddressOptions,
	): Promise<SuiClientTypes.ResolveNameServiceAddressResponse> {
		return this.core.resolveNameServiceAddress(input);
	}

	/** See `CoreClient.streamCheckpoints`. `grpcFilter` keeps checkpoints with a matching transaction. */
	streamCheckpoints<
		Include extends SuiClientTypes.StreamCheckpointInclude = {},
		Frames extends SuiClientTypes.StreamFrameOptions = {},
	>(
		options?: GrpcStreamCheckpointsOptions<Include, Frames>,
	): AsyncGenerator<SuiClientTypes.StreamCheckpointResult<Include, Frames>> {
		return this.core.streamCheckpoints(options);
	}

	/** See `CoreClient.streamTransactions`. `grpcFilter` replaces `filter` with a native filter. */
	streamTransactions<
		Include extends SuiClientTypes.TransactionInclude = {},
		Frames extends SuiClientTypes.StreamFrameOptions = {},
	>(
		options?: GrpcStreamTransactionsOptions<Include, Frames>,
	): AsyncGenerator<SuiClientTypes.StreamTransactionResult<Include, Frames>> {
		return this.core.streamTransactions(options);
	}

	/** See `CoreClient.streamEvents`. `grpcFilter` replaces `filter` with a native filter. */
	streamEvents<Frames extends SuiClientTypes.StreamFrameOptions = {}>(
		options?: GrpcStreamEventsOptions<Frames>,
	): AsyncGenerator<SuiClientTypes.StreamEventResult<Frames>> {
		return this.core.streamEvents(options);
	}
}
