// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable */

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { OpenMoveTypeSignature } from '../types.js';
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** The execution status of this transaction: success or failure. */
export enum ExecutionStatus {
  /** The transaction could not be executed. */
  Failure = 'FAILURE',
  /** The transaction was successfully executed. */
  Success = 'SUCCESS'
}

/** Abilities are keywords in Sui Move that define how types behave at the compiler level. */
export enum MoveAbility {
  /** Enables values to be copied. */
  Copy = 'COPY',
  /** Enables values to be popped/dropped. */
  Drop = 'DROP',
  /** Enables values to be held directly in global storage. */
  Key = 'KEY',
  /** Enables values to be held inside a struct in global storage. */
  Store = 'STORE'
}

/**
 * The visibility modifier describes which modules can access this module member.
 *
 * By default, a module member can be called only within the same module.
 */
export enum MoveVisibility {
  /** A friend member can be accessed in the module it is defined in and any other module in its package that is explicitly specified in its friend list. */
  Friend = 'FRIEND',
  /** A private member can be accessed in the module it is defined in. */
  Private = 'PRIVATE',
  /** A public member can be accessed by any module. */
  Public = 'PUBLIC'
}

/**
 * A filter over the live object set, the filter can be one of:
 *
 * - A filter on type (all live objects whose type matches that filter).
 * - Fetching all objects owned by an address or object, optionally filtered by type.
 * - Fetching all shared or immutable objects, filtered by type.
 */
export type ObjectFilter = {
  /**
   * Specifies the address of the owning address or object.
   *
   * This field is required if `ownerKind` is "ADDRESS" or "OBJECT". If provided without `ownerKind`, `ownerKind` defaults to "ADDRESS".
   */
  owner?: string | null | undefined;
  /**
   * Filter on whether the object is address-owned, object-owned, shared, or immutable.
   *
   * - If this field is set to "ADDRESS" or "OBJECT", then an owner filter must also be provided.
   * - If this field is set to "SHARED" or "IMMUTABLE", then a type filter must also be provided.
   */
  ownerKind?: OwnerKind | null | undefined;
  /**
   * Filter on the object's type.
   *
   * The filter can be one of:
   *
   * - A package address: `0x2`,
   * - A module: `0x2::coin`,
   * - A fully-qualified name: `0x2::coin::Coin`,
   * - A type instantiation: `0x2::coin::Coin<0x2::sui::SUI>`.
   */
  type?: string | null | undefined;
};

/**
 * Identifies a specific version of an object.
 *
 * The `address` field must be specified, as well as at most one of `version`, `rootVersion`, or `atCheckpoint`. If none are provided, the object is fetched at the current checkpoint.
 *
 * Specifying a `version` or a `rootVersion` disables nested queries for paginating owned objects or dynamic fields (these queries are only supported at checkpoint boundaries).
 *
 * See `Query.object` for more details.
 */
export type ObjectKey = {
  /** The object's ID. */
  address: string;
  /** If specified, tries to fetch the latest version as of this checkpoint. Fails if the checkpoint is later than the RPC's latest checkpoint. */
  atCheckpoint?: number | null | undefined;
  /**
   * If specified, tries to fetch the latest version of the object at or before this version. Nested dynamic field accesses will also be subject to this bound.
   *
   * This can be used to fetch a child or ancestor object bounded by its root object's version. For any wrapped or child (object-owned) object, its root object can be defined recursively as:
   *
   * - The root object of the object it is wrapped in, if it is wrapped.
   * - The root object of its owner, if it is owned by another object.
   * - The object itself, if it is not object-owned or wrapped.
   */
  rootVersion?: number | null | undefined;
  /** If specified, tries to fetch the object at this exact version. */
  version?: number | null | undefined;
};

/** Filter on who owns an object. */
export enum OwnerKind {
  /** Object is owned by an address. */
  Address = 'ADDRESS',
  /** Object is frozen. */
  Immutable = 'IMMUTABLE',
  /** Object is a child of another object (e.g. a dynamic field or dynamic object field). */
  Object = 'OBJECT',
  /** Object is shared among multiple owners. */
  Shared = 'SHARED'
}

/** An enum that specifies the intent scope to be used to parse the bytes for signature verification. */
export enum ZkLoginIntentScope {
  /** Indicates that the bytes are to be parsed as a personal message. */
  PersonalMessage = 'PERSONAL_MESSAGE',
  /** Indicates that the bytes are to be parsed as transaction data bytes. */
  TransactionData = 'TRANSACTION_DATA'
}

