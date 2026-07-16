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
import { DynamicField_DynamicFieldKind } from './proto/sui/rpc/v2/state_service.js';
import { normalizeStructTag } from '../utils/sui-types.js';
import { fromBase64, toBase64 } from '@mysten/utils';
import { NameServiceClient } from './proto/sui/rpc/v2/name_service.client.js';
import { ForkingServiceClient } from './proto/sui/forking/v1alpha/forking_service.client.js';
import type { TransactionPlugin } from '../transactions/index.js';

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

const SUI_CLIENT_BRAND = Symbol.for('@mysten/SuiGrpcClient') as never;

export function isSuiGrpcClient(client: unknown): client is SuiGrpcClient {
	return (
		typeof client === 'object' && client !== null && (client as any)[SUI_CLIENT_BRAND] === true
	);
}

export interface DynamicFieldInclude {
	value?: boolean;
}

export type DynamicFieldEntryWithValue<Include extends DynamicFieldInclude = {}> =
	SuiClientTypes.DynamicFieldEntry & {
		value: Include extends { value: true } ? SuiClientTypes.DynamicFieldValue : undefined;
	};

export interface ListDynamicFieldsWithValueResponse<Include extends DynamicFieldInclude = {}> {
	hasNextPage: boolean;
	cursor: string | null;
	dynamicFields: DynamicFieldEntryWithValue<Include>[];
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
	| GrpcWaitForTransactionByDigest<Include>
	| GrpcWaitForTransactionByResult<Include>;

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
		this.forkingService = new ForkingServiceClient(transport);

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

	getReferenceGasPrice(): Promise<SuiClientTypes.GetReferenceGasPriceResponse> {
		return this.core.getReferenceGasPrice();
	}

	async listDynamicFields<Include extends DynamicFieldInclude = {}>(
		input: SuiClientTypes.ListDynamicFieldsOptions & { include?: Include & DynamicFieldInclude },
	): Promise<ListDynamicFieldsWithValueResponse<Include>> {
		const includeValue = input.include?.value ?? false;
		const paths = ['field_id', 'name', 'value_type', 'kind', 'child_id'];
		if (includeValue) {
			paths.push('value');
		}

		const response = await this.stateService.listDynamicFields(
			{
				parent: input.parentId,
				pageToken: input.cursor ? fromBase64(input.cursor) : undefined,
				pageSize: input.limit,
				readMask: {
					paths,
				},
			},
			{ abort: input.signal },
		);

		return {
			dynamicFields: response.response.dynamicFields.map(
				(field): DynamicFieldEntryWithValue<Include> => {
					const isDynamicObject = field.kind === DynamicField_DynamicFieldKind.OBJECT;
					const fieldType = isDynamicObject
						? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${field.name?.name!}>,0x2::object::ID>`
						: `0x2::dynamic_field::Field<${field.name?.name!},${field.valueType!}>`;
					return {
						$kind: isDynamicObject ? 'DynamicObject' : 'DynamicField',
						fieldId: field.fieldId!,
						name: {
							type: field.name?.name!,
							bcs: field.name?.value!,
						},
						valueType: field.valueType!,
						type: normalizeStructTag(fieldType),
						childId: field.childId,
						value: (includeValue
							? { type: field.valueType!, bcs: field.value?.value ?? new Uint8Array() }
							: undefined) as DynamicFieldEntryWithValue<Include>['value'],
					} as DynamicFieldEntryWithValue<Include>;
				},
			),
			cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
			hasNextPage: response.response.nextPageToken !== undefined,
		};
	}

	getDynamicField(
		input: SuiClientTypes.GetDynamicFieldOptions,
	): Promise<SuiClientTypes.GetDynamicFieldResponse> {
		return this.core.getDynamicField(input);
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
}
