// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable */

import { MoveTypeLayout } from '../types.js';
import { MoveTypeSignature } from '../types.js';
import { OpenMoveTypeSignature } from '../types.js';
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** String containing Base64-encoded binary data. */
  Base64: { input: string; output: string; }
  /** String representation of an arbitrary width, possibly signed integer */
  BigInt: { input: string; output: string; }
  /** ISO-8601 Date and Time: RFC3339 in UTC with format: YYYY-MM-DDTHH:MM:SS.mmmZ. Note that the milliseconds part is optional, and it may be omitted if its value is 0. */
  DateTime: { input: string; output: string; }
  /** Arbitrary JSON data. */
  JSON: { input: unknown; output: unknown; }
  /**
   * The shape of a concrete Move Type (a type with all its type parameters instantiated with concrete types), corresponding to the following recursive type:
   *
   * type MoveTypeLayout =
   *     "address"
   *   | "bool"
   *   | "u8" | "u16" | ... | "u256"
   *   | { vector: MoveTypeLayout }
   *   | {
   *       struct: {
   *         type: string,
   *         fields: [{ name: string, layout: MoveTypeLayout }],
   *       }
   *     }
   *   | { enum: [{
   *           type: string,
   *           variants: [{
   *               name: string,
   *               fields: [{ name: string, layout: MoveTypeLayout }],
   *           }]
   *       }]
   *   }
   */
  MoveTypeLayout: { input: MoveTypeLayout; output: MoveTypeLayout; }
  /**
   * The signature of a concrete Move Type (a type with all its type parameters instantiated with concrete types, that contains no references), corresponding to the following recursive type:
   *
   * type MoveTypeSignature =
   *     "address"
   *   | "bool"
   *   | "u8" | "u16" | ... | "u256"
   *   | { vector: MoveTypeSignature }
   *   | {
   *       datatype: {
   *         package: string,
   *         module: string,
   *         type: string,
   *         typeParameters: [MoveTypeSignature],
   *       }
   *     }
   */
  MoveTypeSignature: { input: MoveTypeSignature; output: MoveTypeSignature; }
  /**
   * The shape of an abstract Move Type (a type that can contain free type parameters, and can optionally be taken by reference), corresponding to the following recursive type:
   *
   * type OpenMoveTypeSignature = {
   *   ref: ("&" | "&mut")?,
   *   body: OpenMoveTypeSignatureBody,
   * }
   *
   * type OpenMoveTypeSignatureBody =
   *     "address"
   *   | "bool"
   *   | "u8" | "u16" | ... | "u256"
   *   | { vector: OpenMoveTypeSignatureBody }
   *   | {
   *       datatype {
   *         package: string,
   *         module: string,
   *         type: string,
   *         typeParameters: [OpenMoveTypeSignatureBody]
   *       }
   *     }
   *   | { typeParameter: number }
   */
  OpenMoveTypeSignature: { input: OpenMoveTypeSignature; output: OpenMoveTypeSignature; }
  /** String containing 32 byte hex-encoded address, with a leading '0x'. Leading zeroes can be omitted on input but will always appear in outputs (SuiAddress in output is guaranteed to be 66 characters long). */
  SuiAddress: { input: string; output: string; }
  /** An unsigned integer that can hold values up to 2^53 - 1. This can be treated similarly to `Int`, but it is guaranteed to be non-negative, and it may be larger than 2^32 - 1. */
  UInt53: { input: number; output: number; }
};