export type GetAllBalancesQueryVariables = Exact<{
  owner: string;
  limit?: number | null | undefined;
  cursor?: string | null | undefined;
}>;


export type GetAllBalancesQuery = { address: { balances: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ totalBalance: string | null, addressBalance: string | null, coinType: { repr: string } | null }> } | null } | null };

export type GetBalanceQueryVariables = Exact<{
  owner: string;
  coinType?: string | null | undefined;
}>;


export type GetBalanceQuery = { address: { balance: { totalBalance: string | null, addressBalance: string | null, coinType: { repr: string } | null } | null } | null };

export type GetChainIdentifierQueryVariables = Exact<{ [key: string]: never; }>;


export type GetChainIdentifierQuery = { checkpoint: { digest: string | null } | null };

export type GetCoinMetadataQueryVariables = Exact<{
  coinType: string;
}>;


export type GetCoinMetadataQuery = { coinMetadata: { address: string, decimals: number | null, name: string | null, symbol: string | null, description: string | null, iconUrl: string | null } | null };

export type GetCoinsQueryVariables = Exact<{
  owner: string;
  first?: number | null | undefined;
  cursor?: string | null | undefined;
  type?: string | null | undefined;
}>;


export type GetCoinsQuery = { address: { address: string, objects: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ address: string, version: number | null, digest: string | null, owner:
          | { __typename: 'AddressOwner', address: { address: string } | null }
          | { __typename: 'ConsensusAddressOwner', startVersion: number | null, address: { address: string } | null }
          | { __typename: 'Immutable' }
          | { __typename: 'ObjectOwner', address: { address: string } | null }
          | { __typename: 'Shared', initialSharedVersion: number | null }
         | null, contents: { json: unknown, type: { repr: string } | null } | null }> } | null } | null };

export type GetCurrentSystemStateQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentSystemStateQuery = { epoch: { epochId: number, referenceGasPrice: string | null, startTimestamp: string | null, protocolConfigs: { protocolVersion: number } | null, systemState: { json: unknown } | null } | null };

export type GetDynamicFieldsQueryVariables = Exact<{
  parentId: string;
  first?: number | null | undefined;
  cursor?: string | null | undefined;
  includeValue?: boolean | null | undefined;
}>;


export type GetDynamicFieldsQuery = { address: { dynamicFields: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ name: { bcs: string | null, type: { repr: string } | null } | null, value:
          | { __typename: 'MoveObject', address: string, contents: { bcs?: string | null, type: { repr: string } | null } | null }
          | { __typename: 'MoveValue', bcs?: string | null, type: { repr: string } | null }
         | null }> } | null } | null };

export type GetMoveFunctionQueryVariables = Exact<{
  package: string;
  module: string;
  function: string;
}>;


export type GetMoveFunctionQuery = { package: { module: { function: { name: string, visibility: MoveVisibility | null, isEntry: boolean | null, typeParameters: Array<{ constraints: Array<MoveAbility> }> | null, parameters: Array<{ signature: OpenMoveTypeSignature }> | null, return: Array<{ signature: OpenMoveTypeSignature }> | null } | null } | null } | null };

export type GetProtocolConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProtocolConfigQuery = { epoch: { protocolConfigs: { protocolVersion: number, featureFlags: Array<{ key: string, value: boolean }>, configs: Array<{ key: string, value: string | null }> } | null } | null };

export type GetReferenceGasPriceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetReferenceGasPriceQuery = { epoch: { referenceGasPrice: string | null } | null };

export type DefaultSuinsNameQueryVariables = Exact<{
  address: string;
}>;


export type DefaultSuinsNameQuery = { address: { defaultNameRecord: { domain: string } | null } | null };

export type GetOwnedObjectsQueryVariables = Exact<{
  owner: string;
  limit?: number | null | undefined;
  cursor?: string | null | undefined;
  filter?: ObjectFilter | null | undefined;
  includeContent?: boolean | null | undefined;
  includePreviousTransaction?: boolean | null | undefined;
  includeObjectBcs?: boolean | null | undefined;
  includeJson?: boolean | null | undefined;
  includeDisplay?: boolean | null | undefined;
}>;


export type GetOwnedObjectsQuery = { address: { objects: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ address: string, digest: string | null, version: number | null, objectBcs?: string | null, contents: { bcs?: string | null, json?: unknown, display?: { output: unknown, errors: unknown } | null, type: { repr: string } | null } | null, owner:
          | { __typename: 'AddressOwner', address: { address: string } | null }
          | { __typename: 'ConsensusAddressOwner', startVersion: number | null, address: { address: string } | null }
          | { __typename: 'Immutable' }
          | { __typename: 'ObjectOwner', address: { address: string } | null }
          | { __typename: 'Shared', initialSharedVersion: number | null }
         | null, previousTransaction?: { digest: string } | null }> } | null } | null };

export type MultiGetObjectsQueryVariables = Exact<{
  objectKeys: Array<ObjectKey> | ObjectKey;
  includeContent?: boolean | null | undefined;
  includePreviousTransaction?: boolean | null | undefined;
  includeObjectBcs?: boolean | null | undefined;
  includeJson?: boolean | null | undefined;
  includeDisplay?: boolean | null | undefined;
}>;


export type MultiGetObjectsQuery = { multiGetObjects: Array<{ address: string, digest: string | null, version: number | null, objectBcs?: string | null, asMoveObject: { contents: { bcs?: string | null, json?: unknown, display?: { output: unknown, errors: unknown } | null, type: { repr: string } | null } | null } | null, asMovePackage: { __typename: 'MovePackage' } | null, owner:
      | { __typename: 'AddressOwner', address: { address: string } | null }
      | { __typename: 'ConsensusAddressOwner', startVersion: number | null, address: { address: string } | null }
      | { __typename: 'Immutable' }
      | { __typename: 'ObjectOwner', address: { address: string } | null }
      | { __typename: 'Shared', initialSharedVersion: number | null }
     | null, previousTransaction?: { digest: string } | null } | null> };

export type Object_FieldsFragment = { address: string, digest: string | null, version: number | null, objectBcs?: string | null, asMoveObject: { contents: { bcs?: string | null, json?: unknown, display?: { output: unknown, errors: unknown } | null, type: { repr: string } | null } | null } | null, asMovePackage: { __typename: 'MovePackage' } | null, owner:
    | { __typename: 'AddressOwner', address: { address: string } | null }
    | { __typename: 'ConsensusAddressOwner', startVersion: number | null, address: { address: string } | null }
    | { __typename: 'Immutable' }
    | { __typename: 'ObjectOwner', address: { address: string } | null }
    | { __typename: 'Shared', initialSharedVersion: number | null }
   | null, previousTransaction?: { digest: string } | null };

export type Move_Object_FieldsFragment = { address: string, digest: string | null, version: number | null, objectBcs?: string | null, contents: { bcs?: string | null, json?: unknown, display?: { output: unknown, errors: unknown } | null, type: { repr: string } | null } | null, owner:
    | { __typename: 'AddressOwner', address: { address: string } | null }
    | { __typename: 'ConsensusAddressOwner', startVersion: number | null, address: { address: string } | null }
    | { __typename: 'Immutable' }
    | { __typename: 'ObjectOwner', address: { address: string } | null }
    | { __typename: 'Shared', initialSharedVersion: number | null }
   | null, previousTransaction?: { digest: string } | null };

type Object_Owner_Fields_AddressOwner_Fragment = { __typename: 'AddressOwner', address: { address: string } | null };

type Object_Owner_Fields_ConsensusAddressOwner_Fragment = { __typename: 'ConsensusAddressOwner', startVersion: number | null, address: { address: string } | null };

type Object_Owner_Fields_Immutable_Fragment = { __typename: 'Immutable' };

type Object_Owner_Fields_ObjectOwner_Fragment = { __typename: 'ObjectOwner', address: { address: string } | null };

type Object_Owner_Fields_Shared_Fragment = { __typename: 'Shared', initialSharedVersion: number | null };

export type Object_Owner_FieldsFragment =
  | Object_Owner_Fields_AddressOwner_Fragment
  | Object_Owner_Fields_ConsensusAddressOwner_Fragment
  | Object_Owner_Fields_Immutable_Fragment
  | Object_Owner_Fields_ObjectOwner_Fragment
  | Object_Owner_Fields_Shared_Fragment
;

export type SimulateTransactionQueryVariables = Exact<{
  transaction: unknown;
  includeTransaction?: boolean | null | undefined;
  includeEffects?: boolean | null | undefined;
  includeEvents?: boolean | null | undefined;
  includeBalanceChanges?: boolean | null | undefined;
  includeObjectTypes?: boolean | null | undefined;
  includeCommandResults?: boolean | null | undefined;
  includeBcs?: boolean | null | undefined;
  doGasSelection?: boolean | null | undefined;
  checksEnabled?: boolean | null | undefined;
}>;