/** System transaction for creating the accumulator root. */
export type AccumulatorRootCreateTransaction = {
  __typename?: 'AccumulatorRootCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

export type ActiveJwk = {
  __typename?: 'ActiveJwk';
  /** The JWK algorithm parameter, (RFC 7517, Section 4.4). */
  alg?: Maybe<Scalars['String']['output']>;
  /** The JWK RSA public exponent, (RFC 7517, Section 9.3). */
  e?: Maybe<Scalars['String']['output']>;
  /** The most recent epoch in which the JWK was validated. */
  epoch?: Maybe<Epoch>;
  /** The string (Issuing Authority) that identifies the OIDC provider. */
  iss?: Maybe<Scalars['String']['output']>;
  /** The string (Key ID) that identifies the JWK among a set of JWKs, (RFC 7517, Section 4.5). */
  kid?: Maybe<Scalars['String']['output']>;
  /** The JWK key type parameter, (RFC 7517, Section 4.1). */
  kty?: Maybe<Scalars['String']['output']>;
  /** The JWK RSA modulus, (RFC 7517, Section 9.3). */
  n?: Maybe<Scalars['String']['output']>;
};

export type ActiveJwkConnection = {
  __typename?: 'ActiveJwkConnection';
  /** A list of edges. */
  edges: Array<ActiveJwkEdge>;
  /** A list of nodes. */
  nodes: Array<ActiveJwk>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type ActiveJwkEdge = {
  __typename?: 'ActiveJwkEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: ActiveJwk;
};

export type Address = IAddressable & {
  __typename?: 'Address';
  /** The Address' identifier, a 32-byte number represented as a 64-character hex string, with a lead "0x". */
  address: Scalars['SuiAddress']['output'];
  /** Attempts to fetch the object at this address. */
  asObject?: Maybe<Object>;
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * Returns `None` when no checkpoint is set in scope (e.g. execution scope).
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /**
   * Access a dynamic field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic field with that name could not be found attached to the object with this address.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * Dynamic fields owned by this address.
   *
   * The address must correspond to an object (account addresses cannot own dynamic fields), but that object may be wrapped.
   */
  dynamicFields?: Maybe<DynamicFieldConnection>;
  /**
   * Access a dynamic object field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic object field with that name could not be found attached to the object with this address.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * Returns `None` when no checkpoint is set in scope (e.g. execution scope).
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /**
   * Access dynamic fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic fields that is guaranteed to be the same length as `keys`. If a dynamic field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicFields: Array<Maybe<DynamicField>>;
  /**
   * Access dynamic object fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic object fields that is guaranteed to be the same length as `keys`. If a dynamic object field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicObjectFields: Array<Maybe<DynamicField>>;
  /** Objects owned by this address, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /**
   * Transactions associated with this address.
   *
   * Similar behavior to the `transactions` in Query but supporting the additional `AddressTransactionRelationship` filter, which defaults to `SENT`.
   */
  transactions?: Maybe<TransactionConnection>;
};


export type AddressBalanceArgs = {
  coinType: Scalars['String']['input'];
};


export type AddressBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type AddressDynamicFieldArgs = {
  name: DynamicFieldName;
};


export type AddressDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type AddressDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


export type AddressMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type AddressMultiGetDynamicFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


export type AddressMultiGetDynamicObjectFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


export type AddressObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type AddressTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  relation?: InputMaybe<AddressTransactionRelationship>;
};

/** Object is exclusively owned by a single address, and is mutable. */
export type AddressOwner = {
  __typename?: 'AddressOwner';
  /** The owner's address. */
  address?: Maybe<Address>;
};

/** The possible relationship types for a transaction: sent or affected. */
export enum AddressTransactionRelationship {
  /** Transactions that this address was involved in, either as the sender, sponsor, or as the owner of some object that was created, modified or transferred. */
  Affected = 'AFFECTED',
  /** Transactions this address has sent. */
  Sent = 'SENT'
}

/** System transaction for creating the on-chain state used by zkLogin. */
export type AuthenticatorStateCreateTransaction = {
  __typename?: 'AuthenticatorStateCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** System transaction that is executed at the end of an epoch to expire JSON Web Keys (JWKs) that are no longer valid, based on their associated epoch. This is part of the on-chain state management for zkLogin and authentication. */
export type AuthenticatorStateExpireTransaction = {
  __typename?: 'AuthenticatorStateExpireTransaction';
  /** The initial version that the AuthenticatorStateUpdate was shared at. */
  authenticatorObjInitialSharedVersion?: Maybe<Scalars['UInt53']['output']>;
  /** Expire JWKs that have a lower epoch than this. */
  minEpoch?: Maybe<Epoch>;
};

export type AuthenticatorStateUpdateTransaction = {
  __typename?: 'AuthenticatorStateUpdateTransaction';
  /** The initial version of the authenticator object that it was shared at. */
  authenticatorObjInitialSharedVersion?: Maybe<Scalars['UInt53']['output']>;
  /** Epoch of the authenticator state update transaction. */
  epoch?: Maybe<Epoch>;
  /** Newly active JWKs (JSON Web Keys). */
  newActiveJwks?: Maybe<ActiveJwkConnection>;
  /** Consensus round of the authenticator state update. */
  round?: Maybe<Scalars['UInt53']['output']>;
};


export type AuthenticatorStateUpdateTransactionNewActiveJwksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Checkpoint range for which data is available. */
export type AvailableRange = {
  __typename?: 'AvailableRange';
  /** Inclusive lower checkpoint for which data is available. */
  first?: Maybe<Checkpoint>;
  /** Inclusive upper checkpoint for which data is available. */
  last?: Maybe<Checkpoint>;
};

/** The total balance for a particular coin type. */
export type Balance = {
  __typename?: 'Balance';
  /** Coin type for the balance, such as `0x2::sui::SUI`. */
  coinType?: Maybe<MoveType>;
  /** The total balance across all coin objects of this coin type. */
  totalBalance?: Maybe<Scalars['BigInt']['output']>;
};

/** Effects to the balance (sum of coin values per coin type) of addresses and objects. */
export type BalanceChange = {
  __typename?: 'BalanceChange';
  /** The signed balance change. */
  amount?: Maybe<Scalars['BigInt']['output']>;
  /** The inner type of the coin whose balance has changed (e.g. `0x2::sui::SUI`). */
  coinType?: Maybe<MoveType>;
  /** The address or object whose balance has changed. */
  owner?: Maybe<Address>;
};

export type BalanceChangeConnection = {
  __typename?: 'BalanceChangeConnection';
  /** A list of edges. */
  edges: Array<BalanceChangeEdge>;
  /** A list of nodes. */
  nodes: Array<BalanceChange>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type BalanceChangeEdge = {
  __typename?: 'BalanceChangeEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: BalanceChange;
};

export type BalanceConnection = {
  __typename?: 'BalanceConnection';
  /** A list of edges. */
  edges: Array<BalanceEdge>;
  /** A list of nodes. */
  nodes: Array<Balance>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type BalanceEdge = {
  __typename?: 'BalanceEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Balance;
};

/** System transaction for initializing bridge committee. */
export type BridgeCommitteeInitTransaction = {
  __typename?: 'BridgeCommitteeInitTransaction';
  /** The initial shared version of the bridge object. */
  bridgeObjectVersion?: Maybe<Scalars['UInt53']['output']>;
};

/** System transaction for creating bridge state for cross-chain operations. */
export type BridgeStateCreateTransaction = {
  __typename?: 'BridgeStateCreateTransaction';
  /** The chain identifier for which this bridge state is being created. */
  chainIdentifier?: Maybe<Scalars['String']['output']>;
};

/**
 * A system transaction that updates epoch information on-chain (increments the current epoch). Executed by the system once per epoch, without using gas. Epoch change transactions cannot be submitted by users, because validators will refuse to sign them.
 *
 * This transaction kind is deprecated in favour of `EndOfEpochTransaction`.
 */
export type ChangeEpochTransaction = {
  __typename?: 'ChangeEpochTransaction';
  /** The total amount of gas charged for computation during the epoch. */
  computationCharge?: Maybe<Scalars['UInt53']['output']>;
  /** The next (to become) epoch. */
  epoch?: Maybe<Epoch>;
  /** Unix timestamp when epoch started. */
  epochStartTimestamp?: Maybe<Scalars['DateTime']['output']>;
  /** The non-refundable storage fee. */
  nonRefundableStorageFee?: Maybe<Scalars['UInt53']['output']>;
  /** The epoch's corresponding protocol configuration. */
  protocolConfigs?: Maybe<ProtocolConfigs>;
  /** The total amount of gas charged for storage during the epoch. */
  storageCharge?: Maybe<Scalars['UInt53']['output']>;
  /** The amount of storage rebate refunded to the transaction senders. */
  storageRebate?: Maybe<Scalars['UInt53']['output']>;
  /** System packages that will be written by validators before the new epoch starts, to upgrade them on-chain. These objects do not have a "previous transaction" because they are not written on-chain yet. Consult `effects.objectChanges` for this transaction to see the actual objects written. */
  systemPackages?: Maybe<MovePackageConnection>;
};


/**
 * A system transaction that updates epoch information on-chain (increments the current epoch). Executed by the system once per epoch, without using gas. Epoch change transactions cannot be submitted by users, because validators will refuse to sign them.
 *
 * This transaction kind is deprecated in favour of `EndOfEpochTransaction`.
 */
export type ChangeEpochTransactionSystemPackagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Checkpoints contain finalized transactions and are used for node synchronization and global transaction ordering. */
export type Checkpoint = {
  __typename?: 'Checkpoint';
  /**
   * A commitment by the committee at each checkpoint on the artifacts of the checkpoint.
   * e.g., object checkpoint states
   */
  artifactsDigest?: Maybe<Scalars['String']['output']>;
  /** The Base64 serialized BCS bytes of this checkpoint's contents. */
  contentBcs?: Maybe<Scalars['Base64']['output']>;
  /** A 32-byte hash that uniquely identifies the checkpoint's content, encoded in Base58. */
  contentDigest?: Maybe<Scalars['String']['output']>;
  /** A 32-byte hash that uniquely identifies the checkpoint, encoded in Base58. This is a hash of the checkpoint's summary. */
  digest?: Maybe<Scalars['String']['output']>;
  /** The epoch that this checkpoint is part of. */
  epoch?: Maybe<Epoch>;
  /** The total number of transactions in the network by the end of this checkpoint. */
  networkTotalTransactions?: Maybe<Scalars['UInt53']['output']>;
  /** The digest of the previous checkpoint's summary. */
  previousCheckpointDigest?: Maybe<Scalars['String']['output']>;
  /** Query the RPC as if this checkpoint were the latest checkpoint. */
  query?: Maybe<Query>;
  /** The computation cost, storage cost, storage rebate, and non-refundable storage fee accumulated during this epoch, up to and including this checkpoint. These values increase monotonically across checkpoints in the same epoch, and reset on epoch boundaries. */
  rollingGasSummary?: Maybe<GasCostSummary>;
  /** The checkpoint's position in the total order of finalized checkpoints, agreed upon by consensus. */
  sequenceNumber: Scalars['UInt53']['output'];
  /** The Base64 serialized BCS bytes of this checkpoint's summary. */
  summaryBcs?: Maybe<Scalars['Base64']['output']>;
  /** The timestamp at which the checkpoint is agreed to have happened according to consensus. Transactions that access time in this checkpoint will observe this timestamp. */
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  transactions?: Maybe<TransactionConnection>;
  /** The aggregation of signatures from a quorum of validators for the checkpoint proposal. */
  validatorSignatures?: Maybe<ValidatorAggregatedSignature>;
};


/** Checkpoints contain finalized transactions and are used for node synchronization and global transaction ordering. */
export type CheckpointTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type CheckpointConnection = {
  __typename?: 'CheckpointConnection';
  /** A list of edges. */
  edges: Array<CheckpointEdge>;
  /** A list of nodes. */
  nodes: Array<Checkpoint>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type CheckpointEdge = {
  __typename?: 'CheckpointEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Checkpoint;
};

export type CheckpointFilter = {
  /** Limit query results to checkpoints that occured strictly after the given checkpoint. */
  afterCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit query results to checkpoints that occured at the given checkpoint. */
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit query results to checkpoints at this epoch. */
  atEpoch?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit query results to checkpoints that occured strictly before the given checkpoint. */
  beforeCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
};

/** System transaction for creating the coin deny list state. */
export type CoinDenyListStateCreateTransaction = {
  __typename?: 'CoinDenyListStateCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** An object representing metadata about a coin type. */
export type CoinMetadata = IAddressable & IMoveObject & IObject & {
  __typename?: 'CoinMetadata';
  /** The CoinMetadata's ID. */
  address: Scalars['SuiAddress']['output'];
  /** Whether the `DenyCap` can be used to enable a global pause that behaves as if all addresses were added to the deny list. `null` indicates that it is not known whether the currency can be paused or not. This field is only populated on currencies held in the Coin Registry. To determine whether a legacy currency can be paused, check the contents of its `DenyCap`, if it can be found. */
  allowGlobalPause?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The structured representation of the object's contents. */
  contents?: Maybe<MoveValue>;
  /** Number of decimal places the coin uses. */
  decimals?: Maybe<Scalars['Int']['output']>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** If the currency is regulated, this object represents the capability to modify the deny list. If a capability is known but wrapped, its address can be fetched but other fields will not be accessible. */
  denyCap?: Maybe<MoveObject>;
  /** Description of the coin. */
  description?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded in Base58. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * Access a dynamic field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic field with that name could not be found attached to this object.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * Dynamic fields owned by this object.
   *
   * Dynamic fields on wrapped objects can be accessed using `Address.dynamicFields`.
   */
  dynamicFields?: Maybe<DynamicFieldConnection>;
  /**
   * Access a dynamic object field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic object field with that name could not be found attached to this object.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Whether this object can be transfered using the `TransferObjects` Programmable Transaction Command or `sui::transfer::public_transfer`.
   *
   * Both these operations require the object to have both the `key` and `store` abilities.
   */
  hasPublicTransfer?: Maybe<Scalars['Boolean']['output']>;
  /** URL for the coin logo. */
  iconUrl?: Maybe<Scalars['String']['output']>;
  /** The Base64-encoded BCS serialize of this object, as a `MoveObject`. */
  moveObjectBcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /**
   * Access dynamic fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic fields that is guaranteed to be the same length as `keys`. If a dynamic field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicFields: Array<Maybe<DynamicField>>;
  /**
   * Access dynamic object fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic object fields that is guaranteed to be the same length as `keys`. If a dynamic object field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicObjectFields: Array<Maybe<DynamicField>>;
  /** Name for the coin. */
  name?: Maybe<Scalars['String']['output']>;
  /** Fetch the object with the same ID, at a different version, root version bound, or checkpoint. */
  objectAt?: Maybe<Object>;
  /** The Base64-encoded BCS serialization of this object, as an `Object`. */
  objectBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this object after this one. */
  objectVersionsAfter?: Maybe<ObjectConnection>;
  /** Paginate all versions of this object before this one. */
  objectVersionsBefore?: Maybe<ObjectConnection>;
  /** Objects owned by this object, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /** The object's owner kind. */
  owner?: Maybe<Owner>;
  /** The transaction that created this version of the object. */
  previousTransaction?: Maybe<Transaction>;
  /** The transactions that sent objects to this object. */
  receivedTransactions?: Maybe<TransactionConnection>;
  /** Whether the currency is regulated or not. `null` indicates that the regulatory status is unknown. */
  regulatedState?: Maybe<RegulatedState>;
  /** The SUI returned to the sponsor or sender of the transaction that modifies or deletes this object. */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /** The overall balance of coins issued. */
  supply?: Maybe<Scalars['BigInt']['output']>;
  /** Future behavior of the supply. `null` indicates that the future behavior of the supply is not known because the currency's treasury still exists. */
  supplyState?: Maybe<SupplyState>;
  /** Symbol for the coin. */
  symbol?: Maybe<Scalars['String']['output']>;
  /** The version of this object that this content comes from. */
  version?: Maybe<Scalars['UInt53']['output']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataBalanceArgs = {
  coinType: Scalars['String']['input'];
};


/** An object representing metadata about a coin type. */
export type CoinMetadataBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataDynamicFieldArgs = {
  name: DynamicFieldName;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataMultiGetDynamicFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataMultiGetDynamicObjectFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataObjectAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataObjectVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataObjectVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** An object representing metadata about a coin type. */
export type CoinMetadataReceivedTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** System transaction for creating the coin registry. */
export type CoinRegistryCreateTransaction = {
  __typename?: 'CoinRegistryCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** A single command in the programmable transaction. */
export type Command = MakeMoveVecCommand | MergeCoinsCommand | MoveCallCommand | OtherCommand | PublishCommand | SplitCoinsCommand | TransferObjectsCommand | UpgradeCommand;

export type CommandConnection = {
  __typename?: 'CommandConnection';
  /** A list of edges. */
  edges: Array<CommandEdge>;
  /** A list of nodes. */
  nodes: Array<Command>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type CommandEdge = {
  __typename?: 'CommandEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Command;
};

/**
 * A value produced or modified during command execution.
 *
 * This can represent either a return value from a command or an argument that was mutated by reference.
 */
export type CommandOutput = {
  __typename?: 'CommandOutput';
  /** The transaction argument that this value corresponds to (if any). */
  argument?: Maybe<TransactionArgument>;
  /** The structured Move value, if available. */
  value?: Maybe<MoveValue>;
};

/** The intermediate results for each command of a transaction simulation. */
export type CommandResult = {
  __typename?: 'CommandResult';
  /** Changes made to arguments that were mutably borrowed by each command in this transaction. */
  mutatedReferences?: Maybe<Array<CommandOutput>>;
  /** Return results of each command in this transaction. */
  returnValues?: Maybe<Array<CommandOutput>>;
};

/** Object is exclusively owned by a single adderss and sequenced via consensus. */
export type ConsensusAddressOwner = {
  __typename?: 'ConsensusAddressOwner';
  /** The owner's address. */
  address?: Maybe<Address>;
  /** The version at which the object most recently bcame a consensus object. This serves the same function as `Shared.initialSharedVersion`, except it may change if the object's `owner` type changes. */
  startVersion?: Maybe<Scalars['UInt53']['output']>;
};

/** System transaction that runs at the beginning of a checkpoint, and is responsible for setting the current value of the clock, based on the timestamp from consensus. */
export type ConsensusCommitPrologueTransaction = {
  __typename?: 'ConsensusCommitPrologueTransaction';
  /**
   * Digest of any additional state computed by the consensus handler.
   * Used to detect forking bugs as early as possible.
   *
   * Present in V4.
   */
  additionalStateDigest?: Maybe<Scalars['String']['output']>;
  /**
   * Unix timestamp from consensus.
   *
   * Present in V1, V2, V3, V4.
   */
  commitTimestamp?: Maybe<Scalars['DateTime']['output']>;
  /**
   * Digest of consensus output, encoded as a Base58 string.
   *
   * Present in V2, V3, V4.
   */
  consensusCommitDigest?: Maybe<Scalars['String']['output']>;
  /**
   * Epoch of the commit prologue transaction.
   *
   * Present in V1, V2, V3, V4.
   */
  epoch?: Maybe<Epoch>;
  /**
   * Consensus round of the commit.
   *
   * Present in V1, V2, V3, V4.
   */
  round?: Maybe<Scalars['UInt53']['output']>;
  /**
   * The sub DAG index of the consensus commit. This field is populated if there
   * are multiple consensus commits per round.
   *
   * Present in V3, V4.
   */
  subDagIndex?: Maybe<Scalars['UInt53']['output']>;
};

/** Reason why a transaction that attempted to access a consensus-managed object was cancelled. */
export enum ConsensusObjectCancellationReason {
  /** Read operation was cancelled. */
  CancelledRead = 'CANCELLED_READ',
  /** Object congestion prevented execution. */
  Congested = 'CONGESTED',
  /** Randomness service was unavailable. */
  RandomnessUnavailable = 'RANDOMNESS_UNAVAILABLE',
  /** Internal use only. */
  Unknown = 'UNKNOWN'
}

/** A transaction that was cancelled before it could access the consensus-managed object, so the object was an input but remained unchanged. */
export type ConsensusObjectCancelled = {
  __typename?: 'ConsensusObjectCancelled';
  /** The ID of the consensus-managed object that the transaction intended to access. */
  address?: Maybe<Scalars['SuiAddress']['output']>;
  /** Reason why the transaction was cancelled. */
  cancellationReason?: Maybe<ConsensusObjectCancellationReason>;
};

export type ConsensusObjectRead = {
  __typename?: 'ConsensusObjectRead';
  /** The version of the consensus-managed object that was read by this transaction. */
  object?: Maybe<Object>;
};

/** A rendered JSON blob based on an on-chain template. */
export type Display = {
  __typename?: 'Display';
  /** If any fields failed to render, this will contain a mapping from failed field names to error messages. If all fields succeed, this will be `null`. */
  errors?: Maybe<Scalars['JSON']['output']>;
  /** Output for all successfully substituted display fields. Unsuccessful fields will be `null`, and will be accompanied by a field in `errors`, explaining the error. */
  output?: Maybe<Scalars['JSON']['output']>;
};

/** System transaction for creating the display registry. */
export type DisplayRegistryCreateTransaction = {
  __typename?: 'DisplayRegistryCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicField = IAddressable & IMoveObject & IObject & {
  __typename?: 'DynamicField';
  /** The DynamicField's ID. */
  address: Scalars['SuiAddress']['output'];
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The structured representation of the object's contents. */
  contents?: Maybe<MoveValue>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded in Base58. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * Access a dynamic field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic field with that name could not be found attached to this object.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * Dynamic fields owned by this object.
   *
   * Dynamic fields on wrapped objects can be accessed using `Address.dynamicFields`.
   */
  dynamicFields?: Maybe<DynamicFieldConnection>;
  /**
   * Access a dynamic object field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic object field with that name could not be found attached to this object.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Whether this object can be transfered using the `TransferObjects` Programmable Transaction Command or `sui::transfer::public_transfer`.
   *
   * Both these operations require the object to have both the `key` and `store` abilities.
   */
  hasPublicTransfer?: Maybe<Scalars['Boolean']['output']>;
  /** The Base64-encoded BCS serialize of this object, as a `MoveObject`. */
  moveObjectBcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /**
   * Access dynamic fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic fields that is guaranteed to be the same length as `keys`. If a dynamic field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicFields: Array<Maybe<DynamicField>>;
  /**
   * Access dynamic object fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic object fields that is guaranteed to be the same length as `keys`. If a dynamic object field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicObjectFields: Array<Maybe<DynamicField>>;
  /** The dynamic field's name, as a Move value. */
  name?: Maybe<MoveValue>;
  /** Fetch the object with the same ID, at a different version, root version bound, or checkpoint. */
  objectAt?: Maybe<Object>;
  /** The Base64-encoded BCS serialization of this object, as an `Object`. */
  objectBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this object after this one. */
  objectVersionsAfter?: Maybe<ObjectConnection>;
  /** Paginate all versions of this object before this one. */
  objectVersionsBefore?: Maybe<ObjectConnection>;
  /** Objects owned by this object, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /** The object's owner kind. */
  owner?: Maybe<Owner>;
  /** The transaction that created this version of the object. */
  previousTransaction?: Maybe<Transaction>;
  /** The transactions that sent objects to this object. */
  receivedTransactions?: Maybe<TransactionConnection>;
  /** The SUI returned to the sponsor or sender of the transaction that modifies or deletes this object. */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /** The dynamic field's value, as a Move value for dynamic fields and as a MoveObject for dynamic object fields. */
  value?: Maybe<DynamicFieldValue>;
  /** The version of this object that this content comes from. */
  version?: Maybe<Scalars['UInt53']['output']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldBalanceArgs = {
  coinType: Scalars['String']['input'];
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldDynamicFieldArgs = {
  name: DynamicFieldName;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldMultiGetDynamicFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldMultiGetDynamicObjectFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldObjectAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldObjectVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldObjectVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Dynamic fields are heterogenous fields that can be added or removed from an object at runtime. Their names are arbitrary Move values that have `copy`, `drop`, and `store`.
 *
 * There are two sub-types of dynamic fields:
 *
 * - Dynamic fields can store any value that has `store`. Objects stored in this kind of field will be considered wrapped (not accessible via its ID by external tools like explorers, wallets, etc. accessing storage).
 * - Dynamic object fields can only store objects (values that have the `key` ability, and an `id: UID` as its first field) that have `store`, but they will still be directly accessible off-chain via their ID after being attached as a field.
 */
export type DynamicFieldReceivedTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type DynamicFieldConnection = {
  __typename?: 'DynamicFieldConnection';
  /** A list of edges. */
  edges: Array<DynamicFieldEdge>;
  /** A list of nodes. */
  nodes: Array<DynamicField>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type DynamicFieldEdge = {
  __typename?: 'DynamicFieldEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: DynamicField;
};

/** A description of a dynamic field's name. */
export type DynamicFieldName = {
  /** The Base64-encoded BCS serialization of the dynamic field's 'name'. */
  bcs: Scalars['Base64']['input'];
  /** The type of the dynamic field's name, like 'u64' or '0x2::kiosk::Listing'. */
  type: Scalars['String']['input'];
};

/** The value of a dynamic field (`MoveValue`) or dynamic object field (`MoveObject`). */
export type DynamicFieldValue = MoveObject | MoveValue;

/** System transaction that supersedes `ChangeEpochTransaction` as the new way to run transactions at the end of an epoch. Behaves similarly to `ChangeEpochTransaction` but can accommodate other optional transactions to run at the end of the epoch. */
export type EndOfEpochTransaction = {
  __typename?: 'EndOfEpochTransaction';
  /** The list of system transactions that are allowed to run at the end of the epoch. */
  transactions?: Maybe<EndOfEpochTransactionKindConnection>;
};


/** System transaction that supersedes `ChangeEpochTransaction` as the new way to run transactions at the end of an epoch. Behaves similarly to `ChangeEpochTransaction` but can accommodate other optional transactions to run at the end of the epoch. */
export type EndOfEpochTransactionTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type EndOfEpochTransactionKind = AccumulatorRootCreateTransaction | AuthenticatorStateCreateTransaction | AuthenticatorStateExpireTransaction | BridgeCommitteeInitTransaction | BridgeStateCreateTransaction | ChangeEpochTransaction | CoinDenyListStateCreateTransaction | CoinRegistryCreateTransaction | DisplayRegistryCreateTransaction | RandomnessStateCreateTransaction | StoreExecutionTimeObservationsTransaction;

export type EndOfEpochTransactionKindConnection = {
  __typename?: 'EndOfEpochTransactionKindConnection';
  /** A list of edges. */
  edges: Array<EndOfEpochTransactionKindEdge>;
  /** A list of nodes. */
  nodes: Array<EndOfEpochTransactionKind>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type EndOfEpochTransactionKindEdge = {
  __typename?: 'EndOfEpochTransactionKindEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: EndOfEpochTransactionKind;
};

/**
 * Activity on Sui is partitioned in time, into epochs.
 *
 * Epoch changes are opportunities for the network to reconfigure itself (perform protocol or system package upgrades, or change the committee) and distribute staking rewards. The network aims to keep epochs roughly the same duration as each other.
 *
 * During a particular epoch the following data is fixed:
 *
 * - protocol version,
 * - reference gas price,
 * - system package versions,
 * - validators in the committee.
 */
export type Epoch = {
  __typename?: 'Epoch';
  /** The epoch's corresponding checkpoints. */
  checkpoints?: Maybe<CheckpointConnection>;
  /**
   * State of the Coin DenyList object (0x403) at the start of this epoch.
   *
   * The DenyList controls access to Regulated Coins. Writes to the DenyList are accumulated and only take effect on the next epoch boundary. Consequently, it's possible to determine the state of the DenyList for a transaction by reading it at the start of the epoch the transaction is in.
   */
  coinDenyList?: Maybe<Object>;
  /** The timestamp associated with the last checkpoint in the epoch (or `null` if the epoch has not finished yet). */
  endTimestamp?: Maybe<Scalars['DateTime']['output']>;
  /** The epoch's id as a sequence number that starts at 0 and is incremented by one at every epoch change. */
  epochId: Scalars['UInt53']['output'];
  /** The storage fees paid for transactions executed during the epoch (or `null` if the epoch has not finished yet). */
  fundInflow?: Maybe<Scalars['BigInt']['output']>;
  /** The storage fee rebates paid to users who deleted the data associated with past transactions (or `null` if the epoch has not finished yet). */
  fundOutflow?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The storage fund available in this epoch (or `null` if the epoch has not finished yet).
   * This fund is used to redistribute storage fees from past transactions to future validators.
   */
  fundSize?: Maybe<Scalars['BigInt']['output']>;
  /**
   * A commitment by the committee at the end of epoch on the contents of the live object set at that time.
   * This can be used to verify state snapshots.
   */
  liveObjectSetDigest?: Maybe<Scalars['String']['output']>;
  /** The difference between the fund inflow and outflow, representing the net amount of storage fees accumulated in this epoch (or `null` if the epoch has not finished yet). */
  netInflow?: Maybe<Scalars['BigInt']['output']>;
  /** The epoch's corresponding protocol configuration, including the feature flags and the configuration options. */
  protocolConfigs?: Maybe<ProtocolConfigs>;
  /** The minimum gas price that a quorum of validators are guaranteed to sign a transaction for in this epoch. */
  referenceGasPrice?: Maybe<Scalars['BigInt']['output']>;
  /** Information about whether this epoch was started in safe mode, which happens if the full epoch change logic fails. */
  safeMode?: Maybe<SafeMode>;
  /** The timestamp associated with the first checkpoint in the epoch. */
  startTimestamp?: Maybe<Scalars['DateTime']['output']>;
  /**
   * SUI set aside to account for objects stored on-chain, at the start of the epoch.
   * This is also used for storage rebates.
   */
  storageFund?: Maybe<StorageFund>;
  /** The system packages used by all transactions in this epoch. */
  systemPackages?: Maybe<MovePackageConnection>;
  /** Details of the system that are decided during genesis. */
  systemParameters?: Maybe<SystemParameters>;
  /** Parameters related to the subsidy that supplements staking rewards */
  systemStakeSubsidy?: Maybe<StakeSubsidy>;
  /**
   * The value of the `version` field of `0x5`, the `0x3::sui::SuiSystemState` object.
   * This version changes whenever the fields contained in the system state object (held in a dynamic field attached to `0x5`) change.
   */
  systemStateVersion?: Maybe<Scalars['UInt53']['output']>;
  /**
   * The total number of checkpoints in this epoch.
   *
   * Returns `None` when no checkpoint is set in scope (e.g. execution scope).
   */
  totalCheckpoints?: Maybe<Scalars['UInt53']['output']>;
  /** The total amount of gas fees (in MIST) that were paid in this epoch (or `null` if the epoch has not finished yet). */
  totalGasFees?: Maybe<Scalars['BigInt']['output']>;
  /** The total MIST rewarded as stake (or `null` if the epoch has not finished yet). */
  totalStakeRewards?: Maybe<Scalars['BigInt']['output']>;
  /** The amount added to total gas fees to make up the total stake rewards (or `null` if the epoch has not finished yet). */
  totalStakeSubsidies?: Maybe<Scalars['BigInt']['output']>;
  /** The total number of transaction blocks in this epoch (or `null` if the epoch has not finished yet). */
  totalTransactions?: Maybe<Scalars['UInt53']['output']>;
  /**
   * The transactions in this epoch, optionally filtered by transaction filters.
   *
   * Returns `None` when no checkpoint is set in scope (e.g. execution scope).
   */
  transactions?: Maybe<TransactionConnection>;
  /** Validator-related properties, including the active validators. */
  validatorSet?: Maybe<ValidatorSet>;
};


/**
 * Activity on Sui is partitioned in time, into epochs.
 *
 * Epoch changes are opportunities for the network to reconfigure itself (perform protocol or system package upgrades, or change the committee) and distribute staking rewards. The network aims to keep epochs roughly the same duration as each other.
 *
 * During a particular epoch the following data is fixed:
 *
 * - protocol version,
 * - reference gas price,
 * - system package versions,
 * - validators in the committee.
 */
export type EpochCheckpointsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CheckpointFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Activity on Sui is partitioned in time, into epochs.
 *
 * Epoch changes are opportunities for the network to reconfigure itself (perform protocol or system package upgrades, or change the committee) and distribute staking rewards. The network aims to keep epochs roughly the same duration as each other.
 *
 * During a particular epoch the following data is fixed:
 *
 * - protocol version,
 * - reference gas price,
 * - system package versions,
 * - validators in the committee.
 */
export type EpochSystemPackagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Activity on Sui is partitioned in time, into epochs.
 *
 * Epoch changes are opportunities for the network to reconfigure itself (perform protocol or system package upgrades, or change the committee) and distribute staking rewards. The network aims to keep epochs roughly the same duration as each other.
 *
 * During a particular epoch the following data is fixed:
 *
 * - protocol version,
 * - reference gas price,
 * - system package versions,
 * - validators in the committee.
 */
export type EpochTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type EpochConnection = {
  __typename?: 'EpochConnection';
  /** A list of edges. */
  edges: Array<EpochEdge>;
  /** A list of nodes. */
  nodes: Array<Epoch>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type EpochEdge = {
  __typename?: 'EpochEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Epoch;
};

export type Event = {
  __typename?: 'Event';
  /** The Move value emitted for this event. */
  contents?: Maybe<MoveValue>;
  /**
   * The Base64 encoded BCS serialized bytes of the entire Event structure from sui-types.
   * This includes: package_id, transaction_module, sender, type, and contents (which itself contains the BCS-serialized Move struct data).
   */
  eventBcs?: Maybe<Scalars['Base64']['output']>;
  /** Address of the sender of the transaction that emitted this event. */
  sender?: Maybe<Address>;
  /** The position of the event among the events from the same transaction. */
  sequenceNumber: Scalars['UInt53']['output'];
  /**
   * Timestamp corresponding to the checkpoint this event's transaction was finalized in.
   * All events from the same transaction share the same timestamp.
   */
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  /** The transaction that emitted this event. This information is only available for events from indexed transactions, and not from transactions that have just been executed or dry-run. */
  transaction?: Maybe<Transaction>;
  /** The module containing the function that was called in the programmable transaction, that resulted in this event being emitted. */
  transactionModule?: Maybe<MoveModule>;
};

export type EventConnection = {
  __typename?: 'EventConnection';
  /** A list of edges. */
  edges: Array<EventEdge>;
  /** A list of nodes. */
  nodes: Array<Event>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type EventEdge = {
  __typename?: 'EventEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Event;
};

export type EventFilter = {
  /** Limit to events that occured strictly after the given checkpoint. */
  afterCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit to events in the given checkpoint. */
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit to event that occured strictly before the given checkpoint. */
  beforeCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /**
   * Events emitted by a particular module. An event is emitted by a particular module if some function in the module is called by a PTB and emits an event.
   *
   * Modules can be filtered by their package, or package::module. We currently do not support filtering by emitting module and event type at the same time so if both are provided in one filter, the query will error.
   */
  module?: InputMaybe<Scalars['String']['input']>;
  /** Filter on events by transaction sender address. */
  sender?: InputMaybe<Scalars['SuiAddress']['input']>;
  /**
   * This field is used to specify the type of event emitted.
   *
   * Events can be filtered by their type's package, package::module, or their fully qualified type name.
   *
   * Generic types can be queried by either the generic type name, e.g. `0x2::coin::Coin`, or by the full type name, such as `0x2::coin::Coin<0x2::sui::SUI>`.
   */
  type?: InputMaybe<Scalars['String']['input']>;
};

/** Represents execution error information for failed transactions. */
export type ExecutionError = {
  __typename?: 'ExecutionError';
  /**
   * The error code of the Move abort, populated if this transaction failed with a Move abort.
   *
   * Returns the explicit code if the abort used `code` annotation (e.g., `abort(ERR, code = 5)` returns 5), otherwise returns the raw abort code containing encoded error information.
   */
  abortCode?: Maybe<Scalars['BigInt']['output']>;
  /**
   * An associated constant for the error. Only populated for clever errors.
   *
   * Constants are returned as human-readable strings when possible. Complex types are returned as Base64-encoded bytes.
   */
  constant?: Maybe<Scalars['String']['output']>;
  /** The function that the abort originated from. Only populated for Move aborts and primitive runtime errors that have function name information. */
  function?: Maybe<MoveFunction>;
  /** The error's name. Only populated for clever errors. */
  identifier?: Maybe<Scalars['String']['output']>;
  /** The instruction offset in the Move bytecode where the error occurred. Populated for Move aborts and primitive runtime errors. */
  instructionOffset?: Maybe<Scalars['Int']['output']>;
  /**
   * Human readable explanation of why the transaction failed.
   *
   * For Move aborts, the error message will be resolved to a human-readable form if possible, otherwise it will fall back to displaying the abort code and location.
   */
  message: Scalars['String']['output'];
  /** The module that the abort originated from. Only populated for Move aborts and primitive runtime errors. */
  module?: Maybe<MoveModule>;
  /** The source line number for the abort. Only populated for clever errors. */
  sourceLineNumber?: Maybe<Scalars['Int']['output']>;
};

/** The execution result of a transaction, including the transaction effects and any potential errors due to signing or quorum-driving. */
export type ExecutionResult = {
  __typename?: 'ExecutionResult';
  /** The effects of the transaction execution, if successful. */
  effects?: Maybe<TransactionEffects>;
  /**
   * Errors that occurred during execution (e.g., network errors, validation failures).
   * These are distinct from execution failures within the transaction itself.
   */
  errors?: Maybe<Array<Scalars['String']['output']>>;
};

/** The execution status of this transaction: success or failure. */
export enum ExecutionStatus {
  /** The transaction could not be executed. */
  Failure = 'FAILURE',
  /** The transaction was successfully executed. */
  Success = 'SUCCESS'
}

/** A boolean protocol configuration. */
export type FeatureFlag = {
  __typename?: 'FeatureFlag';
  /** Feature flag name. */
  key: Scalars['String']['output'];
  /** Feature flag value. */
  value: Scalars['Boolean']['output'];
};

/** Access to the gas inputs, after they have been smashed into one coin. The gas coin can only be used by reference, except for with `TransferObjectsTransaction` that can accept it by value. */
export type GasCoin = {
  __typename?: 'GasCoin';
  /** Placeholder field (gas coin has no additional data) */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Summary of charges from transactions.
 *
 * Storage is charged in three parts -- `storage_cost`, `-storage_rebate`, and `non_refundable_storage_fee` -- independently of `computation_cost`.
 *
 * The overall cost of a transaction, deducted from its gas coins, is its `computation_cost + storage_cost - storage_rebate`. `non_refundable_storage_fee` is collected from objects being mutated or deleted and accumulated by the system in storage funds, the remaining storage costs of previous object versions are what become the `storage_rebate`. The ratio between `non_refundable_storage_fee` and `storage_rebate` is set by the protocol.
 */
export type GasCostSummary = {
  __typename?: 'GasCostSummary';
  /** The sum cost of computation/execution */
  computationCost?: Maybe<Scalars['UInt53']['output']>;
  /** Amount that is retained by the system in the storage fund from the cost of the previous versions of objects being mutated or deleted. */
  nonRefundableStorageFee?: Maybe<Scalars['UInt53']['output']>;
  /** Cost for storage at the time the transaction is executed, calculated as the size of the objects being mutated in bytes multiplied by a storage cost per byte (part of the protocol). */
  storageCost?: Maybe<Scalars['UInt53']['output']>;
  /** Amount the user gets back from the storage cost of the previous versions of objects being mutated or deleted. */
  storageRebate?: Maybe<Scalars['UInt53']['output']>;
};

/** Effects related to gas (costs incurred and the identity of the smashed gas object returned). */
export type GasEffects = {
  __typename?: 'GasEffects';
  /** The gas object used to pay for this transaction. If multiple gas coins were provided, this represents the combined coin after smashing. */
  gasObject?: Maybe<Object>;
  /** Breakdown of the gas costs for this transaction. */
  gasSummary?: Maybe<GasCostSummary>;
};

export type GasInput = {
  __typename?: 'GasInput';
  /** The maximum SUI that can be expended by executing this transaction */
  gasBudget?: Maybe<Scalars['BigInt']['output']>;
  /** Objects used to pay for a transaction's execution and storage */
  gasPayment?: Maybe<ObjectConnection>;
  /** An unsigned integer specifying the number of native tokens per gas unit this transaction will pay (in MIST). */
  gasPrice?: Maybe<Scalars['BigInt']['output']>;
  /** Address of the owner of the gas object(s) used. */
  gasSponsor?: Maybe<Address>;
};


export type GasInputGasPaymentArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** System transaction that initializes the network and writes the initial set of objects on-chain. */
export type GenesisTransaction = {
  __typename?: 'GenesisTransaction';
  /** Objects to be created during genesis. */
  objects?: Maybe<ObjectConnection>;
};


/** System transaction that initializes the network and writes the initial set of objects on-chain. */
export type GenesisTransactionObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Interface implemented by GraphQL types representing entities that are identified by an address.
 *
 * An address uniquely represents either the public key of an account, or an object's ID, but never both. It is not possible to determine which type an address represents up-front. If an object is wrapped, its contents will not be accessible via its address, but it will still be possible to access other objects it owns.
 */
export type IAddressable = {
  address: Scalars['SuiAddress']['output'];
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * Returns `null` when no checkpoint is set in scope (e.g. execution scope). If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /** Objects owned by this address, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
};


/**
 * Interface implemented by GraphQL types representing entities that are identified by an address.
 *
 * An address uniquely represents either the public key of an account, or an object's ID, but never both. It is not possible to determine which type an address represents up-front. If an object is wrapped, its contents will not be accessible via its address, but it will still be possible to access other objects it owns.
 */
export type IAddressableBalanceArgs = {
  coinType: Scalars['String']['input'];
};


/**
 * Interface implemented by GraphQL types representing entities that are identified by an address.
 *
 * An address uniquely represents either the public key of an account, or an object's ID, but never both. It is not possible to determine which type an address represents up-front. If an object is wrapped, its contents will not be accessible via its address, but it will still be possible to access other objects it owns.
 */
export type IAddressableBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that are identified by an address.
 *
 * An address uniquely represents either the public key of an account, or an object's ID, but never both. It is not possible to determine which type an address represents up-front. If an object is wrapped, its contents will not be accessible via its address, but it will still be possible to access other objects it owns.
 */
export type IAddressableMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that are identified by an address.
 *
 * An address uniquely represents either the public key of an account, or an object's ID, but never both. It is not possible to determine which type an address represents up-front. If an object is wrapped, its contents will not be accessible via its address, but it will still be possible to access other objects it owns.
 */
export type IAddressableObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Interface implemented by all GraphQL types that represent a Move datatype definition (either a struct or an enum definition).
 *
 * This interface is used to provide a way to access fields that are shared by both structs and enums, e.g., the module that the datatype belongs to, the name of the datatype, type parameters etc.
 */
export type IMoveDatatype = {
  /** Abilities on this datatype definition. */
  abilities?: Maybe<Array<MoveAbility>>;
  /** The module that this datatype is defined in */
  module: MoveModule;
  /** The datatype's unqualified name */
  name: Scalars['String']['output'];
  /**
   * Constraints on the datatype's formal type parameters
   *
   * Move bytecode does not name type parameters, so when they are referenced (e.g. in field types), they are identified by their index in this list.
   */
  typeParameters?: Maybe<Array<MoveDatatypeTypeParameter>>;
};

/** Interface implemented by types that represent a Move object on-chain (A Move value whose type has `key`). */
export type IMoveObject = {
  /** The structured representation of the object's contents. */
  contents?: Maybe<MoveValue>;
  /**
   * Access a dynamic field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic field with that name could not be found attached to this object.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * Dynamic fields and dynamic object fields owned by this object.
   *
   * Dynamic fields on wrapped objects can be accessed using `Address.dynamicFields`.
   */
  dynamicFields?: Maybe<DynamicFieldConnection>;
  /**
   * Access a dynamic object field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic object field with that name could not be found attached to this object.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Whether this object can be transfered using the `TransferObjects` Programmable Transaction Command or `sui::transfer::public_transfer`.
   *
   * Both these operations require the object to have both the `key` and `store` abilities.
   */
  hasPublicTransfer?: Maybe<Scalars['Boolean']['output']>;
  /** The Base64-encoded BCS serialize of this object, as a `MoveObject`. */
  moveObjectBcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * Access dynamic fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic fields that is guaranteed to be the same length as `keys`. If a dynamic field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicFields: Array<Maybe<DynamicField>>;
  /**
   * Access dynamic object fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic object fields that is guaranteed to be the same length as `keys`. If a dynamic object field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicObjectFields: Array<Maybe<DynamicField>>;
};


/** Interface implemented by types that represent a Move object on-chain (A Move value whose type has `key`). */
export type IMoveObjectDynamicFieldArgs = {
  name: DynamicFieldName;
};


/** Interface implemented by types that represent a Move object on-chain (A Move value whose type has `key`). */
export type IMoveObjectDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Interface implemented by types that represent a Move object on-chain (A Move value whose type has `key`). */
export type IMoveObjectDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/** Interface implemented by types that represent a Move object on-chain (A Move value whose type has `key`). */
export type IMoveObjectMultiGetDynamicFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/** Interface implemented by types that represent a Move object on-chain (A Move value whose type has `key`). */
export type IMoveObjectMultiGetDynamicObjectFieldsArgs = {
  keys: Array<DynamicFieldName>;
};

/** Interface implemented by versioned on-chain values that are addressable by an ID (also referred to as its address). This includes Move objects and packages. */
export type IObject = {
  /** 32-byte hash that identifies the object's contents, encoded in Base58. */
  digest?: Maybe<Scalars['String']['output']>;
  /** Fetch the object with the same ID, at a different version, root version bound, or checkpoint. */
  objectAt?: Maybe<Object>;
  /** The Base64-encoded BCS serialization of this object, as an `Object`. */
  objectBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this object after this one. */
  objectVersionsAfter?: Maybe<ObjectConnection>;
  /** Paginate all versions of this object before this one. */
  objectVersionsBefore?: Maybe<ObjectConnection>;
  /** The object's owner kind. */
  owner?: Maybe<Owner>;
  /** The transaction that created this version of the object */
  previousTransaction?: Maybe<Transaction>;
  /** The transactions that sent objects to this object. */
  receivedTransactions?: Maybe<TransactionConnection>;
  /** The SUI returned to the sponsor or sender of the transaction that modifies or deletes this object. */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /** The version of this object that this content comes from. */
  version?: Maybe<Scalars['UInt53']['output']>;
};


/** Interface implemented by versioned on-chain values that are addressable by an ID (also referred to as its address). This includes Move objects and packages. */
export type IObjectObjectAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/** Interface implemented by versioned on-chain values that are addressable by an ID (also referred to as its address). This includes Move objects and packages. */
export type IObjectObjectVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Interface implemented by versioned on-chain values that are addressable by an ID (also referred to as its address). This includes Move objects and packages. */
export type IObjectObjectVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Interface implemented by versioned on-chain values that are addressable by an ID (also referred to as its address). This includes Move objects and packages. */
export type IObjectReceivedTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Object is accessible to all addresses, and is immutable. */
export type Immutable = {
  __typename?: 'Immutable';
  _?: Maybe<Scalars['Boolean']['output']>;
};

export type Input = {
  __typename?: 'Input';
  /** The index of the input. */
  ix?: Maybe<Scalars['Int']['output']>;
};

/** Information used by a package to link to a specific version of its dependency. */
export type Linkage = {
  __typename?: 'Linkage';
  /** The ID on-chain of the first version of the dependency. */
  originalId?: Maybe<Scalars['SuiAddress']['output']>;
  /** The ID on-chain of the version of the dependency that this package depends on. */
  upgradedId?: Maybe<Scalars['SuiAddress']['output']>;
  /** The version of the dependency that this package depends on. */
  version?: Maybe<Scalars['UInt53']['output']>;
};

/** Create a vector (can be empty). */
export type MakeMoveVecCommand = {
  __typename?: 'MakeMoveVecCommand';
  /** The values to pack into the vector, all of the same type. */
  elements?: Maybe<Array<TransactionArgument>>;
  /** If the elements are not objects, or the vector is empty, a type must be supplied. */
  type?: Maybe<MoveType>;
};

/** Merges `coins` into the first `coin` (produces no results). */
export type MergeCoinsCommand = {
  __typename?: 'MergeCoinsCommand';
  /** The coin to merge into. */
  coin?: Maybe<TransactionArgument>;
  /** The coins to be merged. */
  coins: Array<TransactionArgument>;
};

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

export type MoveCallCommand = {
  __typename?: 'MoveCallCommand';
  /** The actual function parameters passed in for this move call. */
  arguments: Array<TransactionArgument>;
  /** The function being called. */
  function: MoveFunction;
};

/** Description of a datatype, defined in a Move module. */
export type MoveDatatype = IMoveDatatype & {
  __typename?: 'MoveDatatype';
  /** Abilities on this datatype definition. */
  abilities?: Maybe<Array<MoveAbility>>;
  /** Attempts to convert the `MoveDatatype` to a `MoveEnum`. */
  asMoveEnum?: Maybe<MoveEnum>;
  /** Attempts to convert the `MoveDatatype` to a `MoveStruct`. */
  asMoveStruct?: Maybe<MoveStruct>;
  /** The module that this datatype is defined in. */
  module: MoveModule;
  /** The datatype's unqualified name. */
  name: Scalars['String']['output'];
  /**
   * Constraints on the datatype's formal type parameters.
   *
   * Move bytecode does not name type parameters, so when they are referenced (e.g. in field types), they are identified by their index in this list.
   */
  typeParameters?: Maybe<Array<MoveDatatypeTypeParameter>>;
};

export type MoveDatatypeConnection = {
  __typename?: 'MoveDatatypeConnection';
  /** A list of edges. */
  edges: Array<MoveDatatypeEdge>;
  /** A list of nodes. */
  nodes: Array<MoveDatatype>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MoveDatatypeEdge = {
  __typename?: 'MoveDatatypeEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MoveDatatype;
};

/** Declaration of a type parameter on a Move struct. */
export type MoveDatatypeTypeParameter = {
  __typename?: 'MoveDatatypeTypeParameter';
  /** Ability constraints on this type parameter. */
  constraints: Array<MoveAbility>;
  /**
   * Whether this type parameter is marked `phantom` or not.
   *
   * Phantom type parameters are not referenced in the struct's fields.
   */
  isPhantom: Scalars['Boolean']['output'];
};

/** Description of an enum type, defined in a Move module. */
export type MoveEnum = IMoveDatatype & {
  __typename?: 'MoveEnum';
  /** Abilities on this enum definition. */
  abilities?: Maybe<Array<MoveAbility>>;
  /** The module that this enum is defined in. */
  module: MoveModule;
  /** The enum's unqualified name. */
  name: Scalars['String']['output'];
  /**
   * Constraints on the enum's formal type parameters.
   *
   * Move bytecode does not name type parameters, so when they are referenced (e.g. in field types), they are identified by their index in this list.
   */
  typeParameters?: Maybe<Array<MoveDatatypeTypeParameter>>;
  /**
   * The names and fields of the enum's variants
   *
   * Field types reference type parameters by their index in the defining enum's `typeParameters` list.
   */
  variants?: Maybe<Array<MoveEnumVariant>>;
};

export type MoveEnumConnection = {
  __typename?: 'MoveEnumConnection';
  /** A list of edges. */
  edges: Array<MoveEnumEdge>;
  /** A list of nodes. */
  nodes: Array<MoveEnum>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MoveEnumEdge = {
  __typename?: 'MoveEnumEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MoveEnum;
};

export type MoveEnumVariant = {
  __typename?: 'MoveEnumVariant';
  /**
   * The names and types of the variant's fields.
   *
   * Field types reference type parameters by their index in the defining struct's `typeParameters` list.
   */
  fields?: Maybe<Array<MoveField>>;
  /** The variant's name. */
  name?: Maybe<Scalars['String']['output']>;
};

export type MoveField = {
  __typename?: 'MoveField';
  /** The field's name. */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * The field's type.
   *
   * This type can reference type parameters introduced by the defining struct (see `typeParameters`).
   */
  type?: Maybe<OpenMoveType>;
};

/** A function defined in a Move module. */
export type MoveFunction = {
  __typename?: 'MoveFunction';
  /** Whether the function is marked `entry` or not. */
  isEntry?: Maybe<Scalars['Boolean']['output']>;
  /** The module that this function is defined in. */
  module: MoveModule;
  /** The function's unqualified name. */
  name: Scalars['String']['output'];
  /** The function's parameter types. These types can reference type parameters introduced by this function (see `typeParameters`). */
  parameters?: Maybe<Array<OpenMoveType>>;
  /** The function's return types. There can be multiple because functions in Move can return multiple values. These types can reference type parameters introduced by this function (see `typeParameters`). */
  return?: Maybe<Array<OpenMoveType>>;
  /**
   * Constraints on the function's formal type parameters.
   *
   * Move bytecode does not name type parameters, so when they are referenced (e.g. in parameter and return types), they are identified by their index in this list.
   */
  typeParameters?: Maybe<Array<MoveFunctionTypeParameter>>;
  /** The function's visibility: `public`, `public(friend)`, or `private`. */
  visibility?: Maybe<MoveVisibility>;
};

export type MoveFunctionConnection = {
  __typename?: 'MoveFunctionConnection';
  /** A list of edges. */
  edges: Array<MoveFunctionEdge>;
  /** A list of nodes. */
  nodes: Array<MoveFunction>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MoveFunctionEdge = {
  __typename?: 'MoveFunctionEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MoveFunction;
};

/** Declaration of a type parameter on a Move function. */
export type MoveFunctionTypeParameter = {
  __typename?: 'MoveFunctionTypeParameter';
  /** Ability constraints on this type parameter. */
  constraints: Array<MoveAbility>;
};

/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModule = {
  __typename?: 'MoveModule';
  /** Base64 encoded bytes of the serialized CompiledModule. */
  bytes?: Maybe<Scalars['Base64']['output']>;
  /** The datatype (struct or enum) named `name` in this module. */
  datatype?: Maybe<MoveDatatype>;
  /** Paginate through this module's datatype definitions. */
  datatypes?: Maybe<MoveDatatypeConnection>;
  /** Textual representation of the module's bytecode. */
  disassembly?: Maybe<Scalars['String']['output']>;
  /** The enum named `name` in this module. */
  enum?: Maybe<MoveEnum>;
  /** Paginate through this module's enum definitions. */
  enums?: Maybe<MoveEnumConnection>;
  /** Bytecode format version. */
  fileFormatVersion?: Maybe<Scalars['Int']['output']>;
  /** Modules that this module considers friends. These modules can call `public(package)` functions in this module. */
  friends?: Maybe<MoveModuleConnection>;
  /** The function named `name` in this module. */
  function?: Maybe<MoveFunction>;
  /** Paginate through this module's function definitions. */
  functions?: Maybe<MoveFunctionConnection>;
  /** The module's unqualified name. */
  name: Scalars['String']['output'];
  /** The package that this module was defined in. */
  package?: Maybe<MovePackage>;
  /** The struct named `name` in this module. */
  struct?: Maybe<MoveStruct>;
  /** Paginate through this module's struct definitions. */
  structs?: Maybe<MoveStructConnection>;
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleDatatypeArgs = {
  name: Scalars['String']['input'];
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleDatatypesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleEnumArgs = {
  name: Scalars['String']['input'];
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleEnumsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleFriendsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleFunctionArgs = {
  name: Scalars['String']['input'];
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleFunctionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleStructArgs = {
  name: Scalars['String']['input'];
};


/**
 * Modules are a unit of code organization in Move.
 *
 * Modules belong to packages, and contain type and function definitions.
 */
export type MoveModuleStructsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type MoveModuleConnection = {
  __typename?: 'MoveModuleConnection';
  /** A list of edges. */
  edges: Array<MoveModuleEdge>;
  /** A list of nodes. */
  nodes: Array<MoveModule>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MoveModuleEdge = {
  __typename?: 'MoveModuleEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MoveModule;
};

/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObject = IAddressable & IMoveObject & IObject & {
  __typename?: 'MoveObject';
  /** The MoveObject's ID. */
  address: Scalars['SuiAddress']['output'];
  /** Attempts to convert the object into a CoinMetadata. */
  asCoinMetadata?: Maybe<CoinMetadata>;
  /** Attempts to convert the object into a DynamicField. */
  asDynamicField?: Maybe<DynamicField>;
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The structured representation of the object's contents. */
  contents?: Maybe<MoveValue>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded in Base58. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * Access a dynamic field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic field with that name could not be found attached to this object.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * Dynamic fields owned by this object.
   *
   * Dynamic fields on wrapped objects can be accessed using `Address.dynamicFields`.
   */
  dynamicFields?: Maybe<DynamicFieldConnection>;
  /**
   * Access a dynamic object field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic object field with that name could not be found attached to this object.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Whether this object can be transfered using the `TransferObjects` Programmable Transaction Command or `sui::transfer::public_transfer`.
   *
   * Both these operations require the object to have both the `key` and `store` abilities.
   */
  hasPublicTransfer?: Maybe<Scalars['Boolean']['output']>;
  /** The Base64-encoded BCS serialize of this object, as a `MoveObject`. */
  moveObjectBcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /**
   * Access dynamic fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic fields that is guaranteed to be the same length as `keys`. If a dynamic field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicFields: Array<Maybe<DynamicField>>;
  /**
   * Access dynamic object fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic object fields that is guaranteed to be the same length as `keys`. If a dynamic object field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicObjectFields: Array<Maybe<DynamicField>>;
  /**
   * Fetch the object with the same ID, at a different version, root version bound, or checkpoint.
   *
   * If no additional bound is provided, the latest version of this object is fetched at the latest checkpoint.
   */
  objectAt?: Maybe<Object>;
  /** The Base64-encoded BCS serialization of this object, as an `Object`. */
  objectBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this object after this one. */
  objectVersionsAfter?: Maybe<ObjectConnection>;
  /** Paginate all versions of this object before this one. */
  objectVersionsBefore?: Maybe<ObjectConnection>;
  /** Objects owned by this object, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /** The object's owner kind. */
  owner?: Maybe<Owner>;
  /** The transaction that created this version of the object. */
  previousTransaction?: Maybe<Transaction>;
  /** The transactions that sent objects to this object. */
  receivedTransactions?: Maybe<TransactionConnection>;
  /** The SUI returned to the sponsor or sender of the transaction that modifies or deletes this object. */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /** The version of this object that this content comes from. */
  version?: Maybe<Scalars['UInt53']['output']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectBalanceArgs = {
  coinType: Scalars['String']['input'];
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectDynamicFieldArgs = {
  name: DynamicFieldName;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectMultiGetDynamicFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectMultiGetDynamicObjectFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectObjectAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectObjectVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectObjectVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MoveObject is a kind of Object that reprsents data stored on-chain. */
export type MoveObjectReceivedTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type MoveObjectConnection = {
  __typename?: 'MoveObjectConnection';
  /** A list of edges. */
  edges: Array<MoveObjectEdge>;
  /** A list of nodes. */
  nodes: Array<MoveObject>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MoveObjectEdge = {
  __typename?: 'MoveObjectEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MoveObject;
};

/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackage = IAddressable & IObject & {
  __typename?: 'MovePackage';
  /** The MovePackage's ID. */
  address: Scalars['SuiAddress']['output'];
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the package's contents, encoded in Base58. */
  digest?: Maybe<Scalars['String']['output']>;
  /** The transitive dependencies of this package. */
  linkage?: Maybe<Array<Linkage>>;
  /** The module named `name` in this package. */
  module?: Maybe<MoveModule>;
  /** BCS representation of the package's modules.  Modules appear as a sequence of pairs (module name, followed by module bytes), in alphabetic order by module name. */
  moduleBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate through this package's modules. */
  modules?: Maybe<MoveModuleConnection>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /**
   * Fetch the package as an object with the same ID, at a different version, root version bound, or checkpoint.
   *
   * If no additional bound is provided, the latest version of this object is fetched at the latest checkpoint.
   */
  objectAt?: Maybe<Object>;
  /** The Base64-encoded BCS serialization of this package, as an `Object`. */
  objectBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this package treated as an object, after this one. */
  objectVersionsAfter?: Maybe<ObjectConnection>;
  /** Paginate all versions of this package treated as an object, before this one. */
  objectVersionsBefore?: Maybe<ObjectConnection>;
  /** Objects owned by this package, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /** The object's owner kind. */
  owner?: Maybe<Owner>;
  /**
   * Fetch the package with the same original ID, at a different version, root version bound, or checkpoint.
   *
   * If no additional bound is provided, the latest version of this package is fetched at the latest checkpoint.
   */
  packageAt?: Maybe<MovePackage>;
  /** The Base64-encoded BCS serialization of this package, as a `MovePackage`. */
  packageBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this package after this one. */
  packageVersionsAfter?: Maybe<MovePackageConnection>;
  /** Paginate all versions of this package before this one. */
  packageVersionsBefore?: Maybe<MovePackageConnection>;
  /** The transaction that created this version of the object. */
  previousTransaction?: Maybe<Transaction>;
  /** The transactions that sent objects to this object. */
  receivedTransactions?: Maybe<TransactionConnection>;
  /** The SUI returned to the sponsor or sender of the transaction that modifies or deletes this object. */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /** A table identifying which versions of a package introduced each of its types. */
  typeOrigins?: Maybe<Array<TypeOrigin>>;
  /** The version of this package that this content comes from. */
  version?: Maybe<Scalars['UInt53']['output']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageBalanceArgs = {
  coinType: Scalars['String']['input'];
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageModuleArgs = {
  name: Scalars['String']['input'];
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageModulesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageObjectAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageObjectVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageObjectVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackagePackageAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackagePackageVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackagePackageVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A MovePackage is a kind of Object that represents code that has been published on-chain. It exposes information about its modules, type definitions, functions, and dependencies. */
export type MovePackageReceivedTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type MovePackageConnection = {
  __typename?: 'MovePackageConnection';
  /** A list of edges. */
  edges: Array<MovePackageEdge>;
  /** A list of nodes. */
  nodes: Array<MovePackage>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MovePackageEdge = {
  __typename?: 'MovePackageEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MovePackage;
};

/** Description of a struct type, defined in a Move module. */
export type MoveStruct = IMoveDatatype & {
  __typename?: 'MoveStruct';
  /** Abilities on this struct definition. */
  abilities?: Maybe<Array<MoveAbility>>;
  /**
   * The names and types of the struct's fields.
   *
   * Field types reference type parameters by their index in the defining struct's `typeParameters` list.
   */
  fields?: Maybe<Array<MoveField>>;
  /** The module that this struct is defined in. */
  module: MoveModule;
  /** The struct's unqualified name. */
  name: Scalars['String']['output'];
  /**
   * Constraints on the struct's formal type parameters.
   *
   * Move bytecode does not name type parameters, so when they are referenced (e.g. in field types), they are identified by their index in this list.
   */
  typeParameters?: Maybe<Array<MoveDatatypeTypeParameter>>;
};

export type MoveStructConnection = {
  __typename?: 'MoveStructConnection';
  /** A list of edges. */
  edges: Array<MoveStructEdge>;
  /** A list of nodes. */
  nodes: Array<MoveStruct>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type MoveStructEdge = {
  __typename?: 'MoveStructEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: MoveStruct;
};

/** Represents instances of concrete types (no type parameters, no references). */
export type MoveType = {
  __typename?: 'MoveType';
  /** The abilities this concrete type has. Returns no abilities if the type is invalid. */
  abilities?: Maybe<Array<MoveAbility>>;
  /**
   * Structured representation of the "shape" of values that match this type. May return no
   * layout if the type is invalid.
   */
  layout?: Maybe<Scalars['MoveTypeLayout']['output']>;
  /** Flat representation of the type signature, as a displayable string. */
  repr: Scalars['String']['output'];
  /** Structured representation of the type signature. */
  signature: Scalars['MoveTypeSignature']['output'];
};

export type MoveValue = {
  __typename?: 'MoveValue';
  /** The BCS representation of this value, Base64-encoded. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * A rendered JSON blob based on an on-chain template, substituted with data from this value.
   *
   * Returns `null` if the value's type does not have an associated `Display` template.
   */
  display?: Maybe<Display>;
  /**
   * Representation of a Move value in JSON, where:
   *
   * - Addresses, IDs, and UIDs are represented in canonical form, as JSON strings.
   * - Bools are represented by JSON boolean literals.
   * - u8, u16, and u32 are represented as JSON numbers.
   * - u64, u128, and u256 are represented as JSON strings.
   * - Balances, Strings, and Urls are represented as JSON strings.
   * - Vectors of bytes are represented as Base64 blobs, and other vectors are represented by JSON arrays.
   * - Structs are represented by JSON objects.
   * - Enums are represented by JSON objects, with a field named `@variant` containing the variant name.
   * - Empty optional values are represented by `null`.
   */
  json?: Maybe<Scalars['JSON']['output']>;
  /** The value's type. */
  type?: Maybe<MoveType>;
};

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

/** A transaction that wanted to mutate a consensus-managed object but couldn't because it became not-consensus-managed before the transaction executed (for example, it was deleted, turned into an owned object, or wrapped). */
export type MutateConsensusStreamEnded = {
  __typename?: 'MutateConsensusStreamEnded';
  /** The ID of the consensus-managed object. */
  address?: Maybe<Scalars['SuiAddress']['output']>;
  /** The sequence number associated with the consensus stream ending. */
  sequenceNumber?: Maybe<Scalars['UInt53']['output']>;
};

/** Mutations are used to write to the Sui network. */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Execute a transaction, committing its effects on chain.
   *
   * - `transactionDataBcs` contains the BCS-encoded transaction data (Base64-encoded).
   * - `signatures` are a list of `flag || signature || pubkey` bytes, Base64-encoded.
   *
   * Waits until the transaction has reached finality on chain to return its transaction digest, or returns the error that prevented finality if that was not possible. A transaction is final when its effects are guaranteed on chain (it cannot be revoked).
   *
   * There may be a delay between transaction finality and when GraphQL requests (including the request that issued the transaction) reflect its effects. As a result, queries that depend on indexing the state of the chain (e.g. contents of output objects, address-level balance information at the time of the transaction), must wait for indexing to catch up by polling for the transaction digest using `Query.transaction`.
   */
  executeTransaction: ExecutionResult;
};


/** Mutations are used to write to the Sui network. */
export type MutationExecuteTransactionArgs = {
  signatures: Array<Scalars['Base64']['input']>;
  transactionDataBcs: Scalars['Base64']['input'];
};

/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type Object = IAddressable & IObject & {
  __typename?: 'Object';
  /** The Object's ID. */
  address: Scalars['SuiAddress']['output'];
  /** Attempts to convert the object into a MoveObject. */
  asMoveObject?: Maybe<MoveObject>;
  /** Attempts to convert the object into a MovePackage. */
  asMovePackage?: Maybe<MovePackage>;
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded in Base58. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * Access a dynamic field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic field with that name could not be found attached to this object.
   */
  dynamicField?: Maybe<DynamicField>;
  /** Dynamic fields owned by this object. */
  dynamicFields?: Maybe<DynamicFieldConnection>;
  /**
   * Access a dynamic object field on an object using its type and BCS-encoded name.
   *
   * Returns `null` if a dynamic object field with that name could not be found attached to this object.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * Returns `None` when no checkpoint is set in scope (e.g. execution scope).
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /**
   * Access dynamic fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic fields that is guaranteed to be the same length as `keys`. If a dynamic field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicFields: Array<Maybe<DynamicField>>;
  /**
   * Access dynamic object fields on an object using their types and BCS-encoded names.
   *
   * Returns a list of dynamic object fields that is guaranteed to be the same length as `keys`. If a dynamic object field in `keys` could not be found in the store, its corresponding entry in the result will be `null`.
   */
  multiGetDynamicObjectFields: Array<Maybe<DynamicField>>;
  /**
   * Fetch the object with the same ID, at a different version, root version bound, or checkpoint.
   *
   * If no additional bound is provided, the latest version of this object is fetched at the latest checkpoint.
   */
  objectAt?: Maybe<Object>;
  /** The Base64-encoded BCS serialization of this object, as an `Object`. */
  objectBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate all versions of this object after this one. */
  objectVersionsAfter?: Maybe<ObjectConnection>;
  /** Paginate all versions of this object before this one. */
  objectVersionsBefore?: Maybe<ObjectConnection>;
  /** Objects owned by this object, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /** The object's owner kind. */
  owner?: Maybe<Owner>;
  /** The transaction that created this version of the object. */
  previousTransaction?: Maybe<Transaction>;
  /** The transactions that sent objects to this object */
  receivedTransactions?: Maybe<TransactionConnection>;
  /** The SUI returned to the sponsor or sender of the transaction that modifies or deletes this object. */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /** The version of this object that this content comes from. */
  version?: Maybe<Scalars['UInt53']['output']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectBalanceArgs = {
  coinType: Scalars['String']['input'];
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectDynamicFieldArgs = {
  name: DynamicFieldName;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectMultiGetDynamicFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectMultiGetDynamicObjectFieldsArgs = {
  keys: Array<DynamicFieldName>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectObjectAtArgs = {
  checkpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectObjectVersionsAfterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectObjectVersionsBeforeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Object on Sui is either a typed value (a Move Object) or a Package (modules containing functions and types).
 *
 * Every object on Sui is identified by a unique address, and has a version number that increases with every modification. Objects also hold metadata detailing their current owner (who can sign for access to the object and whether that access can modify and/or delete the object), and the digest of the last transaction that modified the object.
 */
export type ObjectReceivedTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ObjectChange = {
  __typename?: 'ObjectChange';
  /** The address of the object that has changed. */
  address: Scalars['SuiAddress']['output'];
  /** Whether the ID was created in this transaction. */
  idCreated?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the ID was deleted in this transaction. */
  idDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** The contents of the object immediately before the transaction. */
  inputState?: Maybe<Object>;
  /** The contents of the object immediately after the transaction. */
  outputState?: Maybe<Object>;
};

export type ObjectChangeConnection = {
  __typename?: 'ObjectChangeConnection';
  /** A list of edges. */
  edges: Array<ObjectChangeEdge>;
  /** A list of nodes. */
  nodes: Array<ObjectChange>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type ObjectChangeEdge = {
  __typename?: 'ObjectChangeEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: ObjectChange;
};

export type ObjectConnection = {
  __typename?: 'ObjectConnection';
  /** A list of edges. */
  edges: Array<ObjectEdge>;
  /** A list of nodes. */
  nodes: Array<Object>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type ObjectEdge = {
  __typename?: 'ObjectEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Object;
};

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
  owner?: InputMaybe<Scalars['SuiAddress']['input']>;
  /**
   * Filter on whether the object is address-owned, object-owned, shared, or immutable.
   *
   * - If this field is set to "ADDRESS" or "OBJECT", then an owner filter must also be provided.
   * - If this field is set to "SHARED" or "IMMUTABLE", then a type filter must also be provided.
   */
  ownerKind?: InputMaybe<OwnerKind>;
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
  type?: InputMaybe<Scalars['String']['input']>;
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
  address: Scalars['SuiAddress']['input'];
  /** If specified, tries to fetch the latest version as of this checkpoint. Fails if the checkpoint is later than the RPC's latest checkpoint. */
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /**
   * If specified, tries to fetch the latest version of the object at or before this version. Nested dynamic field accesses will also be subject to this bound.
   *
   * This can be used to fetch a child or ancestor object bounded by its root object's version. For any wrapped or child (object-owned) object, its root object can be defined recursively as:
   *
   * - The root object of the object it is wrapped in, if it is wrapped.
   * - The root object of its owner, if it is owned by another object.
   * - The object itself, if it is not object-owned or wrapped.
   */
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  /** If specified, tries to fetch the object at this exact version. */
  version?: InputMaybe<Scalars['UInt53']['input']>;
};

/** Object is exclusively owned by a single object, and is mutable. Note that the owning object may be inaccessible because it is wrapped. */
export type ObjectOwner = {
  __typename?: 'ObjectOwner';
  /** The owner's address. */
  address?: Maybe<Address>;
};

/**
 * Represents types that could contain references or free type parameters.  Such types can appear
 * as function parameters, in fields of structs, or as actual type parameter.
 */
export type OpenMoveType = {
  __typename?: 'OpenMoveType';
  /** Flat representation of the type signature, as a displayable string. */
  repr: Scalars['String']['output'];
  /** Structured representation of the type signature. */
  signature: Scalars['OpenMoveTypeSignature']['output'];
};

/** Placeholder for unimplemented command types */
export type OtherCommand = {
  __typename?: 'OtherCommand';
  /** Placeholder field for unimplemented commands */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** A Move object, either immutable, or owned mutable. */
export type OwnedOrImmutable = {
  __typename?: 'OwnedOrImmutable';
  object?: Maybe<Object>;
};

/** The object's owner kind. */
export type Owner = AddressOwner | ConsensusAddressOwner | Immutable | ObjectOwner | Shared;

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

/** Filter for paginating packages published within a range of checkpoints. */
export type PackageCheckpointFilter = {
  /** Filter to packages that were published strictly after this checkpoint, defaults to fetching from the earliest checkpoint known to this RPC (this could be the genesis checkpoint, or some later checkpoint if data has been pruned). */
  afterCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Filter to packages published strictly before this checkpoint, defaults to fetching up to the latest checkpoint (inclusive). */
  beforeCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
};

/**
 * Identifies a specific version of a package.
 *
 * The `address` field must be specified, as well as at most one of `version`, or `atCheckpoint`. If neither is provided, the package is fetched at the current checkpoint.
 *
 * See `Query.package` for more details.
 */
export type PackageKey = {
  /** The object's ID. */
  address: Scalars['SuiAddress']['input'];
  /** If specified, tries to fetch the latest version as of this checkpoint. */
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** If specified, tries to fetch the package at this exact version. */
  version?: InputMaybe<Scalars['UInt53']['input']>;
};

/** Information about pagination in a connection */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PerEpochConfig = {
  __typename?: 'PerEpochConfig';
  /** The per-epoch configuration object as of when the transaction was executed. */
  object?: Maybe<Object>;
};

/** ProgrammableSystemTransaction is identical to ProgrammableTransaction, but GraphQL does not allow multiple variants with the same type. */
export type ProgrammableSystemTransaction = {
  __typename?: 'ProgrammableSystemTransaction';
  /** The transaction commands, executed sequentially. */
  commands?: Maybe<CommandConnection>;
  /** Input objects or primitive values. */
  inputs?: Maybe<TransactionInputConnection>;
};


/** ProgrammableSystemTransaction is identical to ProgrammableTransaction, but GraphQL does not allow multiple variants with the same type. */
export type ProgrammableSystemTransactionCommandsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** ProgrammableSystemTransaction is identical to ProgrammableTransaction, but GraphQL does not allow multiple variants with the same type. */
export type ProgrammableSystemTransactionInputsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ProgrammableTransaction = {
  __typename?: 'ProgrammableTransaction';
  /** The transaction commands, executed sequentially. */
  commands?: Maybe<CommandConnection>;
  /** Input objects or primitive values. */
  inputs?: Maybe<TransactionInputConnection>;
};


export type ProgrammableTransactionCommandsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProgrammableTransactionInputsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A protocol configuration that can hold an arbitrary value (or no value at all). */
export type ProtocolConfig = {
  __typename?: 'ProtocolConfig';
  /** Configuration name. */
  key: Scalars['String']['output'];
  /** Configuration value. */
  value?: Maybe<Scalars['String']['output']>;
};

/**
 * Constants that control how the chain operates.
 *
 * These can only change during protocol upgrades which happen on epoch boundaries. Configuration is split into feature flags (which are just booleans), and configs which can take any value (including no value at all), and will be represented by a string.
 */
export type ProtocolConfigs = {
  __typename?: 'ProtocolConfigs';
  /** Query for the value of the configuration with name `key`. */
  config?: Maybe<ProtocolConfig>;
  /** List all available configurations and their values. */
  configs: Array<ProtocolConfig>;
  /** Query for the state of the feature flag with name `key`. */
  featureFlag?: Maybe<FeatureFlag>;
  /** List all available feature flags and their values. */
  featureFlags: Array<FeatureFlag>;
  protocolVersion: Scalars['UInt53']['output'];
};


/**
 * Constants that control how the chain operates.
 *
 * These can only change during protocol upgrades which happen on epoch boundaries. Configuration is split into feature flags (which are just booleans), and configs which can take any value (including no value at all), and will be represented by a string.
 */
export type ProtocolConfigsConfigArgs = {
  key: Scalars['String']['input'];
};


/**
 * Constants that control how the chain operates.
 *
 * These can only change during protocol upgrades which happen on epoch boundaries. Configuration is split into feature flags (which are just booleans), and configs which can take any value (including no value at all), and will be represented by a string.
 */
export type ProtocolConfigsFeatureFlagArgs = {
  key: Scalars['String']['input'];
};

/** Publishes a Move Package. */
export type PublishCommand = {
  __typename?: 'PublishCommand';
  /** IDs of the transitive dependencies of the package to be published. */
  dependencies?: Maybe<Array<Scalars['SuiAddress']['output']>>;
  /** Bytecode for the modules to be published, BCS serialized and Base64 encoded. */
  modules?: Maybe<Array<Scalars['Base64']['output']>>;
};

/** BCS encoded primitive value (not an object or Move struct). */
export type Pure = {
  __typename?: 'Pure';
  /** BCS serialized and Base64 encoded primitive value. */
  bytes?: Maybe<Scalars['Base64']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /**
   * Look-up an account by its SuiAddress.
   *
   * If `rootVersion` is specified, nested dynamic field accesses will be fetched at or before this version. This can be used to fetch a child or ancestor object bounded by its root object's version, when its immediate parent is wrapped, or a value in a dynamic object field. For any wrapped or child (object-owned) object, its root object can be defined recursively as:
   *
   * - The root object of the object it is wrapped in, if it is wrapped.
   * - The root object of its owner, if it is owned by another object.
   * - The object itself, if it is not object-owned or wrapped.
   *
   * Specifying a `rootVersion` disables nested queries for paginating owned objects or dynamic fields (these queries are only supported at checkpoint boundaries).
   */
  address: Address;
  /** First four bytes of the network's genesis checkpoint digest (uniquely identifies the network), hex-encoded. */
  chainIdentifier: Scalars['String']['output'];
  /**
   * Fetch a checkpoint by its sequence number, or the latest checkpoint if no sequence number is provided.
   *
   * Returns `null` if the checkpoint does not exist in the store, either because it never existed or because it was pruned.
   */
  checkpoint?: Maybe<Checkpoint>;
  /** Paginate checkpoints in the network, optionally bounded to checkpoints in the given epoch. */
  checkpoints?: Maybe<CheckpointConnection>;
  /**
   * Fetch the CoinMetadata for a given coin type.
   *
   * Returns `null` if no CoinMetadata object exists for the given coin type.
   */
  coinMetadata?: Maybe<CoinMetadata>;
  /**
   * Fetch an epoch by its ID, or fetch the latest epoch if no ID is provided.
   *
   * Returns `null` if the epoch does not exist yet, or was pruned.
   */
  epoch?: Maybe<Epoch>;
  /** Paginate epochs that are in the network. */
  epochs?: Maybe<EpochConnection>;
  /** Paginate events that are emitted in the network, optionally filtered by event filters. */
  events?: Maybe<EventConnection>;
  /**
   * Fetch checkpoints by their sequence numbers.
   *
   * Returns a list of checkpoints that is guaranteed to be the same length as `keys`. If a checkpoint in `keys` could not be found in the store, its corresponding entry in the result will be `null`. This could be because the checkpoint does not exist yet, or because it was pruned.
   */
  multiGetCheckpoints: Array<Maybe<Checkpoint>>;
  /**
   * Fetch epochs by their IDs.
   *
   * Returns a list of epochs that is guaranteed to be the same length as `keys`. If an epoch in `keys` could not be found in the store, its corresponding entry in the result will be `null`. This could be because the epoch does not exist yet, or because it was pruned.
   */
  multiGetEpochs: Array<Maybe<Epoch>>;
  /**
   * Fetch objects by their keys.
   *
   * Returns a list of objects that is guaranteed to be the same length as `keys`. If an object in `keys` could not be found in the store, its corresponding entry in the result will be `null`. This could be because the object never existed, or because it was pruned.
   */
  multiGetObjects: Array<Maybe<Object>>;
  /**
   * Fetch packages by their keys.
   *
   * Returns a list of packages that is guaranteed to be the same length as `keys`. If a package in `keys` could not be found in the store, its corresponding entry in the result will be `null`. This could be because that address never pointed to a package, or because the package was pruned.
   */
  multiGetPackages: Array<Maybe<MovePackage>>;
  /**
   * Fetch transaction effects by their transactions' digests.
   *
   * Returns a list of transaction effects that is guaranteed to be the same length as `keys`. If a digest in `keys` could not be found in the store, its corresponding entry in the result will be `null`. This could be because the transaction effects never existed, or because it was pruned.
   */
  multiGetTransactionEffects: Array<Maybe<TransactionEffects>>;
  /**
   * Fetch transactions by their digests.
   *
   * Returns a list of transactions that is guaranteed to be the same length as `keys`. If a digest in `keys` could not be found in the store, its corresponding entry in the result will be `null`. This could be because the transaction never existed, or because it was pruned.
   */
  multiGetTransactions: Array<Maybe<Transaction>>;
  /**
   * Fetch types by their string representations.
   *
   * Types are canonicalized: In the input they can be at any package address at or after the package that first defines them, and in the output they will be relocated to the package that first defines them.
   *
   * Returns a list of types that is guaranteed to be the same length as `keys`. If a type in `keys` could not be found, its corresponding entry in the result will be `null`.
   */
  multiGetTypes: Array<Maybe<MoveType>>;
  /**
   * Fetch an object by its address.
   *
   * If `version` is specified, the object will be fetched at that exact version.
   *
   * If `rootVersion` is specified, the object will be fetched at the latest version at or before this version. Nested dynamic field accesses will also be subject to this bound. This can be used to fetch a child or ancestor object bounded by its root object's version. For any wrapped or child (object-owned) object, its root object can be defined recursively as:
   *
   * - The root object of the object it is wrapped in, if it is wrapped.
   * - The root object of its owner, if it is owned by another object.
   * - The object itself, if it is not object-owned or wrapped.
   *
   * Specifying a `version` or a `rootVersion` disables nested queries for paginating owned objects or dynamic fields (these queries are only supported at checkpoint boundaries).
   *
   * If `atCheckpoint` is specified, the object will be fetched at the latest version as of this checkpoint. This will fail if the provided checkpoint is after the RPC's latest checkpoint.
   *
   * If none of the above are specified, the object is fetched at the latest checkpoint.
   *
   * It is an error to specify more than one of `version`, `rootVersion`, or `atCheckpoint`.
   *
   * Returns `null` if an object cannot be found that meets this criteria.
   */
  object?: Maybe<Object>;
  /** Paginate all versions of an object at `address`, optionally bounding the versions exclusively from below with `filter.afterVersion` or from above with `filter.beforeVersion`. */
  objectVersions?: Maybe<ObjectConnection>;
  /**
   * Paginate objects in the live object set, optionally filtered by owner and/or type. `filter` can be one of:
   *
   * - A filter on type (all live objects whose type matches that filter).
   * - Fetching all objects owned by an address or object, optionally filtered by type.
   * - Fetching all shared or immutable objects, filtered by type.
   */
  objects?: Maybe<ObjectConnection>;
  /**
   * Fetch a package by its address.
   *
   * If `version` is specified, the package loaded is the one that shares its original ID with the package at `address`, but whose version is `version`.
   *
   * If `atCheckpoint` is specified, the package loaded is the one with the largest version among all packages sharing an original ID with the package at `address` and was published at or before `atCheckpoint`.
   *
   * If neither are specified, the package is fetched at the latest checkpoint.
   *
   * It is an error to specify both `version` and `atCheckpoint`, and `null` will be returned if the package cannot be found as of the latest checkpoint, or the address points to an object that is not a package.
   *
   * Note that this interpretation of `version` and "latest" differs from the one used by `Query.object`, because non-system package upgrades generate objects with different IDs. To fetch a package using the versioning semantics of objects, use `Object.asMovePackage` nested under `Query.object`.
   */
  package?: Maybe<MovePackage>;
  /**
   * Paginate all versions of a package at `address`, optionally bounding the versions exclusively from below with `filter.afterVersion` or from above with `filter.beforeVersion`.
   *
   * Different versions of a package will have different object IDs, unless they are system packages, but will share the same original ID.
   */
  packageVersions?: Maybe<MovePackageConnection>;
  /** Paginate all packages published on-chain, optionally bounded to packages published strictly after `filter.afterCheckpoint` and/or strictly before `filter.beforeCheckpoint`. */
  packages?: Maybe<MovePackageConnection>;
  /** Fetch the protocol config by protocol version, or the latest protocol config used on chain if no version is provided. */
  protocolConfigs?: Maybe<ProtocolConfigs>;
  /** Configuration for this RPC service. */
  serviceConfig: ServiceConfig;
  /**
   * Simulate a transaction to preview its effects without executing it on chain.
   *
   * Accepts a JSON transaction matching the [Sui gRPC API schema](https://docs.sui.io/references/fullnode-protocol#sui-rpc-v2-Transaction).
   * The JSON format allows for partial transaction specification where certain fields can be automatically resolved by the server.
   *
   * Alternatively, for already serialized transactions, you can pass BCS-encoded data:
   * `{"bcs": {"value": "<base64>"}}`
   *
   * Unlike `executeTransaction`, this does not require signatures since the transaction is not committed to the blockchain. This allows for previewing transaction effects, estimating gas costs, and testing transaction logic without spending gas or requiring valid signatures.
   */
  simulateTransaction: SimulationResult;
  /** Look-up an account by its SuiNS name, assuming it has a valid, unexpired name registration. */
  suinsName?: Maybe<Address>;
  /**
   * Fetch a transaction by its digest.
   *
   * Returns `null` if the transaction does not exist in the store, either because it never existed or because it was pruned.
   */
  transaction?: Maybe<Transaction>;
  /**
   * Fetch transaction effects by its transaction's digest.
   *
   * Returns `null` if the transaction effects do not exist in the store, either because that transaction was not executed, or it was pruned.
   */
  transactionEffects?: Maybe<TransactionEffects>;
  /** The transactions that exist in the network, optionally filtered by transaction filters. */
  transactions?: Maybe<TransactionConnection>;
  /**
   * Fetch a structured representation of a concrete type, including its layout information.
   *
   * Types are canonicalized: In the input they can be at any package address at or after the package that first defines them, and in the output they will be relocated to the package that first defines them.
   *
   * Fails if the type is malformed, returns `null` if a type mentioned does not exist.
   */
  type?: Maybe<MoveType>;
  /**
   * Verify a zkLogin signature os from the given `author`.
   *
   * Returns a `ZkLoginVerifyResult` where `success` is `true` and `error` is empty if the signature is valid. If the signature is invalid, `success` is `false` and `error` contains the relevant error message.
   *
   * - `bytes` are either the bytes of a serialized personal message, or `TransactionData`, Base64-encoded.
   * - `signature` is a serialized zkLogin signature, also Base64-encoded.
   * - `intentScope` indicates whether `bytes` are to be parsed as a personal message or `TransactionData`.
   * - `author` is the signer's address.
   */
  verifyZkLoginSignature: ZkLoginVerifyResult;
};


export type QueryAddressArgs = {
  address: Scalars['SuiAddress']['input'];
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryCheckpointArgs = {
  sequenceNumber?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryCheckpointsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CheckpointFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCoinMetadataArgs = {
  coinType: Scalars['String']['input'];
};


export type QueryEpochArgs = {
  epochId?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryEpochsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<EventFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMultiGetCheckpointsArgs = {
  keys: Array<Scalars['UInt53']['input']>;
};


export type QueryMultiGetEpochsArgs = {
  keys: Array<Scalars['UInt53']['input']>;
};


export type QueryMultiGetObjectsArgs = {
  keys: Array<ObjectKey>;
};


export type QueryMultiGetPackagesArgs = {
  keys: Array<PackageKey>;
};


export type QueryMultiGetTransactionEffectsArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type QueryMultiGetTransactionsArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type QueryMultiGetTypesArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type QueryObjectArgs = {
  address: Scalars['SuiAddress']['input'];
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryObjectVersionsArgs = {
  address: Scalars['SuiAddress']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter: ObjectFilter;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPackageArgs = {
  address: Scalars['SuiAddress']['input'];
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryPackageVersionsArgs = {
  address: Scalars['SuiAddress']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<VersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPackagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PackageCheckpointFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProtocolConfigsArgs = {
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QuerySimulateTransactionArgs = {
  transaction: Scalars['JSON']['input'];
};


export type QuerySuinsNameArgs = {
  address: Scalars['String']['input'];
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryTransactionArgs = {
  digest: Scalars['String']['input'];
};


export type QueryTransactionEffectsArgs = {
  digest: Scalars['String']['input'];
};


export type QueryTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTypeArgs = {
  type: Scalars['String']['input'];
};


export type QueryVerifyZkLoginSignatureArgs = {
  author: Scalars['SuiAddress']['input'];
  bytes: Scalars['Base64']['input'];
  intentScope: ZkLoginIntentScope;
  signature: Scalars['Base64']['input'];
};

/** System transaction for creating the on-chain randomness state. */
export type RandomnessStateCreateTransaction = {
  __typename?: 'RandomnessStateCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** System transaction to update the source of on-chain randomness. */
export type RandomnessStateUpdateTransaction = {
  __typename?: 'RandomnessStateUpdateTransaction';
  /** Epoch of the randomness state update transaction. */
  epoch?: Maybe<Scalars['Int']['output']>;
  /** Updated random bytes, Base64 encoded. */
  randomBytes?: Maybe<Scalars['Base64']['output']>;
  /** The initial version of the randomness object that it was shared at. */
  randomnessObjInitialSharedVersion?: Maybe<Scalars['Int']['output']>;
  /** Randomness round of the update. */
  randomnessRound?: Maybe<Scalars['Int']['output']>;
};

/** A transaction that wanted to read a consensus-managed object but couldn't because it became not-consensus-managed before the transaction executed (for example, it was deleted, turned into an owned object, or wrapped). */
export type ReadConsensusStreamEnded = {
  __typename?: 'ReadConsensusStreamEnded';
  /** The ID of the consensus-managed object. */
  address?: Maybe<Scalars['SuiAddress']['output']>;
  /** The sequence number associated with the consensus stream ending. */
  sequenceNumber?: Maybe<Scalars['UInt53']['output']>;
};

/** A Move object that can be received in this transaction. */
export type Receiving = {
  __typename?: 'Receiving';
  object?: Maybe<Object>;
};

/** Whether the currency is regulated or not. */
export enum RegulatedState {
  /** A `DenyCap` or a `RegulatedCoinMetadata` exists for this currency. */
  Regulated = 'REGULATED',
  /** The currency was created without a deny list. */
  Unregulated = 'UNREGULATED'
}

export type SafeMode = {
  __typename?: 'SafeMode';
  /**
   * Whether safe mode was used for the last epoch change.
   * The system will retry a full epoch change on every epoch boundary and automatically reset this flag if so.
   */
  enabled?: Maybe<Scalars['Boolean']['output']>;
  /** Accumulated fees for computation and cost that have not been added to the various reward pools, because the full epoch change did not happen. */
  gasSummary?: Maybe<GasCostSummary>;
};

export type ServiceConfig = {
  __typename?: 'ServiceConfig';
  /** Range of checkpoints for which data is available for a query type, field and optional filter. If filter is not provided, the strictest retention range for the query and type is returned. */
  availableRange: AvailableRange;
  /**
   * Number of elements a paginated connection will return if a page size is not supplied.
   *
   * Accepts `type` and `field` arguments which identify the connection that is being queried. If the field in question is paginated, its default page size is returned. If it does not exist or is not paginated, `null` is returned.
   */
  defaultPageSize?: Maybe<Scalars['Int']['output']>;
  /** Maximum output size of a disassembled MoveModule, in bytes. */
  maxDisassembledModuleSize?: Maybe<Scalars['Int']['output']>;
  /** Maximum depth of nested field access supported in display outputs. */
  maxDisplayFieldDepth?: Maybe<Scalars['Int']['output']>;
  /** Maximum output size of a display output. */
  maxDisplayOutputSize?: Maybe<Scalars['Int']['output']>;
  /** Maximum budget in bytes to spend when outputting a structured `MoveValue`. */
  maxMoveValueBound?: Maybe<Scalars['Int']['output']>;
  /** Maximum nesting allowed in datatype fields when calculating the layout of a single type. */
  maxMoveValueDepth?: Maybe<Scalars['Int']['output']>;
  /** Maximum number of elements that can be requested from a multi-get query. A request to fetch more keys will result in an error. */
  maxMultiGetSize?: Maybe<Scalars['Int']['output']>;
  /**
   * Maximum number of estimated output nodes in a GraphQL response.
   *
   * The estimate is an upperbound of how many nodes there would be in the output assuming every requested field is present, paginated requests return full page sizes, and multi-get queries find all requested keys. Below is a worked example query:
   *
   * ```graphql
   * |  0: query {                            # 514 = total
   * |  1:   checkpoint {                     # 1
   * |  2:     sequenceNumber                 # 1
   * |  3:   }
   * |  4:
   * |  5:   multiGetObjects([$a, $b, $c]) {  # 1 (* 3)
   * |  6:     address                        # 3
   * |  7:     digest                         # 3
   * |  8:   }
   * |  9:
   * | 10:   # default page size is 20
   * | 11:   transactions {                   # 1 (* 20)
   * | 12:     pageInfo {                     # 1
   * | 13:       hasNextPage                  # 1
   * | 14:       endCursor                    # 1
   * | 15:     }
   * | 16:
   * | 17:     nodes                          # 1
   * | 18:     {                              # 20
   * | 19:       digest                       # 20
   * | 20:       effects {                    # 20
   * | 21:         objectChanges(first: 10) { # 20 (* 10)
   * | 22:           nodes                    # 20
   * | 23:           {                        # 200
   * | 24:             address                # 200
   * | 25:           }
   * | 26:         }
   * | 27:       }
   * | 28:     }
   * | 29:   }
   * | 30: }
   * ```
   */
  maxOutputNodes?: Maybe<Scalars['Int']['output']>;
  /**
   * Maximum number of elements that can be requested from a paginated connection. A request to fetch more elements will result in an error.
   *
   * Accepts `type` and `field` arguments which identify the connection that is being queried. If the field in question is paginated, its max page size is returned. If it does not exist or is not paginated, `null` is returned.
   */
  maxPageSize?: Maybe<Scalars['Int']['output']>;
  /** Maximum depth of a GraphQL query that can be accepted by this service. */
  maxQueryDepth?: Maybe<Scalars['Int']['output']>;
  /** The maximum number of nodes (field names) the service will accept in a single query. */
  maxQueryNodes?: Maybe<Scalars['Int']['output']>;
  /** Maximum size in bytes of a single GraphQL request, excluding the elements covered by `maxTransactionPayloadSize`. */
  maxQueryPayloadSize?: Maybe<Scalars['Int']['output']>;
  /**
   * Maximum size in bytes allowed for the `txBytes` and `signatures` parameters of an `executeTransaction` or `simulateTransaction` field, or the `bytes` and `signature` parameters of a `verifyZkLoginSignature` field.
   *
   * This is cumulative across all matching fields in a single GraphQL request.
   */
  maxTransactionPayloadSize?: Maybe<Scalars['Int']['output']>;
  /** Maximum amount of nesting among type arguments (type arguments nest when a type argument is itself generic and has arguments). */
  maxTypeArgumentDepth?: Maybe<Scalars['Int']['output']>;
  /** Maximum number of type parameters a type can have. */
  maxTypeArgumentWidth?: Maybe<Scalars['Int']['output']>;
  /** Maximum number of datatypes that need to be processed when calculating the layout of a single type. */
  maxTypeNodes?: Maybe<Scalars['Int']['output']>;
  /** Maximum time in milliseconds spent waiting for a response from fullnode after issuing a transaction to execute. Note that the transaction may still succeed even in the case of a timeout. Transactions are idempotent, so a transaction that times out should be re-submitted until the network returns a definite response (success or failure, not timeout). */
  mutationTimeoutMs?: Maybe<Scalars['Int']['output']>;
  /** Maximum time in milliseconds that will be spent to serve one query request. */
  queryTimeoutMs?: Maybe<Scalars['Int']['output']>;
};


export type ServiceConfigAvailableRangeArgs = {
  field?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Array<Scalars['String']['input']>>;
  type: Scalars['String']['input'];
};


export type ServiceConfigDefaultPageSizeArgs = {
  field: Scalars['String']['input'];
  type: Scalars['String']['input'];
};


export type ServiceConfigMaxPageSizeArgs = {
  field: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

/** Object is shared, can be used by any address, and is mutable. */
export type Shared = {
  __typename?: 'Shared';
  /** The version at which the object became shared. */
  initialSharedVersion?: Maybe<Scalars['UInt53']['output']>;
};

/** A Move object that's shared. */
export type SharedInput = {
  __typename?: 'SharedInput';
  /** The address of the shared object. */
  address?: Maybe<Scalars['SuiAddress']['output']>;
  /** The version that this object was shared at. */
  initialSharedVersion?: Maybe<Scalars['UInt53']['output']>;
  /**
   * Controls whether the transaction block can reference the shared object as a mutable reference or by value.
   *
   * This has implications for scheduling: Transactions that just read shared objects at a certain version (mutable = false) can be executed concurrently, while transactions that write shared objects (mutable = true) must be executed serially with respect to each other.
   */
  mutable?: Maybe<Scalars['Boolean']['output']>;
};

/** The result of simulating a transaction, including the predicted effects, events, and any errors. */
export type SimulationResult = {
  __typename?: 'SimulationResult';
  /**
   * The predicted effects of the transaction if it were executed.
   *
   * `None` if the simulation failed due to an error.
   */
  effects?: Maybe<TransactionEffects>;
  /**
   * Error message if the simulation failed.
   *
   * `None` if the simulation was successful.
   */
  error?: Maybe<Scalars['String']['output']>;
  /**
   * The events that would be emitted if the transaction were executed.
   *
   * `None` if the simulation failed or no events would be emitted.
   */
  events?: Maybe<Array<Event>>;
  /** The intermediate outputs for each command of the transaction simulation, including contents of mutated references and return values. */
  outputs?: Maybe<Array<CommandResult>>;
};

/** Splits off coins with denominations in `amounts` from `coin`, returning multiple results (as many as there are amounts.) */
export type SplitCoinsCommand = {
  __typename?: 'SplitCoinsCommand';
  /** The denominations to split off from the coin. */
  amounts: Array<TransactionArgument>;
  /** The coin to split. */
  coin?: Maybe<TransactionArgument>;
};

/** Parameters that control the distribution of the stake subsidy. */
export type StakeSubsidy = {
  __typename?: 'StakeSubsidy';
  /** SUI set aside for stake subsidies -- reduces over time as stake subsidies are paid out over time. */
  balance?: Maybe<Scalars['BigInt']['output']>;
  /** Amount of stake subsidy deducted from the balance per distribution -- decays over time. */
  currentDistributionAmount?: Maybe<Scalars['BigInt']['output']>;
  /** Percentage of the current distribution amount to deduct at the end of the current subsidy period, expressed in basis points. */
  decreaseRate?: Maybe<Scalars['Int']['output']>;
  /**
   * Number of times stake subsidies have been distributed.
   * Subsidies are distributed with other staking rewards, at the end of the epoch.
   */
  distributionCounter?: Maybe<Scalars['Int']['output']>;
  /** Maximum number of stake subsidy distributions that occur with the same distribution amount (before the amount is reduced). */
  periodLength?: Maybe<Scalars['Int']['output']>;
};

/** SUI set aside to account for objects stored on-chain. */
export type StorageFund = {
  __typename?: 'StorageFund';
  /**
   * The portion of the storage fund that will never be refunded through storage rebates.
   * The system maintains an invariant that the sum of all storage fees into the storage fund is equal to the sum of all storage rebates out, the total storage rebates remaining, and the non-refundable balance.
   */
  nonRefundableBalance?: Maybe<Scalars['BigInt']['output']>;
  /** Sum of storage rebates of live objects on chain. */
  totalObjectStorageRebates?: Maybe<Scalars['BigInt']['output']>;
};

/** System transaction for storing execution time observations. */
export type StoreExecutionTimeObservationsTransaction = {
  __typename?: 'StoreExecutionTimeObservationsTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** Future behavior of a currency's supply. */
export enum SupplyState {
  /** The supply can only decrease. */
  BurnOnly = 'BURN_ONLY',
  /** The supply can neither increase nor decrease. */
  Fixed = 'FIXED'
}

/** Details of the system that are decided during genesis. */
export type SystemParameters = {
  __typename?: 'SystemParameters';
  /** Target duration of an epoch, in milliseconds. */
  durationMs?: Maybe<Scalars['BigInt']['output']>;
  /** The maximum number of active validators that the system supports. */
  maxValidatorCount?: Maybe<Scalars['Int']['output']>;
  /** The minimum number of active validators that the system supports. */
  minValidatorCount?: Maybe<Scalars['Int']['output']>;
  /** Minimum stake needed to become a new validator. */
  minValidatorJoiningStake?: Maybe<Scalars['BigInt']['output']>;
  /** The epoch at which stake subsidies start being paid out. */
  stakeSubsidyStartEpoch?: Maybe<Scalars['UInt53']['output']>;
  /** The number of epochs that a validator has to recover from having less than `validatorLowStakeThreshold` stake. */
  validatorLowStakeGracePeriod?: Maybe<Scalars['BigInt']['output']>;
  /** Validators with stake below this threshold will enter the grace period (see `validatorLowStakeGracePeriod`), after which they are removed from the active validator set. */
  validatorLowStakeThreshold?: Maybe<Scalars['BigInt']['output']>;
  /** Validators with stake below this threshold will be removed from the active validator set at the next epoch boundary, without a grace period. */
  validatorVeryLowStakeThreshold?: Maybe<Scalars['BigInt']['output']>;
};

/** Description of a transaction, the unit of activity on Sui. */
export type Transaction = {
  __typename?: 'Transaction';
  /** A 32-byte hash that uniquely identifies the transaction contents, encoded in Base58. */
  digest: Scalars['String']['output'];
  /** The results to the chain of executing this transaction. */
  effects?: Maybe<TransactionEffects>;
  /** This field is set by senders of a transaction block. It is an epoch reference that sets a deadline after which validators will no longer consider the transaction valid. By default, there is no deadline for when a transaction must execute. */
  expiration?: Maybe<Epoch>;
  /** The gas input field provides information on what objects were used as gas as well as the owner of the gas object(s) and information on the gas price and budget. */
  gasInput?: Maybe<GasInput>;
  /** The type of this transaction as well as the commands and/or parameters comprising the transaction of this kind. */
  kind?: Maybe<TransactionKind>;
  /** The address corresponding to the public key that signed this transaction. System transactions do not have senders. */
  sender?: Maybe<Address>;
  /** User signatures for this transaction. */
  signatures: Array<UserSignature>;
  /** The Base64-encoded BCS serialization of this transaction, as a `TransactionData`. */
  transactionBcs?: Maybe<Scalars['Base64']['output']>;
};

/** An argument to a programmable transaction command. */
export type TransactionArgument = GasCoin | Input | TxResult;

export type TransactionConnection = {
  __typename?: 'TransactionConnection';
  /** A list of edges. */
  edges: Array<TransactionEdge>;
  /** A list of nodes. */
  nodes: Array<Transaction>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type TransactionEdge = {
  __typename?: 'TransactionEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Transaction;
};

/** The results of executing a transaction. */
export type TransactionEffects = {
  __typename?: 'TransactionEffects';
  /** The effect this transaction had on the balances (sum of coin values per coin type) of addresses and objects. */
  balanceChanges?: Maybe<BalanceChangeConnection>;
  /** The checkpoint this transaction was finalized in. */
  checkpoint?: Maybe<Checkpoint>;
  /** Transactions whose outputs this transaction depends upon. */
  dependencies?: Maybe<TransactionConnection>;
  /**
   * A 32-byte hash that uniquely identifies the transaction contents, encoded in Base58.
   *
   * Note that this is different from the execution digest, which is the unique hash of the transaction effects.
   */
  digest: Scalars['String']['output'];
  /** The Base64-encoded BCS serialization of these effects, as `TransactionEffects`. */
  effectsBcs?: Maybe<Scalars['Base64']['output']>;
  /** A 32-byte hash that uniquely identifies the effects contents, encoded in Base58. */
  effectsDigest?: Maybe<Scalars['String']['output']>;
  /** The epoch this transaction was finalized in. */
  epoch?: Maybe<Epoch>;
  /** Events emitted by this transaction. */
  events?: Maybe<EventConnection>;
  /** Rich execution error information for failed transactions. */
  executionError?: Maybe<ExecutionError>;
  /** Effects related to the gas object used for the transaction (costs incurred and the identity of the smashed gas object returned). */
  gasEffects?: Maybe<GasEffects>;
  /** The latest version of all objects (apart from packages) that have been created or modified by this transaction, immediately following this transaction. */
  lamportVersion?: Maybe<Scalars['UInt53']['output']>;
  /** The before and after state of objects that were modified by this transaction. */
  objectChanges?: Maybe<ObjectChangeConnection>;
  /** Whether the transaction executed successfully or not. */
  status?: Maybe<ExecutionStatus>;
  /** Timestamp corresponding to the checkpoint this transaction was finalized in. */
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  /** The transaction that ran to produce these effects. */
  transaction?: Maybe<Transaction>;
  /** The unchanged consensus-managed objects that were referenced by this transaction. */
  unchangedConsensusObjects?: Maybe<UnchangedConsensusObjectConnection>;
};


/** The results of executing a transaction. */
export type TransactionEffectsBalanceChangesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The results of executing a transaction. */
export type TransactionEffectsDependenciesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The results of executing a transaction. */
export type TransactionEffectsEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The results of executing a transaction. */
export type TransactionEffectsObjectChangesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The results of executing a transaction. */
export type TransactionEffectsUnchangedConsensusObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type TransactionFilter = {
  /**
   * Limit to transactions that interacted with the given address.
   * The address could be a sender, sponsor, or recipient of the transaction.
   */
  affectedAddress?: InputMaybe<Scalars['SuiAddress']['input']>;
  /**
   * Limit to transactions that interacted with the given object.
   * The object could have been created, read, modified, deleted, wrapped, or unwrapped by the transaction.
   * Objects that were passed as a `Receiving` input are not considered to have been affected by a transaction unless they were actually received.
   */
  affectedObject?: InputMaybe<Scalars['SuiAddress']['input']>;
  /** Filter to transactions that occurred strictly after the given checkpoint. */
  afterCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Filter to transactions in the given checkpoint. */
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Filter to transaction that occurred strictly before the given checkpoint. */
  beforeCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Filter transactions by move function called. Calls can be filtered by the `package`, `package::module`, or the `package::module::name` of their function. */
  function?: InputMaybe<Scalars['String']['input']>;
  /** An input filter selecting for either system or programmable transactions. */
  kind?: InputMaybe<TransactionKindInput>;
  /** Limit to transactions that were sent by the given address. */
  sentAddress?: InputMaybe<Scalars['SuiAddress']['input']>;
};

/** Input argument to a Programmable Transaction Block (PTB) command. */
export type TransactionInput = OwnedOrImmutable | Pure | Receiving | SharedInput;

export type TransactionInputConnection = {
  __typename?: 'TransactionInputConnection';
  /** A list of edges. */
  edges: Array<TransactionInputEdge>;
  /** A list of nodes. */
  nodes: Array<TransactionInput>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type TransactionInputEdge = {
  __typename?: 'TransactionInputEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: TransactionInput;
};

/** Different types of transactions that can be executed on the Sui network. */
export type TransactionKind = AuthenticatorStateUpdateTransaction | ChangeEpochTransaction | ConsensusCommitPrologueTransaction | EndOfEpochTransaction | GenesisTransaction | ProgrammableSystemTransaction | ProgrammableTransaction | RandomnessStateUpdateTransaction;

/** An input filter selecting for either system or programmable transactions. */
export enum TransactionKindInput {
  /** A user submitted transaction block. */
  ProgrammableTx = 'PROGRAMMABLE_TX',
  /**
   * A system transaction can be one of several types of transactions.
   * See [unions/transaction-block-kind] for more details.
   */
  SystemTx = 'SYSTEM_TX'
}

/** Transfers `inputs` to `address`. All inputs must have the `store` ability (allows public transfer) and must not be previously immutable or shared. */
export type TransferObjectsCommand = {
  __typename?: 'TransferObjectsCommand';
  /** The address to transfer to. */
  address?: Maybe<TransactionArgument>;
  /** The objects to transfer. */
  inputs: Array<TransactionArgument>;
};

/** The result of another command. */
export type TxResult = {
  __typename?: 'TxResult';
  /** The index of the command that produced this result. */
  cmd?: Maybe<Scalars['Int']['output']>;
  /** For nested results, the index within the result. */
  ix?: Maybe<Scalars['Int']['output']>;
};

/** Information about which previous versions of a package introduced its types. */
export type TypeOrigin = {
  __typename?: 'TypeOrigin';
  /** The storage ID of the package that first defined this type. */
  definingId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Module defining the type. */
  module?: Maybe<Scalars['String']['output']>;
  /** Name of the struct. */
  struct?: Maybe<Scalars['String']['output']>;
};

/** Details pertaining to consensus-managed objects that are referenced by but not changed by a transaction. */
export type UnchangedConsensusObject = ConsensusObjectCancelled | ConsensusObjectRead | MutateConsensusStreamEnded | PerEpochConfig | ReadConsensusStreamEnded;

export type UnchangedConsensusObjectConnection = {
  __typename?: 'UnchangedConsensusObjectConnection';
  /** A list of edges. */
  edges: Array<UnchangedConsensusObjectEdge>;
  /** A list of nodes. */
  nodes: Array<UnchangedConsensusObject>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type UnchangedConsensusObjectEdge = {
  __typename?: 'UnchangedConsensusObjectEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: UnchangedConsensusObject;
};

/** Upgrades a Move Package. */
export type UpgradeCommand = {
  __typename?: 'UpgradeCommand';
  /** ID of the package being upgraded. */
  currentPackage?: Maybe<Scalars['SuiAddress']['output']>;
  /** IDs of the transitive dependencies of the package to be published. */
  dependencies?: Maybe<Array<Scalars['SuiAddress']['output']>>;
  /** Bytecode for the modules to be published, BCS serialized and Base64 encoded. */
  modules?: Maybe<Array<Scalars['Base64']['output']>>;
  /** The `UpgradeTicket` authorizing the upgrade. */
  upgradeTicket?: Maybe<TransactionArgument>;
};

export type UserSignature = {
  __typename?: 'UserSignature';
  /**
   * The signature bytes, Base64-encoded.
   * For simple signatures: flag || signature || pubkey
   * For complex signatures: flag || bcs_serialized_struct
   */
  signatureBytes?: Maybe<Scalars['Base64']['output']>;
};

export type Validator = IAddressable & {
  __typename?: 'Validator';
  /** The validator's address. */
  address: Scalars['SuiAddress']['output'];
  /** The number of epochs for which this validator has been below the low stake threshold. */
  atRisk?: Maybe<Scalars['UInt53']['output']>;
  /**
   * Fetch the total balance for coins with marker type `coinType` (e.g. `0x2::sui::SUI`), owned by this address.
   *
   * If the address does not own any coins of that type, a balance of zero is returned.
   */
  balance?: Maybe<Balance>;
  /** Total balance across coins owned by this address, grouped by coin type. */
  balances?: Maybe<BalanceConnection>;
  /** The fee charged by the validator for staking services. */
  commissionRate?: Maybe<Scalars['Int']['output']>;
  /** Validator's set of credentials such as public keys, network addresses and others. */
  credentials?: Maybe<ValidatorCredentials>;
  /** The domain explicitly configured as the default SuiNS name for this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** Validator's description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Number of exchange rates in the table. */
  exchangeRatesSize?: Maybe<Scalars['UInt53']['output']>;
  /**
   * A wrapped object containing the validator's exchange rates. This is a table from epoch number to `PoolTokenExchangeRate` value.
   * The exchange rate is used to determine the amount of SUI tokens that each past SUI staker can withdraw in the future.
   */
  exchangeRatesTable?: Maybe<Address>;
  /** The reference gas price for this epoch. */
  gasPrice?: Maybe<Scalars['BigInt']['output']>;
  /** Validator's url containing their custom image. */
  imageUrl?: Maybe<Scalars['String']['output']>;
  /**
   * Fetch the total balances keyed by coin types (e.g. `0x2::sui::SUI`) owned by this address.
   *
   * Returns `None` when no checkpoint is set in scope (e.g. execution scope).
   * If the address does not own any coins of a given type, a balance of zero is returned for that type.
   */
  multiGetBalances?: Maybe<Array<Balance>>;
  /** Validator's name. */
  name?: Maybe<Scalars['String']['output']>;
  /** The proposed next epoch fee for the validator's staking services. */
  nextEpochCommissionRate?: Maybe<Scalars['Int']['output']>;
  /** Validator's set of credentials for the next epoch. */
  nextEpochCredentials?: Maybe<ValidatorCredentials>;
  /** The validator's gas price quote for the next epoch. */
  nextEpochGasPrice?: Maybe<Scalars['BigInt']['output']>;
  /** The total number of SUI tokens in this pool plus the pending stake amount for this epoch. */
  nextEpochStake?: Maybe<Scalars['BigInt']['output']>;
  /** Objects owned by this object, optionally filtered by type. */
  objects?: Maybe<MoveObjectConnection>;
  /**
   * The validator's current valid `Cap` object. Validators can delegate the operation ability to another address.
   * The address holding this `Cap` object can then update the reference gas price and tallying rule on behalf of the validator.
   */
  operationCap?: Maybe<MoveObject>;
  /** Pending pool token withdrawn during the current epoch, emptied at epoch boundaries. */
  pendingPoolTokenWithdraw?: Maybe<Scalars['BigInt']['output']>;
  /** Pending stake amount for this epoch. */
  pendingStake?: Maybe<Scalars['BigInt']['output']>;
  /** Pending stake withdrawn during the current epoch, emptied at epoch boundaries. */
  pendingTotalSuiWithdraw?: Maybe<Scalars['BigInt']['output']>;
  /** Total number of pool tokens issued by the pool. */
  poolTokenBalance?: Maybe<Scalars['BigInt']['output']>;
  /** Validator's homepage URL. */
  projectUrl?: Maybe<Scalars['String']['output']>;
  /** Other validators this validator has reported. */
  reportRecords?: Maybe<ValidatorConnection>;
  /** The epoch stake rewards will be added here at the end of each epoch. */
  rewardsPool?: Maybe<Scalars['BigInt']['output']>;
  /** The epoch at which this pool became active. */
  stakingPoolActivationEpoch?: Maybe<Scalars['UInt53']['output']>;
  /** The ID of this validator's `0x3::staking_pool::StakingPool`. */
  stakingPoolId: Scalars['SuiAddress']['output'];
  /** The total number of SUI tokens in this pool. */
  stakingPoolSuiBalance?: Maybe<Scalars['BigInt']['output']>;
  /** The voting power of this validator in basis points (e.g., 100 = 1% voting power). */
  votingPower?: Maybe<Scalars['Int']['output']>;
};


export type ValidatorBalanceArgs = {
  coinType: Scalars['String']['input'];
};


export type ValidatorBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ValidatorMultiGetBalancesArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type ValidatorObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ValidatorReportRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ValidatorAggregatedSignature = {
  __typename?: 'ValidatorAggregatedSignature';
  /** The epoch when this aggregate signature was produced. */
  epoch?: Maybe<Epoch>;
  /** The Base64 encoded BLS12381 aggregated signature. */
  signature?: Maybe<Scalars['Base64']['output']>;
  /** The indexes of validators that contributed to this signature. */
  signersMap: Array<Scalars['Int']['output']>;
};

export type ValidatorConnection = {
  __typename?: 'ValidatorConnection';
  /** A list of edges. */
  edges: Array<ValidatorEdge>;
  /** A list of nodes. */
  nodes: Array<Validator>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** The credentials related fields associated with a validator. */
export type ValidatorCredentials = {
  __typename?: 'ValidatorCredentials';
  netAddress?: Maybe<Scalars['String']['output']>;
  networkPubKey?: Maybe<Scalars['Base64']['output']>;
  p2PAddress?: Maybe<Scalars['String']['output']>;
  primaryAddress?: Maybe<Scalars['String']['output']>;
  proofOfPossession?: Maybe<Scalars['Base64']['output']>;
  protocolPubKey?: Maybe<Scalars['Base64']['output']>;
  workerAddress?: Maybe<Scalars['String']['output']>;
  workerPubKey?: Maybe<Scalars['Base64']['output']>;
};

/** An edge in a connection. */
export type ValidatorEdge = {
  __typename?: 'ValidatorEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Validator;
};

/** Representation of `0x3::validator_set::ValidatorSet`. */
export type ValidatorSet = {
  __typename?: 'ValidatorSet';
  /** The current list of active validators. */
  activeValidators?: Maybe<ValidatorConnection>;
  /** Object ID of the `Table` storing the inactive staking pools. */
  inactivePoolsId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Size of the inactive pools `Table`. */
  inactivePoolsSize?: Maybe<Scalars['Int']['output']>;
  /** Object ID of the wrapped object `TableVec` storing the pending active validators. */
  pendingActiveValidatorsId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Size of the pending active validators table. */
  pendingActiveValidatorsSize?: Maybe<Scalars['Int']['output']>;
  /** Validators that are pending removal from the active validator set, expressed as indices in to `activeValidators`. */
  pendingRemovals?: Maybe<Array<Scalars['Int']['output']>>;
  /**
   * Object ID of the `Table` storing the mapping from staking pool ids to the addresses of the corresponding validators.
   * This is needed because a validator's address can potentially change but the object ID of its pool will not.
   */
  stakingPoolMappingsId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Size of the stake pool mappings `Table`. */
  stakingPoolMappingsSize?: Maybe<Scalars['Int']['output']>;
  /** Total amount of stake for all active validators at the beginning of the epoch. */
  totalStake?: Maybe<Scalars['BigInt']['output']>;
  /** Object ID of the `Table` storing the validator candidates. */
  validatorCandidatesId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Size of the validator candidates `Table`. */
  validatorCandidatesSize?: Maybe<Scalars['Int']['output']>;
};


/** Representation of `0x3::validator_set::ValidatorSet`. */
export type ValidatorSetActiveValidatorsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Filter for paginating the history of an Object or MovePackage. */
export type VersionFilter = {
  /** Filter to versions that are strictly newer than this one, defaults to fetching from the earliest version known to this RPC (this could be the initial version, or some later version if the initial version has been pruned). */
  afterVersion?: InputMaybe<Scalars['UInt53']['input']>;
  /** Filter to versions that are strictly older than this one, defaults to fetching up to the latest version (inclusive). */
  beforeVersion?: InputMaybe<Scalars['UInt53']['input']>;
};

/** An enum that specifies the intent scope to be used to parse the bytes for signature verification. */
export enum ZkLoginIntentScope {
  /** Indicates that the bytes are to be parsed as a personal message. */
  PersonalMessage = 'PERSONAL_MESSAGE',
  /** Indicates that the bytes are to be parsed as transaction data bytes. */
  TransactionData = 'TRANSACTION_DATA'
}

/** The result of the zkLogin signature verification. */
export type ZkLoginVerifyResult = {
  __typename?: 'ZkLoginVerifyResult';
  /** The error field capture reasons why the signature could not be verified, assuming the inputs are valid and there are no internal errors. */
  error?: Maybe<Scalars['String']['output']>;
  /** The boolean result of the verification. If true, errors should be empty. */
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type GetAllBalancesQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAllBalancesQuery = { __typename?: 'Query', address: { __typename?: 'Address', balances?: { __typename?: 'BalanceConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'Balance', totalBalance?: string | null, coinType?: { __typename?: 'MoveType', repr: string } | null }> } | null } };

export type GetBalanceQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  coinType?: Scalars['String']['input'];
}>;


export type GetBalanceQuery = { __typename?: 'Query', address: { __typename?: 'Address', balance?: { __typename?: 'Balance', totalBalance?: string | null, coinType?: { __typename?: 'MoveType', repr: string } | null } | null } };

export type GetCoinsQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  type?: Scalars['String']['input'];
}>;


export type GetCoinsQuery = { __typename?: 'Query', address: { __typename?: 'Address', address: string, objects?: { __typename?: 'MoveObjectConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'MoveObject', address: string, version?: number | null, digest?: string | null, owner?: { __typename: 'AddressOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'ConsensusAddressOwner', startVersion?: number | null, address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Immutable' } | { __typename: 'ObjectOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Shared', initialSharedVersion?: number | null } | null, contents?: { __typename?: 'MoveValue', bcs?: string | null, json?: unknown | null, type?: { __typename?: 'MoveType', repr: string } | null } | null, previousTransaction?: { __typename?: 'Transaction', digest: string } | null }> } | null } };

export type GetDynamicFieldsQueryVariables = Exact<{
  parentId: Scalars['SuiAddress']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetDynamicFieldsQuery = { __typename?: 'Query', address: { __typename?: 'Address', dynamicFields?: { __typename?: 'DynamicFieldConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'DynamicField', name?: { __typename?: 'MoveValue', bcs?: string | null, type?: { __typename?: 'MoveType', repr: string } | null } | null, value?: { __typename: 'MoveObject', contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | { __typename: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null }> } | null } };

export type GetMoveFunctionQueryVariables = Exact<{
  package: Scalars['SuiAddress']['input'];
  module: Scalars['String']['input'];
  function: Scalars['String']['input'];
}>;


export type GetMoveFunctionQuery = { __typename?: 'Query', package?: { __typename?: 'MovePackage', module?: { __typename?: 'MoveModule', function?: { __typename?: 'MoveFunction', name: string, visibility?: MoveVisibility | null, isEntry?: boolean | null, typeParameters?: Array<{ __typename?: 'MoveFunctionTypeParameter', constraints: Array<MoveAbility> }> | null, parameters?: Array<{ __typename?: 'OpenMoveType', signature: OpenMoveTypeSignature }> | null, return?: Array<{ __typename?: 'OpenMoveType', signature: OpenMoveTypeSignature }> | null } | null } | null } | null };

export type GetReferenceGasPriceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetReferenceGasPriceQuery = { __typename?: 'Query', epoch?: { __typename?: 'Epoch', referenceGasPrice?: string | null } | null };

export type DefaultSuinsNameQueryVariables = Exact<{
  address: Scalars['SuiAddress']['input'];
}>;


export type DefaultSuinsNameQuery = { __typename?: 'Query', address: { __typename?: 'Address', defaultSuinsName?: string | null } };

export type GetOwnedObjectsQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
}>;


export type GetOwnedObjectsQuery = { __typename?: 'Query', address: { __typename?: 'Address', objects?: { __typename?: 'MoveObjectConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'MoveObject', address: string, digest?: string | null, version?: number | null, contents?: { __typename?: 'MoveValue', bcs?: string | null, type?: { __typename?: 'MoveType', repr: string } | null } | null, owner?: { __typename: 'AddressOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'ConsensusAddressOwner', startVersion?: number | null, address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Immutable' } | { __typename: 'ObjectOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Shared', initialSharedVersion?: number | null } | null, previousTransaction?: { __typename?: 'Transaction', digest: string } | null }> } | null } };

export type MultiGetObjectsQueryVariables = Exact<{
  objectKeys: Array<ObjectKey> | ObjectKey;
}>;


export type MultiGetObjectsQuery = { __typename?: 'Query', multiGetObjects: Array<{ __typename?: 'Object', address: string, digest?: string | null, version?: number | null, asMoveObject?: { __typename?: 'MoveObject', contents?: { __typename?: 'MoveValue', bcs?: string | null, type?: { __typename?: 'MoveType', repr: string } | null } | null } | null, owner?: { __typename: 'AddressOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'ConsensusAddressOwner', startVersion?: number | null, address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Immutable' } | { __typename: 'ObjectOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Shared', initialSharedVersion?: number | null } | null, previousTransaction?: { __typename?: 'Transaction', digest: string } | null } | null> };

export type Object_FieldsFragment = { __typename?: 'Object', address: string, digest?: string | null, version?: number | null, asMoveObject?: { __typename?: 'MoveObject', contents?: { __typename?: 'MoveValue', bcs?: string | null, type?: { __typename?: 'MoveType', repr: string } | null } | null } | null, owner?: { __typename: 'AddressOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'ConsensusAddressOwner', startVersion?: number | null, address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Immutable' } | { __typename: 'ObjectOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Shared', initialSharedVersion?: number | null } | null, previousTransaction?: { __typename?: 'Transaction', digest: string } | null };

export type Move_Object_FieldsFragment = { __typename?: 'MoveObject', address: string, digest?: string | null, version?: number | null, contents?: { __typename?: 'MoveValue', bcs?: string | null, type?: { __typename?: 'MoveType', repr: string } | null } | null, owner?: { __typename: 'AddressOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'ConsensusAddressOwner', startVersion?: number | null, address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Immutable' } | { __typename: 'ObjectOwner', address?: { __typename?: 'Address', address: string } | null } | { __typename: 'Shared', initialSharedVersion?: number | null } | null, previousTransaction?: { __typename?: 'Transaction', digest: string } | null };

type Object_Owner_Fields_AddressOwner_Fragment = { __typename: 'AddressOwner', address?: { __typename?: 'Address', address: string } | null };

type Object_Owner_Fields_ConsensusAddressOwner_Fragment = { __typename: 'ConsensusAddressOwner', startVersion?: number | null, address?: { __typename?: 'Address', address: string } | null };

type Object_Owner_Fields_Immutable_Fragment = { __typename: 'Immutable' };

type Object_Owner_Fields_ObjectOwner_Fragment = { __typename: 'ObjectOwner', address?: { __typename?: 'Address', address: string } | null };

type Object_Owner_Fields_Shared_Fragment = { __typename: 'Shared', initialSharedVersion?: number | null };

export type Object_Owner_FieldsFragment = Object_Owner_Fields_AddressOwner_Fragment | Object_Owner_Fields_ConsensusAddressOwner_Fragment | Object_Owner_Fields_Immutable_Fragment | Object_Owner_Fields_ObjectOwner_Fragment | Object_Owner_Fields_Shared_Fragment;

export type SimulateTransactionQueryVariables = Exact<{
  transaction: Scalars['JSON']['input'];
}>;


export type SimulateTransactionQuery = { __typename?: 'Query', simulateTransaction: { __typename?: 'SimulationResult', error?: string | null, effects?: { __typename?: 'TransactionEffects', transaction?: { __typename?: 'Transaction', digest: string, transactionBcs?: string | null, signatures: Array<{ __typename?: 'UserSignature', signatureBytes?: string | null }>, effects?: { __typename?: 'TransactionEffects', effectsBcs?: string | null, epoch?: { __typename?: 'Epoch', epochId: number } | null, unchangedConsensusObjects?: { __typename?: 'UnchangedConsensusObjectConnection', nodes: Array<{ __typename: 'ConsensusObjectCancelled' } | { __typename: 'ConsensusObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null } | { __typename: 'MutateConsensusStreamEnded' } | { __typename: 'PerEpochConfig' } | { __typename: 'ReadConsensusStreamEnded' }> } | null, objectChanges?: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: string, inputState?: { __typename?: 'Object', version?: number | null, asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null }> } | null, balanceChanges?: { __typename?: 'BalanceChangeConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, nodes: Array<{ __typename?: 'BalanceChange', amount?: string | null, owner?: { __typename?: 'Address', address: string } | null, coinType?: { __typename?: 'MoveType', repr: string } | null }> } | null } | null } | null } | null } };

export type ExecuteTransactionMutationVariables = Exact<{
  transactionDataBcs: Scalars['Base64']['input'];
  signatures: Array<Scalars['Base64']['input']> | Scalars['Base64']['input'];
}>;


export type ExecuteTransactionMutation = { __typename?: 'Mutation', executeTransaction: { __typename?: 'ExecutionResult', errors?: Array<string> | null, effects?: { __typename?: 'TransactionEffects', transaction?: { __typename?: 'Transaction', digest: string, transactionBcs?: string | null, signatures: Array<{ __typename?: 'UserSignature', signatureBytes?: string | null }>, effects?: { __typename?: 'TransactionEffects', effectsBcs?: string | null, epoch?: { __typename?: 'Epoch', epochId: number } | null, unchangedConsensusObjects?: { __typename?: 'UnchangedConsensusObjectConnection', nodes: Array<{ __typename: 'ConsensusObjectCancelled' } | { __typename: 'ConsensusObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null } | { __typename: 'MutateConsensusStreamEnded' } | { __typename: 'PerEpochConfig' } | { __typename: 'ReadConsensusStreamEnded' }> } | null, objectChanges?: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: string, inputState?: { __typename?: 'Object', version?: number | null, asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null }> } | null, balanceChanges?: { __typename?: 'BalanceChangeConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, nodes: Array<{ __typename?: 'BalanceChange', amount?: string | null, owner?: { __typename?: 'Address', address: string } | null, coinType?: { __typename?: 'MoveType', repr: string } | null }> } | null } | null } | null } | null } };

export type GetTransactionBlockQueryVariables = Exact<{
  digest: Scalars['String']['input'];
}>;


export type GetTransactionBlockQuery = { __typename?: 'Query', transaction?: { __typename?: 'Transaction', digest: string, transactionBcs?: string | null, signatures: Array<{ __typename?: 'UserSignature', signatureBytes?: string | null }>, effects?: { __typename?: 'TransactionEffects', effectsBcs?: string | null, epoch?: { __typename?: 'Epoch', epochId: number } | null, unchangedConsensusObjects?: { __typename?: 'UnchangedConsensusObjectConnection', nodes: Array<{ __typename: 'ConsensusObjectCancelled' } | { __typename: 'ConsensusObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null } | { __typename: 'MutateConsensusStreamEnded' } | { __typename: 'PerEpochConfig' } | { __typename: 'ReadConsensusStreamEnded' }> } | null, objectChanges?: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: string, inputState?: { __typename?: 'Object', version?: number | null, asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null }> } | null, balanceChanges?: { __typename?: 'BalanceChangeConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, nodes: Array<{ __typename?: 'BalanceChange', amount?: string | null, owner?: { __typename?: 'Address', address: string } | null, coinType?: { __typename?: 'MoveType', repr: string } | null }> } | null } | null } | null };

export type Transaction_FieldsFragment = { __typename?: 'Transaction', digest: string, transactionBcs?: string | null, signatures: Array<{ __typename?: 'UserSignature', signatureBytes?: string | null }>, effects?: { __typename?: 'TransactionEffects', effectsBcs?: string | null, epoch?: { __typename?: 'Epoch', epochId: number } | null, unchangedConsensusObjects?: { __typename?: 'UnchangedConsensusObjectConnection', nodes: Array<{ __typename: 'ConsensusObjectCancelled' } | { __typename: 'ConsensusObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null } | { __typename: 'MutateConsensusStreamEnded' } | { __typename: 'PerEpochConfig' } | { __typename: 'ReadConsensusStreamEnded' }> } | null, objectChanges?: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: string, inputState?: { __typename?: 'Object', version?: number | null, asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: string, contents?: { __typename?: 'MoveValue', type?: { __typename?: 'MoveType', repr: string } | null } | null } | null } | null }> } | null, balanceChanges?: { __typename?: 'BalanceChangeConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, nodes: Array<{ __typename?: 'BalanceChange', amount?: string | null, owner?: { __typename?: 'Address', address: string } | null, coinType?: { __typename?: 'MoveType', repr: string } | null }> } | null } | null };

export type VerifyZkLoginSignatureQueryVariables = Exact<{
  bytes: Scalars['Base64']['input'];
  signature: Scalars['Base64']['input'];
  intentScope: ZkLoginIntentScope;
  author: Scalars['SuiAddress']['input'];
}>;


export type VerifyZkLoginSignatureQuery = { __typename?: 'Query', verifyZkLoginSignature: { __typename?: 'ZkLoginVerifyResult', success?: boolean | null, error?: string | null } };

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
  asMoveObject {
    contents {
      bcs
      type {
        repr
      }
    }
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction {
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
  contents {
    bcs
    type {
      repr
    }
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction {
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
  transactionBcs
  signatures {
    signatureBytes
  }
  effects {
    effectsBcs
    epoch {
      epochId
    }
    unchangedConsensusObjects {
      nodes {
        __typename
        ... on ConsensusObjectRead {
          object {
            asMoveObject {
              address
              contents {
                type {
                  repr
                }
              }
            }
          }
        }
      }
    }
    objectChanges {
      nodes {
        address
        inputState {
          version
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
        outputState {
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChanges(first: 50) {
      pageInfo {
        hasNextPage
      }
      nodes {
        owner {
          address
        }
        coinType {
          repr
        }
        amount
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
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetAllBalancesQuery, GetAllBalancesQueryVariables>;
export const GetBalanceDocument = new TypedDocumentString(`
    query getBalance($owner: SuiAddress!, $coinType: String! = "0x2::sui::SUI") {
  address(address: $owner) {
    balance(coinType: $coinType) {
      coinType {
        repr
      }
      totalBalance
    }
  }
}
    `) as unknown as TypedDocumentString<GetBalanceQuery, GetBalanceQueryVariables>;
export const GetCoinsDocument = new TypedDocumentString(`
    query getCoins($owner: SuiAddress!, $first: Int, $cursor: String, $type: String! = "0x2::coin::Coin<0x2::sui::SUI>") {
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
          bcs
          json
          type {
            repr
          }
        }
        address
        version
        digest
        previousTransaction {
          digest
        }
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
export const GetDynamicFieldsDocument = new TypedDocumentString(`
    query getDynamicFields($parentId: SuiAddress!, $first: Int, $cursor: String) {
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
            type {
              repr
            }
          }
          ... on MoveObject {
            contents {
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
    defaultSuinsName
  }
}
    `) as unknown as TypedDocumentString<DefaultSuinsNameQuery, DefaultSuinsNameQueryVariables>;
export const GetOwnedObjectsDocument = new TypedDocumentString(`
    query getOwnedObjects($owner: SuiAddress!, $limit: Int, $cursor: String, $filter: ObjectFilter) {
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
  contents {
    bcs
    type {
      repr
    }
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction {
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
    query multiGetObjects($objectKeys: [ObjectKey!]!) {
  multiGetObjects(keys: $objectKeys) {
    ...OBJECT_FIELDS
  }
}
    fragment OBJECT_FIELDS on Object {
  address
  digest
  version
  asMoveObject {
    contents {
      bcs
      type {
        repr
      }
    }
  }
  owner {
    ...OBJECT_OWNER_FIELDS
  }
  previousTransaction {
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
    query simulateTransaction($transaction: JSON!) {
  simulateTransaction(transaction: $transaction) {
    error
    effects {
      transaction {
        ...TRANSACTION_FIELDS
      }
    }
  }
}
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionBcs
  signatures {
    signatureBytes
  }
  effects {
    effectsBcs
    epoch {
      epochId
    }
    unchangedConsensusObjects {
      nodes {
        __typename
        ... on ConsensusObjectRead {
          object {
            asMoveObject {
              address
              contents {
                type {
                  repr
                }
              }
            }
          }
        }
      }
    }
    objectChanges {
      nodes {
        address
        inputState {
          version
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
        outputState {
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChanges(first: 50) {
      pageInfo {
        hasNextPage
      }
      nodes {
        owner {
          address
        }
        coinType {
          repr
        }
        amount
      }
    }
  }
}`) as unknown as TypedDocumentString<SimulateTransactionQuery, SimulateTransactionQueryVariables>;
export const ExecuteTransactionDocument = new TypedDocumentString(`
    mutation executeTransaction($transactionDataBcs: Base64!, $signatures: [Base64!]!) {
  executeTransaction(
    transactionDataBcs: $transactionDataBcs
    signatures: $signatures
  ) {
    errors
    effects {
      transaction {
        ...TRANSACTION_FIELDS
      }
    }
  }
}
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionBcs
  signatures {
    signatureBytes
  }
  effects {
    effectsBcs
    epoch {
      epochId
    }
    unchangedConsensusObjects {
      nodes {
        __typename
        ... on ConsensusObjectRead {
          object {
            asMoveObject {
              address
              contents {
                type {
                  repr
                }
              }
            }
          }
        }
      }
    }
    objectChanges {
      nodes {
        address
        inputState {
          version
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
        outputState {
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChanges(first: 50) {
      pageInfo {
        hasNextPage
      }
      nodes {
        owner {
          address
        }
        coinType {
          repr
        }
        amount
      }
    }
  }
}`) as unknown as TypedDocumentString<ExecuteTransactionMutation, ExecuteTransactionMutationVariables>;
export const GetTransactionBlockDocument = new TypedDocumentString(`
    query getTransactionBlock($digest: String!) {
  transaction(digest: $digest) {
    ...TRANSACTION_FIELDS
  }
}
    fragment TRANSACTION_FIELDS on Transaction {
  digest
  transactionBcs
  signatures {
    signatureBytes
  }
  effects {
    effectsBcs
    epoch {
      epochId
    }
    unchangedConsensusObjects {
      nodes {
        __typename
        ... on ConsensusObjectRead {
          object {
            asMoveObject {
              address
              contents {
                type {
                  repr
                }
              }
            }
          }
        }
      }
    }
    objectChanges {
      nodes {
        address
        inputState {
          version
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
        outputState {
          asMoveObject {
            address
            contents {
              type {
                repr
              }
            }
          }
        }
      }
    }
    balanceChanges(first: 50) {
      pageInfo {
        hasNextPage
      }
      nodes {
        owner {
          address
        }
        coinType {
          repr
        }
        amount
      }
    }
  }
}`) as unknown as TypedDocumentString<GetTransactionBlockQuery, GetTransactionBlockQueryVariables>;
export const VerifyZkLoginSignatureDocument = new TypedDocumentString(`
    query verifyZkLoginSignature($bytes: Base64!, $signature: Base64!, $intentScope: ZkLoginIntentScope!, $author: SuiAddress!) {
  verifyZkLoginSignature(
    bytes: $bytes
    signature: $signature
    intentScope: $intentScope
    author: $author
  ) {
    success
    error
  }
}
    `) as unknown as TypedDocumentString<VerifyZkLoginSignatureQuery, VerifyZkLoginSignatureQueryVariables>;