export type SimulateTransactionQuery = { simulateTransaction: { effects: { transaction: { digest: string, transactionJson?: unknown, transactionBcs?: string | null, signatures: Array<{ signatureBytes: string | null }>, effects: { status: ExecutionStatus | null, effectsBcs?: string | null, effectsJson?: unknown, balanceChangesJson?: unknown, executionError: { message: string, abortCode: string | null, identifier: string | null, constant: string | null, sourceLineNumber: number | null, instructionOffset: number | null, module: { name: string, package: { address: string } | null } | null, function: { name: string } | null } | null, epoch: { epochId: number } | null, objectChanges?: { nodes: Array<{ address: string, outputState: { asMoveObject: { contents: { type: { repr: string } | null } | null } | null } | null }> } | null, events?: { pageInfo: { hasNextPage: boolean }, nodes: Array<{ transactionModule: { name: string, package: { address: string } | null } | null, sender: { address: string } | null, contents: { bcs: string | null, json: unknown, type: { repr: string } | null } | null }> } | null } | null } | null } | null, outputs?: Array<{ returnValues: Array<{ value: { bcs: string | null } | null }> | null, mutatedReferences: Array<{ value: { bcs: string | null } | null }> | null }> | null } };

export type ExecuteTransactionMutationVariables = Exact<{
  transactionDataBcs: string;
  signatures: Array<string> | string;
  includeTransaction?: boolean | null | undefined;
  includeEffects?: boolean | null | undefined;
  includeEvents?: boolean | null | undefined;
  includeBalanceChanges?: boolean | null | undefined;
  includeObjectTypes?: boolean | null | undefined;
  includeBcs?: boolean | null | undefined;
}>;


export type ExecuteTransactionMutation = { executeTransaction: { effects: { transaction: { digest: string, transactionJson?: unknown, transactionBcs?: string | null, signatures: Array<{ signatureBytes: string | null }>, effects: { status: ExecutionStatus | null, effectsBcs?: string | null, effectsJson?: unknown, balanceChangesJson?: unknown, executionError: { message: string, abortCode: string | null, identifier: string | null, constant: string | null, sourceLineNumber: number | null, instructionOffset: number | null, module: { name: string, package: { address: string } | null } | null, function: { name: string } | null } | null, epoch: { epochId: number } | null, objectChanges?: { nodes: Array<{ address: string, outputState: { asMoveObject: { contents: { type: { repr: string } | null } | null } | null } | null }> } | null, events?: { pageInfo: { hasNextPage: boolean }, nodes: Array<{ transactionModule: { name: string, package: { address: string } | null } | null, sender: { address: string } | null, contents: { bcs: string | null, json: unknown, type: { repr: string } | null } | null }> } | null } | null } | null } | null } };

export type GetTransactionBlockQueryVariables = Exact<{
  digest: string;
  includeTransaction?: boolean | null | undefined;
  includeEffects?: boolean | null | undefined;
  includeEvents?: boolean | null | undefined;
  includeBalanceChanges?: boolean | null | undefined;
  includeObjectTypes?: boolean | null | undefined;
  includeBcs?: boolean | null | undefined;
}>;


export type GetTransactionBlockQuery = { transaction: { digest: string, transactionJson?: unknown, transactionBcs?: string | null, signatures: Array<{ signatureBytes: string | null }>, effects: { status: ExecutionStatus | null, effectsBcs?: string | null, effectsJson?: unknown, balanceChangesJson?: unknown, executionError: { message: string, abortCode: string | null, identifier: string | null, constant: string | null, sourceLineNumber: number | null, instructionOffset: number | null, module: { name: string, package: { address: string } | null } | null, function: { name: string } | null } | null, epoch: { epochId: number } | null, objectChanges?: { nodes: Array<{ address: string, outputState: { asMoveObject: { contents: { type: { repr: string } | null } | null } | null } | null }> } | null, events?: { pageInfo: { hasNextPage: boolean }, nodes: Array<{ transactionModule: { name: string, package: { address: string } | null } | null, sender: { address: string } | null, contents: { bcs: string | null, json: unknown, type: { repr: string } | null } | null }> } | null } | null } | null };

export type Transaction_FieldsFragment = { digest: string, transactionJson?: unknown, transactionBcs?: string | null, signatures: Array<{ signatureBytes: string | null }>, effects: { status: ExecutionStatus | null, effectsBcs?: string | null, effectsJson?: unknown, balanceChangesJson?: unknown, executionError: { message: string, abortCode: string | null, identifier: string | null, constant: string | null, sourceLineNumber: number | null, instructionOffset: number | null, module: { name: string, package: { address: string } | null } | null, function: { name: string } | null } | null, epoch: { epochId: number } | null, objectChanges?: { nodes: Array<{ address: string, outputState: { asMoveObject: { contents: { type: { repr: string } | null } | null } | null } | null }> } | null, events?: { pageInfo: { hasNextPage: boolean }, nodes: Array<{ transactionModule: { name: string, package: { address: string } | null } | null, sender: { address: string } | null, contents: { bcs: string | null, json: unknown, type: { repr: string } | null } | null }> } | null } | null };

export type ResolveTransactionQueryVariables = Exact<{
  transaction: unknown;
  doGasSelection?: boolean | null | undefined;
  checksEnabled?: boolean | null | undefined;
}>;


export type ResolveTransactionQuery = { simulateTransaction: { effects: { transaction: { transactionBcs: string | null, effects: { status: ExecutionStatus | null, epoch: { epochId: number } | null, executionError: { message: string, abortCode: string | null, identifier: string | null, constant: string | null, sourceLineNumber: number | null, instructionOffset: number | null, module: { name: string, package: { address: string } | null } | null, function: { name: string } | null } | null } | null } | null } | null } };

export type VerifyZkLoginSignatureQueryVariables = Exact<{
  bytes: string;
  signature: string;
  intentScope: ZkLoginIntentScope;
  author: string;
}>;


export type VerifyZkLoginSignatureQuery = { verifyZkLoginSignature: { success: boolean | null } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const Object_Owner_FieldsFragmentDoc = new TypedDocumentString(`
    fragment OBJECT_OWNER_FIELDS on Owner {
  __typename
  ... on AddressOwner {
    address {
      address
    }
  }
  ... on ObjectOwner {
    address {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    address {
      address
    }
  }
}
    `, {"fragmentName":"OBJECT_OWNER_FIELDS"}) as unknown as TypedDocumentString<Object_Owner_FieldsFragment, unknown>;
export const Object_FieldsFragmentDoc = new TypedDocumentString(`
    fragment OBJECT_FIELDS on Object {
  address
  digest
  version
  objectBcs @include(if: $includeObjectBcs)
  asMoveObject {
    contents {
      bcs @include(if: $includeContent)
      json @include(if: $includeJson)
      display @include(if: $includeDisplay) {
        output
        errors
      }
      type {
        repr
      }
    }
  }
  asMovePackage {
    __typename
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction @include(if: $includePreviousTransaction) {
    digest
  }
}
    fragment OBJECT_OWNER_FIELDS on Owner {
  __typename
  ... on AddressOwner {
    address {
      address
    }
  }
  ... on ObjectOwner {
    address {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    address {
      address
    }
  }
}`, {"fragmentName":"OBJECT_FIELDS"}) as unknown as TypedDocumentString<Object_FieldsFragment, unknown>;
export const Move_Object_FieldsFragmentDoc = new TypedDocumentString(`
    fragment MOVE_OBJECT_FIELDS on MoveObject {
  address
  digest
  version
  objectBcs @include(if: $includeObjectBcs)
  contents {
    bcs @include(if: $includeContent)
    json @include(if: $includeJson)
    display @include(if: $includeDisplay) {
      output
      errors
    }
    type {
      repr
    }
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction @include(if: $includePreviousTransaction) {
    digest
  }
}
    fragment OBJECT_OWNER_FIELDS on Owner {
  __typename
  ... on AddressOwner {
    address {
      address
    }
  }
  ... on ObjectOwner {
    address {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    address {
      address
    }
  }
}`, {"fragmentName":"MOVE_OBJECT_FIELDS"}) as unknown as TypedDocumentString<Move_Object_FieldsFragment, unknown>;
export const Transaction_FieldsFragmentDoc = new TypedDocumentString(`
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionJson @include(if: $includeTransaction)
  transactionBcs @include(if: $includeBcs)
  signatures {
    signatureBytes
  }
  effects {
    status
    executionError {
      message
      abortCode
      identifier
      constant
      sourceLineNumber
      instructionOffset
      module {
        name
        package {
          address
        }
      }
      function {
        name
      }
    }
    epoch {
      epochId
    }
    effectsBcs @include(if: $includeEffects)
    effectsJson @include(if: $includeObjectTypes)
    objectChanges(first: 50) @include(if: $includeObjectTypes) {
      nodes {
        address
        outputState {
          asMoveObject {
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChangesJson @include(if: $includeBalanceChanges)
    events(first: 50) @include(if: $includeEvents) {
      pageInfo {
        hasNextPage
      }
      nodes {
        transactionModule {
          package {
            address
          }
          name
        }
        sender {
          address
        }
        contents {
          type {
            repr
          }
          bcs
          json
        }
      }
    }
  }
}
    `, {"fragmentName":"TRANSACTION_FIELDS"}) as unknown as TypedDocumentString<Transaction_FieldsFragment, unknown>;
export const GetAllBalancesDocument = new TypedDocumentString(`
    query getAllBalances($owner: SuiAddress!, $limit: Int, $cursor: String) {
  address(address: $owner) {
    balances(first: $limit, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        coinType {
          repr
        }
        totalBalance
        addressBalance
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetAllBalancesQuery, GetAllBalancesQueryVariables>;
export const GetBalanceDocument = new TypedDocumentString(`
    query getBalance($owner: SuiAddress!, $coinType: String = "0x2::sui::SUI") {
  address(address: $owner) {
    balance(coinType: $coinType) {
      coinType {
        repr
      }
      totalBalance
      addressBalance
    }
  }
}
    `) as unknown as TypedDocumentString<GetBalanceQuery, GetBalanceQueryVariables>;
export const GetChainIdentifierDocument = new TypedDocumentString(`
    query getChainIdentifier {
  checkpoint(sequenceNumber: 0) {
    digest
  }
}
    `) as unknown as TypedDocumentString<GetChainIdentifierQuery, GetChainIdentifierQueryVariables>;
export const GetCoinMetadataDocument = new TypedDocumentString(`
    query getCoinMetadata($coinType: String!) {
  coinMetadata(coinType: $coinType) {
    address
    decimals
    name
    symbol
    description
    iconUrl
  }
}
    `) as unknown as TypedDocumentString<GetCoinMetadataQuery, GetCoinMetadataQueryVariables>;
export const GetCoinsDocument = new TypedDocumentString(`
    query getCoins($owner: SuiAddress!, $first: Int, $cursor: String, $type: String = "0x2::coin::Coin<0x2::sui::SUI>") {
  address(address: $owner) {
    address
    objects(first: $first, after: $cursor, filter: {type: $type}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        owner {
          ...OBJECT_OWNER_FIELDS
        }
        contents {
          json
          type {
            repr
          }
        }
        address
        version
        digest
      }
    }
  }
}
    fragment OBJECT_OWNER_FIELDS on Owner {
  __typename
  ... on AddressOwner {
    address {
      address
    }
  }
  ... on ObjectOwner {
    address {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    address {
      address
    }
  }
}`) as unknown as TypedDocumentString<GetCoinsQuery, GetCoinsQueryVariables>;
export const GetCurrentSystemStateDocument = new TypedDocumentString(`
    query getCurrentSystemState {
  epoch {
    epochId
    referenceGasPrice
    startTimestamp
    protocolConfigs {
      protocolVersion
    }
    systemState {
      json
    }
  }
}
    `) as unknown as TypedDocumentString<GetCurrentSystemStateQuery, GetCurrentSystemStateQueryVariables>;
export const GetDynamicFieldsDocument = new TypedDocumentString(`
    query getDynamicFields($parentId: SuiAddress!, $first: Int, $cursor: String, $includeValue: Boolean = false) {
  address(address: $parentId) {
    dynamicFields(first: $first, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name {
          bcs
          type {
            repr
          }
        }
        value {
          __typename
          ... on MoveValue {
            bcs @include(if: $includeValue)
            type {
              repr
            }
          }
          ... on MoveObject {
            address
            contents {
              bcs @include(if: $includeValue)
              type {
                repr
              }
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetDynamicFieldsQuery, GetDynamicFieldsQueryVariables>;
export const GetMoveFunctionDocument = new TypedDocumentString(`
    query getMoveFunction($package: SuiAddress!, $module: String!, $function: String!) {
  package(address: $package) {
    module(name: $module) {
      function(name: $function) {
        name
        visibility
        isEntry
        typeParameters {
          constraints
        }
        parameters {
          signature
        }
        return {
          signature
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetMoveFunctionQuery, GetMoveFunctionQueryVariables>;
export const GetProtocolConfigDocument = new TypedDocumentString(`
    query getProtocolConfig {
  epoch {
    protocolConfigs {
      protocolVersion
      featureFlags {
        key
        value
      }
      configs {
        key
        value
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetProtocolConfigQuery, GetProtocolConfigQueryVariables>;
export const GetReferenceGasPriceDocument = new TypedDocumentString(`
    query getReferenceGasPrice {
  epoch {
    referenceGasPrice
  }
}
    `) as unknown as TypedDocumentString<GetReferenceGasPriceQuery, GetReferenceGasPriceQueryVariables>;
export const DefaultSuinsNameDocument = new TypedDocumentString(`
    query defaultSuinsName($address: SuiAddress!) {
  address(address: $address) {
    defaultNameRecord {
      domain
    }
  }
}
    `) as unknown as TypedDocumentString<DefaultSuinsNameQuery, DefaultSuinsNameQueryVariables>;
export const GetOwnedObjectsDocument = new TypedDocumentString(`
    query getOwnedObjects($owner: SuiAddress!, $limit: Int, $cursor: String, $filter: ObjectFilter, $includeContent: Boolean = false, $includePreviousTransaction: Boolean = false, $includeObjectBcs: Boolean = false, $includeJson: Boolean = false, $includeDisplay: Boolean = false) {
  address(address: $owner) {
    objects(first: $limit, after: $cursor, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...MOVE_OBJECT_FIELDS
      }
    }
  }
}
    fragment MOVE_OBJECT_FIELDS on MoveObject {
  address
  digest
  version
  objectBcs @include(if: $includeObjectBcs)
  contents {
    bcs @include(if: $includeContent)
    json @include(if: $includeJson)
    display @include(if: $includeDisplay) {
      output
      errors
    }
    type {
      repr
    }
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction @include(if: $includePreviousTransaction) {
    digest
  }
}
fragment OBJECT_OWNER_FIELDS on Owner {
  __typename
  ... on AddressOwner {
    address {
      address
    }
  }
  ... on ObjectOwner {
    address {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    address {
      address
    }
  }
}`) as unknown as TypedDocumentString<GetOwnedObjectsQuery, GetOwnedObjectsQueryVariables>;
export const MultiGetObjectsDocument = new TypedDocumentString(`
    query multiGetObjects($objectKeys: [ObjectKey!]!, $includeContent: Boolean = false, $includePreviousTransaction: Boolean = false, $includeObjectBcs: Boolean = false, $includeJson: Boolean = false, $includeDisplay: Boolean = false) {
  multiGetObjects(keys: $objectKeys) {
    ...OBJECT_FIELDS
  }
}
    fragment OBJECT_FIELDS on Object {
  address
  digest
  version
  objectBcs @include(if: $includeObjectBcs)
  asMoveObject {
    contents {
      bcs @include(if: $includeContent)
      json @include(if: $includeJson)
      display @include(if: $includeDisplay) {
        output
        errors
      }
      type {
        repr
      }
    }
  }
  asMovePackage {
    __typename
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction @include(if: $includePreviousTransaction) {
    digest
  }
}
fragment OBJECT_OWNER_FIELDS on Owner {
  __typename
  ... on AddressOwner {
    address {
      address
    }
  }
  ... on ObjectOwner {
    address {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    address {
      address
    }
  }
}`) as unknown as TypedDocumentString<MultiGetObjectsQuery, MultiGetObjectsQueryVariables>;
export const SimulateTransactionDocument = new TypedDocumentString(`
    query simulateTransaction($transaction: JSON!, $includeTransaction: Boolean = false, $includeEffects: Boolean = false, $includeEvents: Boolean = false, $includeBalanceChanges: Boolean = false, $includeObjectTypes: Boolean = false, $includeCommandResults: Boolean = false, $includeBcs: Boolean = false, $doGasSelection: Boolean = false, $checksEnabled: Boolean = true) {
  simulateTransaction(
    transaction: $transaction
    doGasSelection: $doGasSelection
    checksEnabled: $checksEnabled
  ) {
    effects {
      transaction {
        ...TRANSACTION_FIELDS
      }
    }
    outputs @include(if: $includeCommandResults) {
      returnValues {
        value {
          bcs
        }
      }
      mutatedReferences {
        value {
          bcs
        }
      }
    }
  }
}
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionJson @include(if: $includeTransaction)
  transactionBcs @include(if: $includeBcs)
  signatures {
    signatureBytes
  }
  effects {
    status
    executionError {
      message
      abortCode
      identifier
      constant
      sourceLineNumber
      instructionOffset
      module {
        name
        package {
          address
        }
      }
      function {
        name
      }
    }
    epoch {
      epochId
    }
    effectsBcs @include(if: $includeEffects)
    effectsJson @include(if: $includeObjectTypes)
    objectChanges(first: 50) @include(if: $includeObjectTypes) {
      nodes {
        address
        outputState {
          asMoveObject {
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChangesJson @include(if: $includeBalanceChanges)
    events(first: 50) @include(if: $includeEvents) {
      pageInfo {
        hasNextPage
      }
      nodes {
        transactionModule {
          package {
            address
          }
          name
        }
        sender {
          address
        }
        contents {
          type {
            repr
          }
          bcs
          json
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<SimulateTransactionQuery, SimulateTransactionQueryVariables>;
export const ExecuteTransactionDocument = new TypedDocumentString(`
    mutation executeTransaction($transactionDataBcs: Base64!, $signatures: [Base64!]!, $includeTransaction: Boolean = false, $includeEffects: Boolean = false, $includeEvents: Boolean = false, $includeBalanceChanges: Boolean = false, $includeObjectTypes: Boolean = false, $includeBcs: Boolean = false) {
  executeTransaction(
    transactionDataBcs: $transactionDataBcs
    signatures: $signatures
  ) {
    effects {
      transaction {
        ...TRANSACTION_FIELDS
      }
    }
  }
}
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionJson @include(if: $includeTransaction)
  transactionBcs @include(if: $includeBcs)
  signatures {
    signatureBytes
  }
  effects {
    status
    executionError {
      message
      abortCode
      identifier
      constant
      sourceLineNumber
      instructionOffset
      module {
        name
        package {
          address
        }
      }
      function {
        name
      }
    }
    epoch {
      epochId
    }
    effectsBcs @include(if: $includeEffects)
    effectsJson @include(if: $includeObjectTypes)
    objectChanges(first: 50) @include(if: $includeObjectTypes) {
      nodes {
        address
        outputState {
          asMoveObject {
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChangesJson @include(if: $includeBalanceChanges)
    events(first: 50) @include(if: $includeEvents) {
      pageInfo {
        hasNextPage
      }
      nodes {
        transactionModule {
          package {
            address
          }
          name
        }
        sender {
          address
        }
        contents {
          type {
            repr
          }
          bcs
          json
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<ExecuteTransactionMutation, ExecuteTransactionMutationVariables>;
export const GetTransactionBlockDocument = new TypedDocumentString(`
    query getTransactionBlock($digest: String!, $includeTransaction: Boolean = false, $includeEffects: Boolean = false, $includeEvents: Boolean = false, $includeBalanceChanges: Boolean = false, $includeObjectTypes: Boolean = false, $includeBcs: Boolean = false) {
  transaction(digest: $digest) {
    ...TRANSACTION_FIELDS
  }
}
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionJson @include(if: $includeTransaction)
  transactionBcs @include(if: $includeBcs)
  signatures {
    signatureBytes
  }
  effects {
    status
    executionError {
      message
      abortCode
      identifier
      constant
      sourceLineNumber
      instructionOffset
      module {
        name
        package {
          address
        }
      }
      function {
        name
      }
    }
    epoch {
      epochId
    }
    effectsBcs @include(if: $includeEffects)
    effectsJson @include(if: $includeObjectTypes)
    objectChanges(first: 50) @include(if: $includeObjectTypes) {
      nodes {
        address
        outputState {
          asMoveObject {
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChangesJson @include(if: $includeBalanceChanges)
    events(first: 50) @include(if: $includeEvents) {
      pageInfo {
        hasNextPage
      }
      nodes {
        transactionModule {
          package {
            address
          }
          name
        }
        sender {
          address
        }
        contents {
          type {
            repr
          }
          bcs
          json
        }
      }
    }
  }
}`) as unknown as TypedDocumentString<GetTransactionBlockQuery, GetTransactionBlockQueryVariables>;
export const ResolveTransactionDocument = new TypedDocumentString(`
    query resolveTransaction($transaction: JSON!, $doGasSelection: Boolean = true, $checksEnabled: Boolean = true) {
  simulateTransaction(
    transaction: $transaction
    doGasSelection: $doGasSelection
    checksEnabled: $checksEnabled
  ) {
    effects {
      transaction {
        transactionBcs
        effects {
          epoch {
            epochId
          }
          status
          executionError {
            message
            abortCode
            identifier
            constant
            sourceLineNumber
            instructionOffset
            module {
              name
              package {
                address
              }
            }
            function {
              name
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ResolveTransactionQuery, ResolveTransactionQueryVariables>;
export const VerifyZkLoginSignatureDocument = new TypedDocumentString(`
    query verifyZkLoginSignature($bytes: Base64!, $signature: Base64!, $intentScope: ZkLoginIntentScope!, $author: SuiAddress!) {
  verifyZkLoginSignature(
    bytes: $bytes
    signature: $signature
    intentScope: $intentScope
    author: $author
  ) {
    success
  }
}
    `) as unknown as TypedDocumentString<VerifyZkLoginSignatureQuery, VerifyZkLoginSignatureQueryVariables>;