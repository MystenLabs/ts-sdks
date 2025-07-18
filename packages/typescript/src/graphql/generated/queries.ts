// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable */

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
  Base64: { input: any; output: any; }
  /** String representation of an arbitrary width, possibly signed integer. */
  BigInt: { input: any; output: any; }
  /** ISO-8601 Date and Time: RFC3339 in UTC with format: YYYY-MM-DDTHH:MM:SS.mmmZ. Note that the milliseconds part is optional, and it may be omitted if its value is 0. */
  DateTime: { input: any; output: any; }
  /** Arbitrary JSON data. */
  JSON: { input: any; output: any; }
  /**
   * The contents of a Move Value, corresponding to the following recursive type:
   *
   * type MoveData =
   *     { Address: SuiAddress }
   *   | { UID:     SuiAddress }
   *   | { ID:      SuiAddress }
   *   | { Bool:    bool }
   *   | { Number:  BigInt }
   *   | { String:  string }
   *   | { Vector:  [MoveData] }
   *   | { Option:   MoveData? }
   *   | { Struct:  [{ name: string , value: MoveData }] }
   *   | { Variant: {
   *       name: string,
   *       fields: [{ name: string, value: MoveData }],
   *   }
   */
  MoveData: { input: any; output: any; }
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
  MoveTypeLayout: { input: any; output: any; }
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
  MoveTypeSignature: { input: any; output: any; }
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
  OpenMoveTypeSignature: { input: any; output: any; }
  /** String containing 32B hex-encoded address, with a leading "0x". Leading zeroes can be omitted on input but will always appear in outputs (SuiAddress in output is guaranteed to be 66 characters long). */
  SuiAddress: { input: any; output: any; }
  /**
   * An unsigned integer that can hold values up to 2^53 - 1. This can be treated similarly to `Int`,
   * but it is guaranteed to be non-negative, and it may be larger than 2^32 - 1.
   */
  UInt53: { input: any; output: any; }
};

export type ActiveJwk = {
  __typename?: 'ActiveJwk';
  /** The JWK algorithm parameter, (RFC 7517, Section 4.4). */
  alg: Scalars['String']['output'];
  /** The JWK RSA public exponent, (RFC 7517, Section 9.3). */
  e: Scalars['String']['output'];
  /** The most recent epoch in which the JWK was validated. */
  epoch?: Maybe<Epoch>;
  /** The string (Issuing Authority) that identifies the OIDC provider. */
  iss: Scalars['String']['output'];
  /** The string (Key ID) that identifies the JWK among a set of JWKs, (RFC 7517, Section 4.5). */
  kid: Scalars['String']['output'];
  /** The JWK key type parameter, (RFC 7517, Section 4.1). */
  kty: Scalars['String']['output'];
  /** The JWK RSA modulus, (RFC 7517, Section 9.3). */
  n: Scalars['String']['output'];
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

/** The 32-byte address that is an account address (corresponding to a public key). */
export type Address = IOwner & {
  __typename?: 'Address';
  address: Scalars['SuiAddress']['output'];
  /**
   * Total balance of all coins with marker type owned by this address. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this address. */
  balances: BalanceConnection;
  /**
   * The coin objects for this address.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /** The domain explicitly configured as the default domain pointing to this address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** Objects owned by this address, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this address. */
  stakedSuis: StakedSuiConnection;
  /**
   * The SuinsRegistration NFTs owned by this address. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  /**
   * Similar behavior to the `transactionBlocks` in Query but supporting the additional
   * `AddressTransactionBlockRelationship` filter, which defaults to `SENT`.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  transactionBlocks: TransactionBlockConnection;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The 32-byte address that is an account address (corresponding to a public key). */
export type AddressTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  relation?: InputMaybe<AddressTransactionBlockRelationship>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};

export type AddressConnection = {
  __typename?: 'AddressConnection';
  /** A list of edges. */
  edges: Array<AddressEdge>;
  /** A list of nodes. */
  nodes: Array<Address>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type AddressEdge = {
  __typename?: 'AddressEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Address;
};

/**
 * An address-owned object is owned by a specific 32-byte address that is
 * either an account address (derived from a particular signature scheme) or
 * an object ID. An address-owned object is accessible only to its owner and no others.
 */
export type AddressOwner = {
  __typename?: 'AddressOwner';
  owner?: Maybe<Owner>;
};

/** The possible relationship types for a transaction block: sent, or received. */
export enum AddressTransactionBlockRelationship {
  /**
   * Transactions that this address was involved in, either as the sender, sponsor, or as the
   * owner of some object that was created, modified or transfered.
   */
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

export type AuthenticatorStateExpireTransaction = {
  __typename?: 'AuthenticatorStateExpireTransaction';
  /** The initial version that the AuthenticatorStateUpdate was shared at. */
  authenticatorObjInitialSharedVersion: Scalars['UInt53']['output'];
  /** Expire JWKs that have a lower epoch than this. */
  minEpoch?: Maybe<Epoch>;
};

/** System transaction for updating the on-chain state used by zkLogin. */
export type AuthenticatorStateUpdateTransaction = {
  __typename?: 'AuthenticatorStateUpdateTransaction';
  /** The initial version of the authenticator object that it was shared at. */
  authenticatorObjInitialSharedVersion: Scalars['UInt53']['output'];
  /** Epoch of the authenticator state update transaction. */
  epoch?: Maybe<Epoch>;
  /** Newly active JWKs (JSON Web Keys). */
  newActiveJwks: ActiveJwkConnection;
  /** Consensus round of the authenticator state update. */
  round: Scalars['UInt53']['output'];
};


/** System transaction for updating the on-chain state used by zkLogin. */
export type AuthenticatorStateUpdateTransactionNewActiveJwksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Range of checkpoints that the RPC is guaranteed to produce a consistent response for. */
export type AvailableRange = {
  __typename?: 'AvailableRange';
  first?: Maybe<Checkpoint>;
  last?: Maybe<Checkpoint>;
};

/** The total balance for a particular coin type. */
export type Balance = {
  __typename?: 'Balance';
  /** How many coins of this type constitute the balance */
  coinObjectCount?: Maybe<Scalars['UInt53']['output']>;
  /** Coin type for the balance, such as 0x2::sui::SUI */
  coinType: MoveType;
  /** Total balance across all coin objects of the coin type */
  totalBalance?: Maybe<Scalars['BigInt']['output']>;
};

/** Effects to the balance (sum of coin values per coin type) owned by an address or object. */
export type BalanceChange = {
  __typename?: 'BalanceChange';
  /** The signed balance change. */
  amount?: Maybe<Scalars['BigInt']['output']>;
  /** The inner type of the coin whose balance has changed (e.g. `0x2::sui::SUI`). */
  coinType?: Maybe<MoveType>;
  /** The address or object whose balance has changed. */
  owner?: Maybe<Owner>;
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

export type BridgeCommitteeInitTransaction = {
  __typename?: 'BridgeCommitteeInitTransaction';
  bridgeObjInitialSharedVersion: Scalars['UInt53']['output'];
};

export type BridgeStateCreateTransaction = {
  __typename?: 'BridgeStateCreateTransaction';
  chainId: Scalars['String']['output'];
};

/**
 * A system transaction that updates epoch information on-chain (increments the current epoch).
 * Executed by the system once per epoch, without using gas. Epoch change transactions cannot be
 * submitted by users, because validators will refuse to sign them.
 *
 * This transaction kind is deprecated in favour of `EndOfEpochTransaction`.
 */
export type ChangeEpochTransaction = {
  __typename?: 'ChangeEpochTransaction';
  /** The total amount of gas charged for computation during the previous epoch (in MIST). */
  computationCharge: Scalars['BigInt']['output'];
  /** The next (to become) epoch. */
  epoch?: Maybe<Epoch>;
  /**
   * The total gas retained from storage fees, that will not be returned by storage rebates when
   * the relevant objects are cleaned up (in MIST).
   */
  nonRefundableStorageFee: Scalars['BigInt']['output'];
  /** The protocol version in effect in the new epoch. */
  protocolVersion: Scalars['UInt53']['output'];
  /** Time at which the next epoch will start. */
  startTimestamp: Scalars['DateTime']['output'];
  /** The total amount of gas charged for storage during the previous epoch (in MIST). */
  storageCharge: Scalars['BigInt']['output'];
  /** The SUI returned to transaction senders for cleaning up objects (in MIST). */
  storageRebate: Scalars['BigInt']['output'];
  /**
   * System packages (specifically framework and move stdlib) that are written before the new
   * epoch starts, to upgrade them on-chain. Validators write these packages out when running the
   * transaction.
   */
  systemPackages: MovePackageConnection;
};


/**
 * A system transaction that updates epoch information on-chain (increments the current epoch).
 * Executed by the system once per epoch, without using gas. Epoch change transactions cannot be
 * submitted by users, because validators will refuse to sign them.
 *
 * This transaction kind is deprecated in favour of `EndOfEpochTransaction`.
 */
export type ChangeEpochTransactionSystemPackagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Checkpoints contain finalized transactions and are used for node synchronization
 * and global transaction ordering.
 */
export type Checkpoint = {
  __typename?: 'Checkpoint';
  /** The Base64 serialized BCS bytes of CheckpointSummary for this checkpoint. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * A 32-byte hash that uniquely identifies the checkpoint contents, encoded in Base58. This
   * hash can be used to verify checkpoint contents by checking signatures against the committee,
   * Hashing contents to match digest, and checking that the previous checkpoint digest matches.
   */
  digest: Scalars['String']['output'];
  /** The epoch this checkpoint is part of. */
  epoch?: Maybe<Epoch>;
  /** The total number of transaction blocks in the network by the end of this checkpoint. */
  networkTotalTransactions?: Maybe<Scalars['UInt53']['output']>;
  /** The digest of the checkpoint at the previous sequence number. */
  previousCheckpointDigest?: Maybe<Scalars['String']['output']>;
  /**
   * The computation cost, storage cost, storage rebate, and non-refundable storage fee
   * accumulated during this epoch, up to and including this checkpoint. These values increase
   * monotonically across checkpoints in the same epoch, and reset on epoch boundaries.
   */
  rollingGasSummary?: Maybe<GasCostSummary>;
  /**
   * This checkpoint's position in the total order of finalized checkpoints, agreed upon by
   * consensus.
   */
  sequenceNumber: Scalars['UInt53']['output'];
  /**
   * The timestamp at which the checkpoint is agreed to have happened according to consensus.
   * Transactions that access time in this checkpoint will observe this timestamp.
   */
  timestamp: Scalars['DateTime']['output'];
  /**
   * Transactions in this checkpoint.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range consists of all transactions in this checkpoint.
   */
  transactionBlocks: TransactionBlockConnection;
  /**
   * This is an aggregation of signatures from a quorum of validators for the checkpoint
   * proposal.
   */
  validatorSignatures: Scalars['Base64']['output'];
};


/**
 * Checkpoints contain finalized transactions and are used for node synchronization
 * and global transaction ordering.
 */
export type CheckpointTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
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

/** Filter either by the digest, or the sequence number, or neither, to get the latest checkpoint. */
export type CheckpointId = {
  digest?: InputMaybe<Scalars['String']['input']>;
  sequenceNumber?: InputMaybe<Scalars['UInt53']['input']>;
};

/** Some 0x2::coin::Coin Move object. */
export type Coin = IMoveObject & IObject & IOwner & {
  __typename?: 'Coin';
  address: Scalars['SuiAddress']['output'];
  /**
   * Total balance of all coins with marker type owned by this object. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object. */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /** Balance of this coin object. */
  coinBalance?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The coin objects for this object.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /**
   * Displays the contents of the Move object in a JSON string and through GraphQL types. Also
   * provides the flat representation of the type signature, and the BCS of the corresponding
   * data.
   */
  contents?: Maybe<MoveValue>;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The set of named templates defined on-chain for the type of this object, to be handled
   * off-chain. The server substitutes data from the object into these templates to generate a
   * display string per template.
   */
  display?: Maybe<Array<DisplayEntry>>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Determines whether a transaction can transfer this object, using the TransferObjects
   * transaction command or `sui::transfer::public_transfer`, both of which require the object to
   * have the `key` and `store` abilities.
   */
  hasPublicTransfer: Scalars['Boolean']['output'];
  /** Objects owned by this object, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The owner type of this object: Immutable, Shared, Parent, Address */
  owner?: Maybe<ObjectOwner>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that sent objects to this object.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object. */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this object. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  version: Scalars['UInt53']['output'];
};


/** Some 0x2::coin::Coin Move object. */
export type CoinBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinDynamicFieldArgs = {
  name: DynamicFieldName;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Some 0x2::coin::Coin Move object. */
export type CoinSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type CoinConnection = {
  __typename?: 'CoinConnection';
  /** A list of edges. */
  edges: Array<CoinEdge>;
  /** A list of nodes. */
  nodes: Array<Coin>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type CoinDenyListStateCreateTransaction = {
  __typename?: 'CoinDenyListStateCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** An edge in a connection. */
export type CoinEdge = {
  __typename?: 'CoinEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Coin;
};

/** The metadata for a coin type. */
export type CoinMetadata = IMoveObject & IObject & IOwner & {
  __typename?: 'CoinMetadata';
  address: Scalars['SuiAddress']['output'];
  /**
   * Total balance of all coins with marker type owned by this object. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object. */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * The coin objects for this object.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /**
   * Displays the contents of the Move object in a JSON string and through GraphQL types. Also
   * provides the flat representation of the type signature, and the BCS of the corresponding
   * data.
   */
  contents?: Maybe<MoveValue>;
  /** The number of decimal places used to represent the token. */
  decimals?: Maybe<Scalars['Int']['output']>;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** Optional description of the token, provided by the creator of the token. */
  description?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The set of named templates defined on-chain for the type of this object, to be handled
   * off-chain. The server substitutes data from the object into these templates to generate a
   * display string per template.
   */
  display?: Maybe<Array<DisplayEntry>>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Determines whether a transaction can transfer this object, using the TransferObjects
   * transaction command or `sui::transfer::public_transfer`, both of which require the object to
   * have the `key` and `store` abilities.
   */
  hasPublicTransfer: Scalars['Boolean']['output'];
  iconUrl?: Maybe<Scalars['String']['output']>;
  /** Full, official name of the token. */
  name?: Maybe<Scalars['String']['output']>;
  /** Objects owned by this object, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The owner type of this object: Immutable, Shared, Parent, Address */
  owner?: Maybe<ObjectOwner>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that sent objects to this object.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object. */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this object. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  /** The overall quantity of tokens that will be issued. */
  supply?: Maybe<Scalars['BigInt']['output']>;
  /** The token's identifying abbreviation. */
  symbol?: Maybe<Scalars['String']['output']>;
  version: Scalars['UInt53']['output'];
};


/** The metadata for a coin type. */
export type CoinMetadataBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/** The metadata for a coin type. */
export type CoinMetadataDynamicFieldArgs = {
  name: DynamicFieldName;
};


/** The metadata for a coin type. */
export type CoinMetadataDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/** The metadata for a coin type. */
export type CoinMetadataObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The metadata for a coin type. */
export type CoinMetadataSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Same as AddressOwner, but the object is versioned by consensus. */
export type ConsensusAddressOwner = {
  __typename?: 'ConsensusAddressOwner';
  owner?: Maybe<Owner>;
  startVersion: Scalars['UInt53']['output'];
};

/**
 * System transaction that runs at the beginning of a checkpoint, and is responsible for setting
 * the current value of the clock, based on the timestamp from consensus.
 */
export type ConsensusCommitPrologueTransaction = {
  __typename?: 'ConsensusCommitPrologueTransaction';
  /** Unix timestamp from consensus. */
  commitTimestamp: Scalars['DateTime']['output'];
  /**
   * Digest of consensus output, encoded as a Base58 string (only available from V2 of the
   * transaction).
   */
  consensusCommitDigest?: Maybe<Scalars['String']['output']>;
  /** Epoch of the commit prologue transaction. */
  epoch?: Maybe<Epoch>;
  /** Consensus round of the commit. */
  round: Scalars['UInt53']['output'];
};

export type DependencyConnection = {
  __typename?: 'DependencyConnection';
  /** A list of edges. */
  edges: Array<DependencyEdge>;
  /** A list of nodes. */
  nodes: Array<TransactionBlock>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type DependencyEdge = {
  __typename?: 'DependencyEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node?: Maybe<TransactionBlock>;
};

/**
 * The set of named templates defined on-chain for the type of this object,
 * to be handled off-chain. The server substitutes data from the object
 * into these templates to generate a display string per template.
 */
export type DisplayEntry = {
  __typename?: 'DisplayEntry';
  /** An error string describing why the template could not be rendered. */
  error?: Maybe<Scalars['String']['output']>;
  /** The identifier for a particular template string of the Display object. */
  key: Scalars['String']['output'];
  /** The template string for the key with placeholder values substituted. */
  value?: Maybe<Scalars['String']['output']>;
};

export enum DomainFormat {
  At = 'AT',
  Dot = 'DOT'
}

export type DryRunEffect = {
  __typename?: 'DryRunEffect';
  /** Changes made to arguments that were mutably borrowed by each command in this transaction. */
  mutatedReferences?: Maybe<Array<DryRunMutation>>;
  /** Return results of each command in this transaction. */
  returnValues?: Maybe<Array<DryRunReturn>>;
};

export type DryRunMutation = {
  __typename?: 'DryRunMutation';
  bcs: Scalars['Base64']['output'];
  input: TransactionArgument;
  type: MoveType;
};

export type DryRunResult = {
  __typename?: 'DryRunResult';
  /** The error that occurred during dry run execution, if any. */
  error?: Maybe<Scalars['String']['output']>;
  /**
   * The intermediate results for each command of the dry run execution, including
   * contents of mutated references and return values.
   */
  results?: Maybe<Array<DryRunEffect>>;
  /** The transaction block representing the dry run execution. */
  transaction?: Maybe<TransactionBlock>;
};

export type DryRunReturn = {
  __typename?: 'DryRunReturn';
  bcs: Scalars['Base64']['output'];
  type: MoveType;
};

/**
 * Dynamic fields are heterogeneous fields that can be added or removed at runtime,
 * and can have arbitrary user-assigned names. There are two sub-types of dynamic
 * fields:
 *
 * 1) Dynamic Fields can store any value that has the `store` ability, however an object
 * stored in this kind of field will be considered wrapped and will not be accessible
 * directly via its ID by external tools (explorers, wallets, etc) accessing storage.
 * 2) Dynamic Object Fields values must be Sui objects (have the `key` and `store`
 * abilities, and id: UID as the first field), but will still be directly accessible off-chain
 * via their object ID after being attached.
 */
export type DynamicField = {
  __typename?: 'DynamicField';
  /**
   * The string type, data, and serialized value of the DynamicField's 'name' field.
   * This field is used to uniquely identify a child of the parent object.
   */
  name?: Maybe<MoveValue>;
  /**
   * The returned dynamic field is an object if its return type is `MoveObject`,
   * in which case it is also accessible off-chain via its address. Its contents
   * will be from the latest version that is at most equal to its parent object's
   * version
   */
  value?: Maybe<DynamicFieldValue>;
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

export type DynamicFieldName = {
  /** The Base64 encoded bcs serialization of the DynamicField's 'name' field. */
  bcs: Scalars['Base64']['input'];
  /**
   * The string type of the DynamicField's 'name' field.
   * A string representation of a Move primitive like 'u64', or a struct type like '0x2::kiosk::Listing'
   */
  type: Scalars['String']['input'];
};

export type DynamicFieldValue = MoveObject | MoveValue;

/**
 * System transaction that supersedes `ChangeEpochTransaction` as the new way to run transactions
 * at the end of an epoch. Behaves similarly to `ChangeEpochTransaction` but can accommodate other
 * optional transactions to run at the end of the epoch.
 */
export type EndOfEpochTransaction = {
  __typename?: 'EndOfEpochTransaction';
  /** The list of system transactions that are allowed to run at the end of the epoch. */
  transactions: EndOfEpochTransactionKindConnection;
};


/**
 * System transaction that supersedes `ChangeEpochTransaction` as the new way to run transactions
 * at the end of an epoch. Behaves similarly to `ChangeEpochTransaction` but can accommodate other
 * optional transactions to run at the end of the epoch.
 */
export type EndOfEpochTransactionTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type EndOfEpochTransactionKind = AuthenticatorStateCreateTransaction | AuthenticatorStateExpireTransaction | BridgeCommitteeInitTransaction | BridgeStateCreateTransaction | ChangeEpochTransaction | CoinDenyListStateCreateTransaction | RandomnessStateCreateTransaction | StoreExecutionTimeObservationsTransaction;

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
 * Operation of the Sui network is temporally partitioned into non-overlapping epochs,
 * and the network aims to keep epochs roughly the same duration as each other.
 * During a particular epoch the following data is fixed:
 *
 * - the protocol version
 * - the reference gas price
 * - the set of participating validators
 */
export type Epoch = {
  __typename?: 'Epoch';
  /** The epoch's corresponding checkpoints. */
  checkpoints: CheckpointConnection;
  /** The epoch's ending timestamp. */
  endTimestamp?: Maybe<Scalars['DateTime']['output']>;
  /** The epoch's id as a sequence number that starts at 0 and is incremented by one at every epoch change. */
  epochId: Scalars['UInt53']['output'];
  /** The storage fees paid for transactions executed during the epoch. */
  fundInflow?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The storage fee rebates paid to users who deleted the data associated with past
   * transactions.
   */
  fundOutflow?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The storage fund available in this epoch.
   * This fund is used to redistribute storage fees from past transactions
   * to future validators.
   */
  fundSize?: Maybe<Scalars['BigInt']['output']>;
  /**
   * A commitment by the committee at the end of epoch on the contents of the live object set at
   * that time. This can be used to verify state snapshots.
   */
  liveObjectSetDigest?: Maybe<Scalars['String']['output']>;
  /**
   * The difference between the fund inflow and outflow, representing
   * the net amount of storage fees accumulated in this epoch.
   */
  netInflow?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The epoch's corresponding protocol configuration, including the feature flags and the
   * configuration options.
   */
  protocolConfigs: ProtocolConfigs;
  /** The minimum gas price that a quorum of validators are guaranteed to sign a transaction for. */
  referenceGasPrice?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Information about whether this epoch was started in safe mode, which happens if the full epoch
   * change logic fails for some reason.
   */
  safeMode?: Maybe<SafeMode>;
  /** The epoch's starting timestamp. */
  startTimestamp: Scalars['DateTime']['output'];
  /**
   * SUI set aside to account for objects stored on-chain, at the start of the epoch.
   * This is also used for storage rebates.
   */
  storageFund?: Maybe<StorageFund>;
  /** Details of the system that are decided during genesis. */
  systemParameters?: Maybe<SystemParameters>;
  /** Parameters related to the subsidy that supplements staking rewards */
  systemStakeSubsidy?: Maybe<StakeSubsidy>;
  /**
   * The value of the `version` field of `0x5`, the `0x3::sui::SuiSystemState` object.  This
   * version changes whenever the fields contained in the system state object (held in a dynamic
   * field attached to `0x5`) change.
   */
  systemStateVersion?: Maybe<Scalars['UInt53']['output']>;
  /** The total number of checkpoints in this epoch. */
  totalCheckpoints?: Maybe<Scalars['UInt53']['output']>;
  /** The total amount of gas fees (in MIST) that were paid in this epoch. */
  totalGasFees?: Maybe<Scalars['BigInt']['output']>;
  /** The total MIST rewarded as stake. */
  totalStakeRewards?: Maybe<Scalars['BigInt']['output']>;
  /** The amount added to total gas fees to make up the total stake rewards. */
  totalStakeSubsidies?: Maybe<Scalars['BigInt']['output']>;
  /** The total number of transaction blocks in this epoch. */
  totalTransactions?: Maybe<Scalars['UInt53']['output']>;
  /**
   * The epoch's corresponding transaction blocks.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range consists of all transactions in this epoch.
   */
  transactionBlocks: TransactionBlockConnection;
  /** Validator related properties, including the active validators. */
  validatorSet?: Maybe<ValidatorSet>;
};


/**
 * Operation of the Sui network is temporally partitioned into non-overlapping epochs,
 * and the network aims to keep epochs roughly the same duration as each other.
 * During a particular epoch the following data is fixed:
 *
 * - the protocol version
 * - the reference gas price
 * - the set of participating validators
 */
export type EpochCheckpointsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Operation of the Sui network is temporally partitioned into non-overlapping epochs,
 * and the network aims to keep epochs roughly the same duration as each other.
 * During a particular epoch the following data is fixed:
 *
 * - the protocol version
 * - the reference gas price
 * - the set of participating validators
 */
export type EpochTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
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
  /** The Base64 encoded BCS serialized bytes of the event. */
  bcs: Scalars['Base64']['output'];
  /** The event's contents as a Move value. */
  contents: MoveValue;
  /** Address of the sender of the event */
  sender?: Maybe<Address>;
  /**
   * The Move module containing some function that when called by
   * a programmable transaction block (PTB) emitted this event.
   * For example, if a PTB invokes A::m1::foo, which internally
   * calls A::m2::emit_event to emit an event,
   * the sending module would be A::m1.
   */
  sendingModule?: Maybe<MoveModule>;
  /** UTC timestamp in milliseconds since epoch (1/1/1970) */
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  /**
   * The transaction block that emitted this event. This information is only available for
   * events from indexed transactions, and not from transactions that have just been executed or
   * dry-run.
   */
  transactionBlock?: Maybe<TransactionBlock>;
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
  /**
   * Events emitted by a particular module. An event is emitted by a
   * particular module if some function in the module is called by a
   * PTB and emits an event.
   *
   * Modules can be filtered by their package, or package::module.
   * We currently do not support filtering by emitting module and event type
   * at the same time so if both are provided in one filter, the query will error.
   */
  emittingModule?: InputMaybe<Scalars['String']['input']>;
  /**
   * This field is used to specify the type of event emitted.
   *
   * Events can be filtered by their type's package, package::module,
   * or their fully qualified type name.
   *
   * Generic types can be queried by either the generic type name, e.g.
   * `0x2::coin::Coin`, or by the full type name, such as
   * `0x2::coin::Coin<0x2::sui::SUI>`.
   */
  eventType?: InputMaybe<Scalars['String']['input']>;
  /** Filter down to events from transactions sent by this address. */
  sender?: InputMaybe<Scalars['SuiAddress']['input']>;
  /** Filter down to the events from this transaction (given by its transaction digest). */
  transactionDigest?: InputMaybe<Scalars['String']['input']>;
};

/** The result of an execution, including errors that occurred during said execution. */
export type ExecutionResult = {
  __typename?: 'ExecutionResult';
  /**
   * The effects of the executed transaction. Since the transaction was just executed
   * and not indexed yet, fields including `balance_changes`, `timestamp` and `checkpoint`
   * are not available.
   */
  effects: TransactionBlockEffects;
  /** The errors field captures any errors that occurred during execution */
  errors?: Maybe<Array<Scalars['String']['output']>>;
};

/** The execution status of this transaction block: success or failure. */
export enum ExecutionStatus {
  /** The transaction block could not be executed */
  Failure = 'FAILURE',
  /** The transaction block was successfully executed */
  Success = 'SUCCESS'
}

/**
 * Groups of features served by the RPC service.  The GraphQL Service can be configured to enable
 * or disable these features.
 */
export enum Feature {
  /** Statistics about how the network was running (TPS, top packages, APY, etc) */
  Analytics = 'ANALYTICS',
  /** Coin metadata, per-address coin and balance information. */
  Coins = 'COINS',
  /** Querying an object's dynamic fields. */
  DynamicFields = 'DYNAMIC_FIELDS',
  /** Named packages service (utilizing dotmove package registry). */
  MoveRegistry = 'MOVE_REGISTRY',
  /** SuiNS name and reverse name look-up. */
  NameService = 'NAME_SERVICE',
  /** Transaction and Event subscriptions. */
  Subscriptions = 'SUBSCRIPTIONS',
  /**
   * Aspects that affect the running of the system that are managed by the
   * validators either directly, or through system transactions.
   */
  SystemState = 'SYSTEM_STATE'
}

/**
 * Access to the gas inputs, after they have been smashed into one coin. The gas coin can only be
 * used by reference, except for with `TransferObjectsTransaction` that can accept it by value.
 */
export type GasCoin = {
  __typename?: 'GasCoin';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** Breakdown of gas costs in effects. */
export type GasCostSummary = {
  __typename?: 'GasCostSummary';
  /** Gas paid for executing this transaction (in MIST). */
  computationCost?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Part of storage cost that is not reclaimed when data created by this transaction is cleaned
   * up (in MIST).
   */
  nonRefundableStorageFee?: Maybe<Scalars['BigInt']['output']>;
  /** Gas paid for the data stored on-chain by this transaction (in MIST). */
  storageCost?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Part of storage cost that can be reclaimed by cleaning up data created by this transaction
   * (when objects are deleted or an object is modified, which is treated as a deletion followed
   * by a creation) (in MIST).
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
};

/** Effects related to gas (costs incurred and the identity of the smashed gas object returned). */
export type GasEffects = {
  __typename?: 'GasEffects';
  gasObject?: Maybe<Object>;
  gasSummary?: Maybe<GasCostSummary>;
};

/** Configuration for this transaction's gas price and the coins used to pay for gas. */
export type GasInput = {
  __typename?: 'GasInput';
  /** The maximum number of gas units that can be expended by executing this transaction */
  gasBudget?: Maybe<Scalars['BigInt']['output']>;
  /** Objects used to pay for a transaction's execution and storage */
  gasPayment: ObjectConnection;
  /**
   * An unsigned integer specifying the number of native tokens per gas unit this transaction
   * will pay (in MIST).
   */
  gasPrice?: Maybe<Scalars['BigInt']['output']>;
  /** Address of the owner of the gas object(s) used */
  gasSponsor?: Maybe<Address>;
};


/** Configuration for this transaction's gas price and the coins used to pay for gas. */
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
  objects: ObjectConnection;
};


/** System transaction that initializes the network and writes the initial set of objects on-chain. */
export type GenesisTransactionObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Interface implemented by all GraphQL types that represent a Move datatype (either structs or
 * enums). This interface is used to provide a way to access fields that are shared by both
 * structs and enums, e.g., the module that the datatype belongs to, the name of the datatype,
 * type parameters etc.
 */
export type IMoveDatatype = {
  /** The abilities of the datatype. */
  abilities?: Maybe<Array<MoveAbility>>;
  /** The module that the datatype belongs to. */
  module: MoveModule;
  /** The name of the datatype. */
  name: Scalars['String']['output'];
  /** The type parameters of the datatype. */
  typeParameters?: Maybe<Array<MoveStructTypeParameter>>;
};

/**
 * This interface is implemented by types that represent a Move object on-chain (A Move value whose
 * type has `key`).
 */
export type IMoveObject = {
  /** Displays the contents of the Move object in a JSON string and through GraphQL types. Also provides the flat representation of the type signature, and the BCS of the corresponding data. */
  contents?: Maybe<MoveValue>;
  /** The set of named templates defined on-chain for the type of this object, to be handled off-chain. The server substitutes data from the object into these templates to generate a display string per template. */
  display?: Maybe<Array<DisplayEntry>>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Ownertype.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values whose type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /** Determines whether a transaction can transfer this object, using the TransferObjects transaction command or `sui::transfer::public_transfer`, both of which require the object to have the `key` and `store` abilities. */
  hasPublicTransfer: Scalars['Boolean']['output'];
};


/**
 * This interface is implemented by types that represent a Move object on-chain (A Move value whose
 * type has `key`).
 */
export type IMoveObjectDynamicFieldArgs = {
  name: DynamicFieldName;
};


/**
 * This interface is implemented by types that represent a Move object on-chain (A Move value whose
 * type has `key`).
 */
export type IMoveObjectDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * This interface is implemented by types that represent a Move object on-chain (A Move value whose
 * type has `key`).
 */
export type IMoveObjectDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};

/**
 * Interface implemented by on-chain values that are addressable by an ID (also referred to as its
 * address). This includes Move objects and packages.
 */
export type IObject = {
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /** 32-byte hash that identifies the object's current contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The owner type of this object: Immutable, Shared, Parent, Address
   * Immutable and Shared Objects do not have owners.
   */
  owner?: Maybe<ObjectOwner>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /** The transaction blocks that sent objects to this object. */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The current status of the object as read from the off-chain store. The possible states are: NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or system package upgrade transaction. LIVE, the version returned is the most recent for the object, and it is not deleted or wrapped at that version. HISTORICAL, the object was referenced at a specific version or checkpoint, so is fetched from historical tables and may not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or wrapped and only partial information can be loaded. */
  status: ObjectKind;
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  version: Scalars['UInt53']['output'];
};


/**
 * Interface implemented by on-chain values that are addressable by an ID (also referred to as its
 * address). This includes Move objects and packages.
 */
export type IObjectReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwner = {
  address: Scalars['SuiAddress']['output'];
  /** Total balance of all coins with marker type owned by this object or address. If type is not supplied, it defaults to `0x2::sui::SUI`. */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object or address. */
  balances: BalanceConnection;
  /**
   * The coin objects for this object or address.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /** The domain explicitly configured as the default domain pointing to this object or address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** Objects owned by this object or address, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object or address. */
  stakedSuis: StakedSuiConnection;
  /** The SuinsRegistration NFTs owned by this object or address. These grant the owner the capability to manage the associated domain. */
  suinsRegistrations: SuinsRegistrationConnection;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Interface implemented by GraphQL types representing entities that can own objects. Object owners
 * are identified by an address which can represent either the public key of an account or another
 * object. The same address can only refer to an account or an object, never both, but it is not
 * possible to know which up-front.
 */
export type IOwnerSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * An immutable object is an object that can't be mutated, transferred, or deleted.
 * Immutable objects have no owner, so anyone can use them.
 */
export type Immutable = {
  __typename?: 'Immutable';
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** One of the input objects or primitive values to the programmable transaction block. */
export type Input = {
  __typename?: 'Input';
  /** Index of the programmable transaction block input (0-indexed). */
  ix: Scalars['Int']['output'];
};

/** Information used by a package to link to a specific version of its dependency. */
export type Linkage = {
  __typename?: 'Linkage';
  /** The ID on-chain of the first version of the dependency. */
  originalId: Scalars['SuiAddress']['output'];
  /** The ID on-chain of the version of the dependency that this package depends on. */
  upgradedId: Scalars['SuiAddress']['output'];
  /** The version of the dependency that this package depends on. */
  version: Scalars['UInt53']['output'];
};

/** Create a vector (possibly empty). */
export type MakeMoveVecTransaction = {
  __typename?: 'MakeMoveVecTransaction';
  /** The values to pack into the vector, all of the same type. */
  elements: Array<TransactionArgument>;
  /** If the elements are not objects, or the vector is empty, a type must be supplied. */
  type?: Maybe<MoveType>;
};

/** Merges `coins` into the first `coin` (produces no results). */
export type MergeCoinsTransaction = {
  __typename?: 'MergeCoinsTransaction';
  /** The coin to merge into. */
  coin: TransactionArgument;
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

/** A call to either an entry or a public Move function. */
export type MoveCallTransaction = {
  __typename?: 'MoveCallTransaction';
  /** The actual function parameters passed in for this move call. */
  arguments: Array<TransactionArgument>;
  /** The function being called, resolved. */
  function?: Maybe<MoveFunction>;
  /** The name of the function being called. */
  functionName: Scalars['String']['output'];
  /** The name of the module the function being called is defined in. */
  module: Scalars['String']['output'];
  /** The storage ID of the package the function being called is defined in. */
  package: Scalars['SuiAddress']['output'];
  /** The actual type parameters passed in for this move call. */
  typeArguments: Array<MoveType>;
};

/**
 * The generic representation of a Move datatype (either a struct or an enum) which exposes common
 * fields and information (module, name, abilities, type parameters etc.) that is shared across
 * them.
 */
export type MoveDatatype = IMoveDatatype & {
  __typename?: 'MoveDatatype';
  abilities?: Maybe<Array<MoveAbility>>;
  asMoveEnum?: Maybe<MoveEnum>;
  asMoveStruct?: Maybe<MoveStruct>;
  module: MoveModule;
  name: Scalars['String']['output'];
  typeParameters?: Maybe<Array<MoveStructTypeParameter>>;
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

/** Description of an enum type, defined in a Move module. */
export type MoveEnum = IMoveDatatype & {
  __typename?: 'MoveEnum';
  /** The enum's abilities. */
  abilities?: Maybe<Array<MoveAbility>>;
  /** The module this enum was originally defined in. */
  module: MoveModule;
  /** The enum's (unqualified) type name. */
  name: Scalars['String']['output'];
  /**
   * Constraints on the enum's formal type parameters.  Move bytecode does not name type
   * parameters, so when they are referenced (e.g. in field types) they are identified by their
   * index in this list.
   */
  typeParameters?: Maybe<Array<MoveStructTypeParameter>>;
  /**
   * The names and types of the enum's fields.  Field types reference type parameters, by their
   * index in the defining enum's `typeParameters` list.
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
   * The names and types of the variant's fields.  Field types reference type parameters, by their
   * index in the defining enum's `typeParameters` list.
   */
  fields?: Maybe<Array<MoveField>>;
  /** The name of the variant */
  name: Scalars['String']['output'];
};

/** Information for a particular field on a Move struct. */
export type MoveField = {
  __typename?: 'MoveField';
  name: Scalars['String']['output'];
  type?: Maybe<OpenMoveType>;
};

/** Signature of a function, defined in a Move module. */
export type MoveFunction = {
  __typename?: 'MoveFunction';
  /** Whether the function has the `entry` modifier or not. */
  isEntry?: Maybe<Scalars['Boolean']['output']>;
  /** The module this function was defined in. */
  module: MoveModule;
  /** The function's (unqualified) name. */
  name: Scalars['String']['output'];
  /**
   * The function's parameter types.  These types can reference type parameters introduce by this
   * function (see `typeParameters`).
   */
  parameters?: Maybe<Array<OpenMoveType>>;
  /**
   * The function's return types.  There can be multiple because functions in Move can return
   * multiple values.  These types can reference type parameters introduced by this function (see
   * `typeParameters`).
   */
  return?: Maybe<Array<OpenMoveType>>;
  /**
   * Constraints on the function's formal type parameters.  Move bytecode does not name type
   * parameters, so when they are referenced (e.g. in parameter and return types) they are
   * identified by their index in this list.
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

export type MoveFunctionTypeParameter = {
  __typename?: 'MoveFunctionTypeParameter';
  constraints: Array<MoveAbility>;
};

/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModule = {
  __typename?: 'MoveModule';
  /** The Base64 encoded bcs serialization of the module. */
  bytes?: Maybe<Scalars['Base64']['output']>;
  /** Look-up the definition of a datatype (struct or enum) defined in this module, by its name. */
  datatype?: Maybe<MoveDatatype>;
  /** Iterate through the datatypes (enmums and structs) defined in this module. */
  datatypes?: Maybe<MoveDatatypeConnection>;
  /** Textual representation of the module's bytecode. */
  disassembly?: Maybe<Scalars['String']['output']>;
  /** Look-up the definition of a enum defined in this module, by its name. */
  enum?: Maybe<MoveEnum>;
  /** Iterate through the enums defined in this module. */
  enums?: Maybe<MoveEnumConnection>;
  /** Format version of this module's bytecode. */
  fileFormatVersion: Scalars['Int']['output'];
  /**
   * Modules that this module considers friends (these modules can access `public(friend)`
   * functions from this module).
   */
  friends: MoveModuleConnection;
  /** Look-up the signature of a function defined in this module, by its name. */
  function?: Maybe<MoveFunction>;
  /** Iterate through the signatures of functions defined in this module. */
  functions?: Maybe<MoveFunctionConnection>;
  /** The module's (unqualified) name. */
  name: Scalars['String']['output'];
  /** The package that this Move module was defined in */
  package: MovePackage;
  /** Look-up the definition of a struct defined in this module, by its name. */
  struct?: Maybe<MoveStruct>;
  /** Iterate through the structs defined in this module. */
  structs?: Maybe<MoveStructConnection>;
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleDatatypeArgs = {
  name: Scalars['String']['input'];
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleDatatypesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleEnumArgs = {
  name: Scalars['String']['input'];
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleEnumsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleFriendsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleFunctionArgs = {
  name: Scalars['String']['input'];
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleFunctionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
 */
export type MoveModuleStructArgs = {
  name: Scalars['String']['input'];
};


/**
 * Represents a module in Move, a library that defines struct types
 * and functions that operate on these types.
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

/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObject = IMoveObject & IObject & IOwner & {
  __typename?: 'MoveObject';
  address: Scalars['SuiAddress']['output'];
  /** Attempts to convert the Move object into a `0x2::coin::Coin`. */
  asCoin?: Maybe<Coin>;
  /** Attempts to convert the Move object into a `0x2::coin::CoinMetadata`. */
  asCoinMetadata?: Maybe<CoinMetadata>;
  /** Attempts to convert the Move object into a `0x3::staking_pool::StakedSui`. */
  asStakedSui?: Maybe<StakedSui>;
  /** Attempts to convert the Move object into a `SuinsRegistration` object. */
  asSuinsRegistration?: Maybe<SuinsRegistration>;
  /**
   * Total balance of all coins with marker type owned by this object. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object. */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * The coin objects for this object.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /**
   * Displays the contents of the Move object in a JSON string and through GraphQL types. Also
   * provides the flat representation of the type signature, and the BCS of the corresponding
   * data.
   */
  contents?: Maybe<MoveValue>;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The set of named templates defined on-chain for the type of this object, to be handled
   * off-chain. The server substitutes data from the object into these templates to generate a
   * display string per template.
   */
  display?: Maybe<Array<DisplayEntry>>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Determines whether a transaction can transfer this object, using the TransferObjects
   * transaction command or `sui::transfer::public_transfer`, both of which require the object to
   * have the `key` and `store` abilities.
   */
  hasPublicTransfer: Scalars['Boolean']['output'];
  /** Objects owned by this object, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The owner type of this object: Immutable, Shared, Parent, Address */
  owner?: Maybe<ObjectOwner>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that sent objects to this object.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object. */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this object. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  version: Scalars['UInt53']['output'];
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectDynamicFieldArgs = {
  name: DynamicFieldName;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The representation of an object as a Move Object, which exposes additional information
 * (content, module that governs it, version, is transferrable, etc.) about this object.
 */
export type MoveObjectSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
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

/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackage = IObject & IOwner & {
  __typename?: 'MovePackage';
  address: Scalars['SuiAddress']['output'];
  /**
   * Total balance of all coins with marker type owned by this package. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   *
   * Note that coins owned by a package are inaccessible, because packages are immutable and
   * cannot be owned by an address.
   */
  balance?: Maybe<Balance>;
  /**
   * The balances of all coin types owned by this package.
   *
   * Note that coins owned by a package are inaccessible, because packages are immutable and
   * cannot be owned by an address.
   */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the package's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * The coin objects owned by this package.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   *
   * Note that coins owned by a package are inaccessible, because packages are immutable and
   * cannot be owned by an address.
   */
  coins: CoinConnection;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the package's contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * Fetch the latest version of this package (the package with the highest `version` that shares
   * this packages's original ID)
   */
  latestPackage: MovePackage;
  /** The transitive dependencies of this package. */
  linkage?: Maybe<Array<Linkage>>;
  /**
   * A representation of the module called `name` in this package, including the
   * structs and functions it defines.
   */
  module?: Maybe<MoveModule>;
  /**
   * BCS representation of the package's modules.  Modules appear as a sequence of pairs (module
   * name, followed by module bytes), in alphabetic order by module name.
   */
  moduleBcs?: Maybe<Scalars['Base64']['output']>;
  /** Paginate through the MoveModules defined in this package. */
  modules?: Maybe<MoveModuleConnection>;
  /**
   * Objects owned by this package, optionally `filter`-ed.
   *
   * Note that objects owned by a package are inaccessible, because packages are immutable and
   * cannot be owned by an address.
   */
  objects: MoveObjectConnection;
  /**
   * The owner type of this object: Immutable, Shared, Parent, Address
   * Packages are always Immutable.
   */
  owner?: Maybe<ObjectOwner>;
  /**
   * Fetch another version of this package (the package that shares this package's original ID,
   * but has the specified `version`).
   */
  packageAtVersion?: Maybe<MovePackage>;
  /** BCS representation of the package itself, as a MovePackage. */
  packageBcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * Fetch all versions of this package (packages that share this package's original ID),
   * optionally bounding the versions exclusively from below with `afterVersion`, or from above
   * with `beforeVersion`.
   */
  packageVersions: MovePackageConnection;
  /** The transaction block that published or upgraded this package. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that sent objects to this package.
   *
   * Note that objects that have been sent to a package become inaccessible.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /**
   * The `0x3::staking_pool::StakedSui` objects owned by this package.
   *
   * Note that objects owned by a package are inaccessible, because packages are immutable and
   * cannot be owned by an address.
   */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   *
   * Note that packages cannot be deleted or mutated, so this number is provided purely for
   * reference.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this package. These grant the owner the capability to
   * manage the associated domain.
   *
   * Note that objects owned by a package are inaccessible, because packages are immutable and
   * cannot be owned by an address.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  /** The (previous) versions of this package that introduced its types. */
  typeOrigins?: Maybe<Array<TypeOrigin>>;
  version: Scalars['UInt53']['output'];
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageModuleArgs = {
  name: Scalars['String']['input'];
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageModulesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackagePackageAtVersionArgs = {
  version: Scalars['Int']['input'];
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackagePackageVersionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<MovePackageVersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A MovePackage is a kind of Move object that represents code that has been published on chain.
 * It exposes information about its modules, type definitions, functions, and dependencies.
 */
export type MovePackageSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Filter for paginating `MovePackage`s that were created within a range of checkpoints. */
export type MovePackageCheckpointFilter = {
  /**
   * Fetch packages that were published strictly after this checkpoint. Omitting this fetches
   * packages published since genesis.
   */
  afterCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /**
   * Fetch packages that were published strictly before this checkpoint. Omitting this fetches
   * packages published up to the latest checkpoint (inclusive).
   */
  beforeCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
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

/** Filter for paginating versions of a given `MovePackage`. */
export type MovePackageVersionFilter = {
  /**
   * Fetch versions of this package that are strictly newer than this version. Omitting this
   * fetches versions since the original version.
   */
  afterVersion?: InputMaybe<Scalars['UInt53']['input']>;
  /**
   * Fetch versions of this package that are strictly older than this version. Omitting this
   * fetches versions up to the latest version (inclusive).
   */
  beforeVersion?: InputMaybe<Scalars['UInt53']['input']>;
};

/** Description of a struct type, defined in a Move module. */
export type MoveStruct = IMoveDatatype & {
  __typename?: 'MoveStruct';
  /** Abilities this struct has. */
  abilities?: Maybe<Array<MoveAbility>>;
  /**
   * The names and types of the struct's fields.  Field types reference type parameters, by their
   * index in the defining struct's `typeParameters` list.
   */
  fields?: Maybe<Array<MoveField>>;
  /** The module this struct was originally defined in. */
  module: MoveModule;
  /** The struct's (unqualified) type name. */
  name: Scalars['String']['output'];
  /**
   * Constraints on the struct's formal type parameters.  Move bytecode does not name type
   * parameters, so when they are referenced (e.g. in field types) they are identified by their
   * index in this list.
   */
  typeParameters?: Maybe<Array<MoveStructTypeParameter>>;
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

export type MoveStructTypeParameter = {
  __typename?: 'MoveStructTypeParameter';
  constraints: Array<MoveAbility>;
  isPhantom: Scalars['Boolean']['output'];
};

/** Represents concrete types (no type parameters, no references). */
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
  /** The BCS representation of this value, Base64 encoded. */
  bcs: Scalars['Base64']['output'];
  /** Structured contents of a Move value. */
  data: Scalars['MoveData']['output'];
  /**
   * Representation of a Move value in JSON, where:
   *
   * - Addresses, IDs, and UIDs are represented in canonical form, as JSON strings.
   * - Bools are represented by JSON boolean literals.
   * - u8, u16, and u32 are represented as JSON numbers.
   * - u64, u128, and u256 are represented as JSON strings.
   * - Vectors are represented by JSON arrays.
   * - Structs are represented by JSON objects.
   * - Empty optional values are represented by `null`.
   *
   * This form is offered as a less verbose convenience in cases where the layout of the type is
   * known by the client.
   */
  json: Scalars['JSON']['output'];
  /** The value's Move type. */
  type: MoveType;
};

/**
 * The visibility modifier describes which modules can access this module member.
 * By default, a module member can be called only within the same module.
 */
export enum MoveVisibility {
  /**
   * A friend member can be accessed in the module it is defined in and any other module in
   * its package that is explicitly specified in its friend list.
   */
  Friend = 'FRIEND',
  /** A private member can be accessed in the module it is defined in. */
  Private = 'PRIVATE',
  /** A public member can be accessed by any module. */
  Public = 'PUBLIC'
}

/** Mutations are used to write to the Sui network. */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Execute a transaction, committing its effects on chain.
   *
   * - `txBytes` is a `TransactionData` struct that has been BCS-encoded and then Base64-encoded.
   * - `signatures` are a list of `flag || signature || pubkey` bytes, Base64-encoded.
   *
   * Waits until the transaction has reached finality on chain to return its transaction digest,
   * or returns the error that prevented finality if that was not possible. A transaction is
   * final when its effects are guaranteed on chain (it cannot be revoked).
   *
   * There may be a delay between transaction finality and when GraphQL requests (including the
   * request that issued the transaction) reflect its effects. As a result, queries that depend
   * on indexing the state of the chain (e.g. contents of output objects, address-level balance
   * information at the time of the transaction), must wait for indexing to catch up by polling
   * for the transaction digest using `Query.transactionBlock`.
   */
  executeTransactionBlock: ExecutionResult;
};


/** Mutations are used to write to the Sui network. */
export type MutationExecuteTransactionBlockArgs = {
  signatures: Array<Scalars['String']['input']>;
  txBytes: Scalars['String']['input'];
};

/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type Object = IObject & IOwner & {
  __typename?: 'Object';
  address: Scalars['SuiAddress']['output'];
  /** Attempts to convert the object into a MoveObject */
  asMoveObject?: Maybe<MoveObject>;
  /** Attempts to convert the object into a MovePackage */
  asMovePackage?: Maybe<MovePackage>;
  /**
   * Total balance of all coins with marker type owned by this object. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object. */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * The coin objects for this object.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's current contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The set of named templates defined on-chain for the type of this object, to be handled
   * off-chain. The server substitutes data from the object into these templates to generate a
   * display string per template.
   */
  display?: Maybe<Array<DisplayEntry>>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /** Objects owned by this object, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /**
   * The owner type of this object: Immutable, Shared, Parent, Address
   * Immutable and Shared Objects do not have owners.
   */
  owner?: Maybe<ObjectOwner>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that sent objects to this object.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object. */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this object. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  version: Scalars['UInt53']['output'];
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectDynamicFieldArgs = {
  name: DynamicFieldName;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An object in Sui is a package (set of Move bytecode modules) or object (typed data structure
 * with fields) with additional metadata detailing its id, version, transaction digest, owner
 * field indicating how this object can be accessed.
 */
export type ObjectSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Effect on an individual Object (keyed by its ID). */
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
 * Constrains the set of objects returned. All filters are optional, and the resulting set of
 * objects are ones whose
 *
 * - Type matches the `type` filter,
 * - AND, whose owner matches the `owner` filter,
 * - AND, whose ID is in `objectIds`.
 */
export type ObjectFilter = {
  /** Filter for live objects by their IDs. */
  objectIds?: InputMaybe<Array<Scalars['SuiAddress']['input']>>;
  /** Filter for live objects by their current owners. */
  owner?: InputMaybe<Scalars['SuiAddress']['input']>;
  /**
   * Filter objects by their type's `package`, `package::module`, or their fully qualified type
   * name.
   *
   * Generic types can be queried by either the generic type name, e.g. `0x2::coin::Coin`, or by
   * the full type name, such as `0x2::coin::Coin<0x2::sui::SUI>`.
   */
  type?: InputMaybe<Scalars['String']['input']>;
};

export type ObjectKey = {
  objectId: Scalars['SuiAddress']['input'];
  version: Scalars['UInt53']['input'];
};

export enum ObjectKind {
  /** The object is fetched from the index. */
  Indexed = 'INDEXED',
  /**
   * The object is loaded from serialized data, such as the contents of a transaction that hasn't
   * been indexed yet.
   */
  NotIndexed = 'NOT_INDEXED'
}

/** The object's owner type: Immutable, Shared, Parent, Address, or ConsensusAddress. */
export type ObjectOwner = AddressOwner | ConsensusAddressOwner | Immutable | Parent | Shared;

export type ObjectRef = {
  /** ID of the object. */
  address: Scalars['SuiAddress']['input'];
  /** Digest of the object. */
  digest: Scalars['String']['input'];
  /** Version or sequence number of the object. */
  version: Scalars['UInt53']['input'];
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

/** A Move object, either immutable, or owned mutable. */
export type OwnedOrImmutable = {
  __typename?: 'OwnedOrImmutable';
  /** ID of the object being read. */
  address: Scalars['SuiAddress']['output'];
  /**
   * 32-byte hash that identifies the object's contents at this version, encoded as a Base58
   * string.
   */
  digest: Scalars['String']['output'];
  /** The object at this version.  May not be available due to pruning. */
  object?: Maybe<Object>;
  /** Version of the object being read. */
  version: Scalars['UInt53']['output'];
};

/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type Owner = IOwner & {
  __typename?: 'Owner';
  address: Scalars['SuiAddress']['output'];
  asAddress?: Maybe<Address>;
  asObject?: Maybe<Object>;
  /**
   * Total balance of all coins with marker type owned by this object or address. If type is not
   * supplied, it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object or address. */
  balances: BalanceConnection;
  /**
   * The coin objects for this object or address.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /** The domain explicitly configured as the default domain pointing to this object or address. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * This field exists as a convenience when accessing a dynamic field on a wrapped object.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * This field exists as a convenience when accessing a dynamic field on a wrapped object.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * This field exists as a convenience when accessing a dynamic field on a wrapped object.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /** Objects owned by this object or address, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object or address. */
  stakedSuis: StakedSuiConnection;
  /**
   * The SuinsRegistration NFTs owned by this object or address. These grant the owner the
   * capability to manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerDynamicFieldArgs = {
  name: DynamicFieldName;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * An Owner is an entity that can own an object. Each Owner is identified by a SuiAddress which
 * represents either an Address (corresponding to a public key of an account) or an Object, but
 * never both (it is not known up-front whether a given Owner is an Address or an Object).
 */
export type OwnerSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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

/**
 * If the object's owner is a Parent, this object is part of a dynamic field (it is the value of
 * the dynamic field, or the intermediate Field object itself), and it is owned by another object.
 *
 * Although its owner is guaranteed to be an object, it is exposed as an Owner, as the parent
 * object could be wrapped and therefore not directly accessible.
 */
export type Parent = {
  __typename?: 'Parent';
  parent?: Maybe<Owner>;
};

/** A single transaction, or command, in the programmable transaction block. */
export type ProgrammableTransaction = MakeMoveVecTransaction | MergeCoinsTransaction | MoveCallTransaction | PublishTransaction | SplitCoinsTransaction | TransferObjectsTransaction | UpgradeTransaction;

/**
 * A user transaction that allows the interleaving of native commands (like transfer, split coins,
 * merge coins, etc) and move calls, executed atomically.
 */
export type ProgrammableTransactionBlock = {
  __typename?: 'ProgrammableTransactionBlock';
  /** Input objects or primitive values. */
  inputs: TransactionInputConnection;
  /** The transaction commands, executed sequentially. */
  transactions: ProgrammableTransactionConnection;
};


/**
 * A user transaction that allows the interleaving of native commands (like transfer, split coins,
 * merge coins, etc) and move calls, executed atomically.
 */
export type ProgrammableTransactionBlockInputsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * A user transaction that allows the interleaving of native commands (like transfer, split coins,
 * merge coins, etc) and move calls, executed atomically.
 */
export type ProgrammableTransactionBlockTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ProgrammableTransactionConnection = {
  __typename?: 'ProgrammableTransactionConnection';
  /** A list of edges. */
  edges: Array<ProgrammableTransactionEdge>;
  /** A list of nodes. */
  nodes: Array<ProgrammableTransaction>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type ProgrammableTransactionEdge = {
  __typename?: 'ProgrammableTransactionEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: ProgrammableTransaction;
};

/** A single protocol configuration value. */
export type ProtocolConfigAttr = {
  __typename?: 'ProtocolConfigAttr';
  key: Scalars['String']['output'];
  value?: Maybe<Scalars['String']['output']>;
};

/** Whether or not a single feature is enabled in the protocol config. */
export type ProtocolConfigFeatureFlag = {
  __typename?: 'ProtocolConfigFeatureFlag';
  key: Scalars['String']['output'];
  value: Scalars['Boolean']['output'];
};

/**
 * Constants that control how the chain operates.
 *
 * These can only change during protocol upgrades which happen on epoch boundaries.
 */
export type ProtocolConfigs = {
  __typename?: 'ProtocolConfigs';
  /** Query for the value of the configuration with name `key`. */
  config?: Maybe<ProtocolConfigAttr>;
  /**
   * List all available configurations and their values.  These configurations can take any value
   * (but they will all be represented in string form), and do not include feature flags.
   */
  configs: Array<ProtocolConfigAttr>;
  /** Query for the state of the feature flag with name `key`. */
  featureFlag?: Maybe<ProtocolConfigFeatureFlag>;
  /**
   * List all available feature flags and their values.  Feature flags are a form of boolean
   * configuration that are usually used to gate features while they are in development.  Once a
   * flag has been enabled, it is rare for it to be disabled.
   */
  featureFlags: Array<ProtocolConfigFeatureFlag>;
  /**
   * The protocol is not required to change on every epoch boundary, so the protocol version
   * tracks which change to the protocol these configs are from.
   */
  protocolVersion: Scalars['UInt53']['output'];
};


/**
 * Constants that control how the chain operates.
 *
 * These can only change during protocol upgrades which happen on epoch boundaries.
 */
export type ProtocolConfigsConfigArgs = {
  key: Scalars['String']['input'];
};


/**
 * Constants that control how the chain operates.
 *
 * These can only change during protocol upgrades which happen on epoch boundaries.
 */
export type ProtocolConfigsFeatureFlagArgs = {
  key: Scalars['String']['input'];
};

/** Publishes a Move Package. */
export type PublishTransaction = {
  __typename?: 'PublishTransaction';
  /** IDs of the transitive dependencies of the package to be published. */
  dependencies: Array<Scalars['SuiAddress']['output']>;
  /** Bytecode for the modules to be published, BCS serialized and Base64 encoded. */
  modules: Array<Scalars['Base64']['output']>;
};

/** BCS encoded primitive value (not an object or Move struct). */
export type Pure = {
  __typename?: 'Pure';
  /** BCS serialized and Base64 encoded primitive value. */
  bytes: Scalars['Base64']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Look-up an Account by its SuiAddress. */
  address?: Maybe<Address>;
  /**
   * Range of checkpoints that the RPC has data available for (for data
   * that can be tied to a particular checkpoint).
   */
  availableRange: AvailableRange;
  /**
   * First four bytes of the network's genesis checkpoint digest (uniquely identifies the
   * network).
   */
  chainIdentifier: Scalars['String']['output'];
  /**
   * Fetch checkpoint information by sequence number or digest (defaults to the latest available
   * checkpoint).
   */
  checkpoint?: Maybe<Checkpoint>;
  /** The checkpoints that exist in the network. */
  checkpoints: CheckpointConnection;
  /**
   * The coin metadata associated with the given coin type. Note that if the latest version of
   * the coin's metadata is wrapped or deleted, it will not be found.
   */
  coinMetadata?: Maybe<CoinMetadata>;
  /**
   * The coin objects that exist in the network.
   *
   * The type field is a string of the inner type of the coin by which to filter (e.g.
   * `0x2::sui::SUI`). If no type is provided, it will default to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /**
   * Simulate running a transaction to inspect its effects without
   * committing to them on-chain.
   *
   * `txBytes` either a `TransactionData` struct or a `TransactionKind`
   * struct, BCS-encoded and then Base64-encoded.  The expected
   * type is controlled by the presence or absence of `txMeta`: If
   * present, `txBytes` is assumed to be a `TransactionKind`, if
   * absent, then `TransactionData`.
   *
   * `txMeta` the data that is missing from a `TransactionKind` to make
   * a `TransactionData` (sender address and gas information).  All
   * its fields are nullable.
   *
   * `skipChecks` optional flag to disable the usual verification
   * checks that prevent access to objects that are owned by
   * addresses other than the sender, and calling non-public,
   * non-entry functions, and some other checks.  Defaults to false.
   */
  dryRunTransactionBlock: DryRunResult;
  /** Fetch epoch information by ID (defaults to the latest epoch). */
  epoch?: Maybe<Epoch>;
  epochs: EpochConnection;
  /**
   * Query events that are emitted in the network.
   * We currently do not support filtering by emitting module and event type
   * at the same time so if both are provided in one filter, the query will error.
   */
  events: EventConnection;
  /**
   * The latest version of the package at `address`.
   *
   * This corresponds to the package with the highest `version` that shares its original ID with
   * the package at `address`.
   */
  latestPackage?: Maybe<MovePackage>;
  /** Fetch a list of objects by their IDs and versions. */
  multiGetObjects: Array<Maybe<Object>>;
  /**
   * The object corresponding to the given address at the (optionally) given version.
   * When no version is given, the latest version is returned.
   */
  object?: Maybe<Object>;
  /** The objects that exist in the network. */
  objects: ObjectConnection;
  /**
   * Look up an Owner by its SuiAddress.
   *
   * `rootVersion` represents the version of the root object in some nested chain of dynamic
   * fields. It allows consistent historical queries for the case of wrapped objects, which don't
   * have a version. For example, if querying the dynamic field of a table wrapped in a parent
   * object, passing the parent object's version here will ensure we get the dynamic field's
   * state at the moment that parent's version was created.
   *
   * Also, if this Owner is an object itself, `rootVersion` will be used to bound its version
   * from above when querying `Owner.asObject`. This can be used, for example, to get the
   * contents of a dynamic object field when its parent was at `rootVersion`.
   *
   * If `rootVersion` is omitted, dynamic fields will be from a consistent snapshot of the Sui
   * state at the latest checkpoint known to the GraphQL RPC. Similarly, `Owner.asObject` will
   * return the object's version at the latest checkpoint.
   */
  owner?: Maybe<Owner>;
  /**
   * The package corresponding to the given address (at the optionally given version).
   *
   * When no version is given, the package is loaded directly from the address given. Otherwise,
   * the address is translated before loading to point to the package whose original ID matches
   * the package at `address`, but whose version is `version`. For non-system packages, this
   * might result in a different address than `address` because different versions of a package,
   * introduced by upgrades, exist at distinct addresses.
   *
   * Note that this interpretation of `version` is different from a historical object read (the
   * interpretation of `version` for the `object` query).
   */
  package?: Maybe<MovePackage>;
  /** Fetch a package by its name (using dot move service) */
  packageByName?: Maybe<MovePackage>;
  /**
   * Fetch all versions of package at `address` (packages that share this package's original ID),
   * optionally bounding the versions exclusively from below with `afterVersion`, or from above
   * with `beforeVersion`.
   */
  packageVersions: MovePackageConnection;
  /**
   * The Move packages that exist in the network, optionally filtered to be strictly before
   * `beforeCheckpoint` and/or strictly after `afterCheckpoint`.
   *
   * This query returns all versions of a given user package that appear between the specified
   * checkpoints, but only records the latest versions of system packages.
   */
  packages: MovePackageConnection;
  /**
   * Fetch the protocol config by protocol version (defaults to the latest protocol
   * version known to the GraphQL service).
   */
  protocolConfig: ProtocolConfigs;
  /** Resolves a SuiNS `domain` name to an address, if it has been bound. */
  resolveSuinsAddress?: Maybe<Address>;
  /** Configuration for this RPC service */
  serviceConfig: ServiceConfig;
  /** Fetch a transaction block by its transaction digest. */
  transactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that exist in the network.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  transactionBlocks: TransactionBlockConnection;
  /**
   * Fetch a structured representation of a concrete type, including its layout information.
   * Fails if the type is malformed.
   */
  type: MoveType;
  /** Fetch a type that includes dot move service names in it. */
  typeByName: MoveType;
  /**
   * Verify a zkLogin signature based on the provided transaction or personal message
   * based on current epoch, chain id, and latest JWKs fetched on-chain. If the
   * signature is valid, the function returns a `ZkLoginVerifyResult` with success as
   * true and an empty list of errors. If the signature is invalid, the function returns
   * a `ZkLoginVerifyResult` with success as false with a list of errors.
   *
   * - `bytes` is either the personal message in raw bytes or transaction data bytes in
   * BCS-encoded and then Base64-encoded.
   * - `signature` is a serialized zkLogin signature that is Base64-encoded.
   * - `intentScope` is an enum that specifies the intent scope to be used to parse bytes.
   * - `author` is the address of the signer of the transaction or personal msg.
   */
  verifyZkloginSignature: ZkLoginVerifyResult;
};


export type QueryAddressArgs = {
  address: Scalars['SuiAddress']['input'];
};


export type QueryCheckpointArgs = {
  id?: InputMaybe<CheckpointId>;
};


export type QueryCheckpointsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCoinMetadataArgs = {
  coinType: Scalars['String']['input'];
};


export type QueryCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDryRunTransactionBlockArgs = {
  skipChecks?: InputMaybe<Scalars['Boolean']['input']>;
  txBytes: Scalars['String']['input'];
  txMeta?: InputMaybe<TransactionMetadata>;
};


export type QueryEpochArgs = {
  id?: InputMaybe<Scalars['UInt53']['input']>;
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


export type QueryLatestPackageArgs = {
  address: Scalars['SuiAddress']['input'];
};


export type QueryMultiGetObjectsArgs = {
  keys: Array<ObjectKey>;
};


export type QueryObjectArgs = {
  address: Scalars['SuiAddress']['input'];
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOwnerArgs = {
  address: Scalars['SuiAddress']['input'];
  rootVersion?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryPackageArgs = {
  address: Scalars['SuiAddress']['input'];
  version?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryPackageByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryPackageVersionsArgs = {
  address: Scalars['SuiAddress']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<MovePackageVersionFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPackagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<MovePackageCheckpointFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProtocolConfigArgs = {
  protocolVersion?: InputMaybe<Scalars['UInt53']['input']>;
};


export type QueryResolveSuinsAddressArgs = {
  domain: Scalars['String']['input'];
};


export type QueryTransactionBlockArgs = {
  digest: Scalars['String']['input'];
};


export type QueryTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTypeArgs = {
  type: Scalars['String']['input'];
};


export type QueryTypeByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryVerifyZkloginSignatureArgs = {
  author: Scalars['SuiAddress']['input'];
  bytes: Scalars['Base64']['input'];
  intentScope: ZkLoginIntentScope;
  signature: Scalars['Base64']['input'];
};

export type RandomnessStateCreateTransaction = {
  __typename?: 'RandomnessStateCreateTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

/** System transaction to update the source of on-chain randomness. */
export type RandomnessStateUpdateTransaction = {
  __typename?: 'RandomnessStateUpdateTransaction';
  /** Epoch of the randomness state update transaction. */
  epoch?: Maybe<Epoch>;
  /** Updated random bytes, encoded as Base64. */
  randomBytes: Scalars['Base64']['output'];
  /** The initial version the randomness object was shared at. */
  randomnessObjInitialSharedVersion: Scalars['UInt53']['output'];
  /** Randomness round of the update. */
  randomnessRound: Scalars['UInt53']['output'];
};

/** A Move object that can be received in this transaction. */
export type Receiving = {
  __typename?: 'Receiving';
  /** ID of the object being read. */
  address: Scalars['SuiAddress']['output'];
  /**
   * 32-byte hash that identifies the object's contents at this version, encoded as a Base58
   * string.
   */
  digest: Scalars['String']['output'];
  /** The object at this version.  May not be available due to pruning. */
  object?: Maybe<Object>;
  /** Version of the object being read. */
  version: Scalars['UInt53']['output'];
};

/** The result of another transaction command. */
export type Result = {
  __typename?: 'Result';
  /** The index of the previous command (0-indexed) that returned this result. */
  cmd: Scalars['Int']['output'];
  /**
   * If the previous command returns multiple values, this is the index of the individual result
   * among the multiple results from that command (also 0-indexed).
   */
  ix?: Maybe<Scalars['Int']['output']>;
};

/** Information about whether epoch changes are using safe mode. */
export type SafeMode = {
  __typename?: 'SafeMode';
  /**
   * Whether safe mode was used for the last epoch change.  The system will retry a full epoch
   * change on every epoch boundary and automatically reset this flag if so.
   */
  enabled?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Accumulated fees for computation and cost that have not been added to the various reward
   * pools, because the full epoch change did not happen.
   */
  gasSummary?: Maybe<GasCostSummary>;
};

/** The enabled features and service limits configured by the server. */
export type ServiceConfig = {
  __typename?: 'ServiceConfig';
  /** Default number of elements allowed on a single page of a connection. */
  defaultPageSize: Scalars['Int']['output'];
  /** List of all features that are enabled on this GraphQL service. */
  enabledFeatures: Array<Feature>;
  /** Check whether `feature` is enabled on this GraphQL service. */
  isEnabled: Scalars['Boolean']['output'];
  /**
   * Maximum estimated cost of a database query used to serve a GraphQL request.  This is
   * measured in the same units that the database uses in EXPLAIN queries.
   */
  maxDbQueryCost: Scalars['Int']['output'];
  /** Maximum nesting allowed in struct fields when calculating the layout of a single Move Type. */
  maxMoveValueDepth: Scalars['Int']['output'];
  /** Maximum number of keys that can be passed to a `multiGetObjects` query. */
  maxMultiGetObjectsKeys: Scalars['Int']['output'];
  /**
   * The maximum number of output nodes in a GraphQL response.
   *
   * Non-connection nodes have a count of 1, while connection nodes are counted as
   * the specified 'first' or 'last' number of items, or the default_page_size
   * as set by the server if those arguments are not set.
   *
   * Counts accumulate multiplicatively down the query tree. For example, if a query starts
   * with a connection of first: 10 and has a field to a connection with last: 20, the count
   * at the second level would be 200 nodes. This is then summed to the count of 10 nodes
   * at the first level, for a total of 210 nodes.
   */
  maxOutputNodes: Scalars['Int']['output'];
  /** Maximum number of elements allowed on a single page of a connection. */
  maxPageSize: Scalars['Int']['output'];
  /** The maximum depth a GraphQL query can be to be accepted by this service. */
  maxQueryDepth: Scalars['Int']['output'];
  /** The maximum number of nodes (field names) the service will accept in a single query. */
  maxQueryNodes: Scalars['Int']['output'];
  /**
   * The maximum bytes allowed for the JSON object in the request body of a GraphQL query, for
   * the read part of the query.
   * In case of mutations or dryRunTransactionBlocks the txBytes and signatures are not
   * included in this limit.
   */
  maxQueryPayloadSize: Scalars['Int']['output'];
  /** Maximum number of candidates to scan when gathering a page of results. */
  maxScanLimit: Scalars['Int']['output'];
  /** Maximum number of transaction ids that can be passed to a `TransactionBlockFilter`. */
  maxTransactionIds: Scalars['Int']['output'];
  /**
   * The maximum bytes allowed for the `txBytes` and `signatures` fields of the GraphQL mutation
   * `executeTransactionBlock` node, or for the `txBytes` of a `dryRunTransactionBlock`.
   *
   * It is the value of the maximum transaction bytes (including the signatures) allowed by the
   * protocol, plus the Base64 overhead (roughly 1/3 of the original string).
   */
  maxTransactionPayloadSize: Scalars['Int']['output'];
  /** Maximum nesting allowed in type arguments in Move Types resolved by this service. */
  maxTypeArgumentDepth: Scalars['Int']['output'];
  /**
   * Maximum number of type arguments passed into a generic instantiation of a Move Type resolved
   * by this service.
   */
  maxTypeArgumentWidth: Scalars['Int']['output'];
  /**
   * Maximum number of structs that need to be processed when calculating the layout of a single
   * Move Type.
   */
  maxTypeNodes: Scalars['Int']['output'];
  /**
   * Maximum time in milliseconds spent waiting for a response from fullnode after issuing a
   * a transaction to execute. Note that the transaction may still succeed even in the case of a
   * timeout. Transactions are idempotent, so a transaction that times out should be resubmitted
   * until the network returns a definite response (success or failure, not timeout).
   */
  mutationTimeoutMs: Scalars['Int']['output'];
  /** Maximum time in milliseconds that will be spent to serve one query request. */
  requestTimeoutMs: Scalars['Int']['output'];
};


/** The enabled features and service limits configured by the server. */
export type ServiceConfigIsEnabledArgs = {
  feature: Feature;
};

/**
 * A shared object is an object that is shared using the 0x2::transfer::share_object function.
 * Unlike owned objects, once an object is shared, it stays mutable and is accessible by anyone.
 */
export type Shared = {
  __typename?: 'Shared';
  initialSharedVersion: Scalars['UInt53']['output'];
};

/** A Move object that's shared. */
export type SharedInput = {
  __typename?: 'SharedInput';
  address: Scalars['SuiAddress']['output'];
  /** The version that this this object was shared at. */
  initialSharedVersion: Scalars['UInt53']['output'];
  /**
   * Controls whether the transaction block can reference the shared object as a mutable
   * reference or by value. This has implications for scheduling: Transactions that just read
   * shared objects at a certain version (mutable = false) can be executed concurrently, while
   * transactions that write shared objects (mutable = true) must be executed serially with
   * respect to each other.
   */
  mutable: Scalars['Boolean']['output'];
};

/** The transaction accpeted a shared object as input, but its execution was cancelled. */
export type SharedObjectCancelled = {
  __typename?: 'SharedObjectCancelled';
  /** ID of the shared object. */
  address: Scalars['SuiAddress']['output'];
  /** The assigned shared object version. It is a special version indicating transaction cancellation reason. */
  version: Scalars['UInt53']['output'];
};

/**
 * The transaction accepted a shared object as input, but it was deleted before the transaction
 * executed.
 */
export type SharedObjectDelete = {
  __typename?: 'SharedObjectDelete';
  /** ID of the shared object. */
  address: Scalars['SuiAddress']['output'];
  /**
   * Whether this transaction intended to use this shared object mutably or not. See
   * `SharedInput.mutable` for further details.
   */
  mutable: Scalars['Boolean']['output'];
  /**
   * The version of the shared object that was assigned to this transaction during by consensus,
   * during sequencing.
   */
  version: Scalars['UInt53']['output'];
};

/** The transaction accepted a shared object as input, but only to read it. */
export type SharedObjectRead = {
  __typename?: 'SharedObjectRead';
  /** ID of the object being read. */
  address: Scalars['SuiAddress']['output'];
  /**
   * 32-byte hash that identifies the object's contents at this version, encoded as a Base58
   * string.
   */
  digest: Scalars['String']['output'];
  /** The object at this version.  May not be available due to pruning. */
  object?: Maybe<Object>;
  /** Version of the object being read. */
  version: Scalars['UInt53']['output'];
};

/**
 * Splits off coins with denominations in `amounts` from `coin`, returning multiple results (as
 * many as there are amounts.)
 */
export type SplitCoinsTransaction = {
  __typename?: 'SplitCoinsTransaction';
  /** The denominations to split off from the coin. */
  amounts: Array<TransactionArgument>;
  /** The coin to split. */
  coin: TransactionArgument;
};

/** The stake's possible status: active, pending, or unstaked. */
export enum StakeStatus {
  /** The stake object is active in a staking pool and it is generating rewards. */
  Active = 'ACTIVE',
  /** The stake awaits to join a staking pool in the next epoch. */
  Pending = 'PENDING',
  /** The stake is no longer active in any staking pool. */
  Unstaked = 'UNSTAKED'
}

/** Parameters that control the distribution of the stake subsidy. */
export type StakeSubsidy = {
  __typename?: 'StakeSubsidy';
  /**
   * SUI set aside for stake subsidies -- reduces over time as stake subsidies are paid out over
   * time.
   */
  balance?: Maybe<Scalars['BigInt']['output']>;
  /** Amount of stake subsidy deducted from the balance per distribution -- decays over time. */
  currentDistributionAmount?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Percentage of the current distribution amount to deduct at the end of the current subsidy
   * period, expressed in basis points.
   */
  decreaseRate?: Maybe<Scalars['Int']['output']>;
  /**
   * Number of times stake subsidies have been distributed subsidies are distributed with other
   * staking rewards, at the end of the epoch.
   */
  distributionCounter?: Maybe<Scalars['Int']['output']>;
  /**
   * Maximum number of stake subsidy distributions that occur with the same distribution amount
   * (before the amount is reduced).
   */
  periodLength?: Maybe<Scalars['Int']['output']>;
};

/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSui = IMoveObject & IObject & IOwner & {
  __typename?: 'StakedSui';
  /** The epoch at which this stake became active. */
  activatedEpoch?: Maybe<Epoch>;
  address: Scalars['SuiAddress']['output'];
  /**
   * Total balance of all coins with marker type owned by this object. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object. */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * The coin objects for this object.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /**
   * Displays the contents of the Move object in a JSON string and through GraphQL types. Also
   * provides the flat representation of the type signature, and the BCS of the corresponding
   * data.
   */
  contents?: Maybe<MoveValue>;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The set of named templates defined on-chain for the type of this object, to be handled
   * off-chain. The server substitutes data from the object into these templates to generate a
   * display string per template.
   */
  display?: Maybe<Array<DisplayEntry>>;
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * The estimated reward for this stake object, calculated as:
   *
   * principal * (initial_stake_rate / current_stake_rate - 1.0)
   *
   * Or 0, if this value is negative, where:
   *
   * - `initial_stake_rate` is the stake rate at the epoch this stake was activated at.
   * - `current_stake_rate` is the stake rate in the current epoch.
   *
   * This value is only available if the stake is active.
   */
  estimatedReward?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Determines whether a transaction can transfer this object, using the TransferObjects
   * transaction command or `sui::transfer::public_transfer`, both of which require the object to
   * have the `key` and `store` abilities.
   */
  hasPublicTransfer: Scalars['Boolean']['output'];
  /** Objects owned by this object, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The owner type of this object: Immutable, Shared, Parent, Address */
  owner?: Maybe<ObjectOwner>;
  /** The object id of the validator staking pool this stake belongs to. */
  poolId?: Maybe<Scalars['SuiAddress']['output']>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /** The SUI that was initially staked. */
  principal?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The transaction blocks that sent objects to this object.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The epoch at which this object was requested to join a stake pool. */
  requestedEpoch?: Maybe<Epoch>;
  /** A stake can be pending, active, or unstaked */
  stakeStatus: StakeStatus;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object. */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this object. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  version: Scalars['UInt53']['output'];
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiDynamicFieldArgs = {
  name: DynamicFieldName;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Represents a `0x3::staking_pool::StakedSui` Move object on-chain. */
export type StakedSuiSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type StakedSuiConnection = {
  __typename?: 'StakedSuiConnection';
  /** A list of edges. */
  edges: Array<StakedSuiEdge>;
  /** A list of nodes. */
  nodes: Array<StakedSui>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type StakedSuiEdge = {
  __typename?: 'StakedSuiEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: StakedSui;
};

/** SUI set aside to account for objects stored on-chain. */
export type StorageFund = {
  __typename?: 'StorageFund';
  /**
   * The portion of the storage fund that will never be refunded through storage rebates.
   *
   * The system maintains an invariant that the sum of all storage fees into the storage fund is
   * equal to the sum of of all storage rebates out, the total storage rebates remaining, and the
   * non-refundable balance.
   */
  nonRefundableBalance?: Maybe<Scalars['BigInt']['output']>;
  /** Sum of storage rebates of live objects on chain. */
  totalObjectStorageRebates?: Maybe<Scalars['BigInt']['output']>;
};

export type StoreExecutionTimeObservationsTransaction = {
  __typename?: 'StoreExecutionTimeObservationsTransaction';
  /** A workaround to define an empty variant of a GraphQL union. */
  _?: Maybe<Scalars['Boolean']['output']>;
};

export type SuinsRegistration = IMoveObject & IObject & IOwner & {
  __typename?: 'SuinsRegistration';
  address: Scalars['SuiAddress']['output'];
  /**
   * Total balance of all coins with marker type owned by this object. If type is not supplied,
   * it defaults to `0x2::sui::SUI`.
   */
  balance?: Maybe<Balance>;
  /** The balances of all coin types owned by this object. */
  balances: BalanceConnection;
  /** The Base64-encoded BCS serialization of the object's content. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * The coin objects for this object.
   *
   * `type` is a filter on the coin's type parameter, defaulting to `0x2::sui::SUI`.
   */
  coins: CoinConnection;
  /**
   * Displays the contents of the Move object in a JSON string and through GraphQL types. Also
   * provides the flat representation of the type signature, and the BCS of the corresponding
   * data.
   */
  contents?: Maybe<MoveValue>;
  /** The domain explicitly configured as the default domain pointing to this object. */
  defaultSuinsName?: Maybe<Scalars['String']['output']>;
  /** 32-byte hash that identifies the object's contents, encoded as a Base58 string. */
  digest?: Maybe<Scalars['String']['output']>;
  /**
   * The set of named templates defined on-chain for the type of this object, to be handled
   * off-chain. The server substitutes data from the object into these templates to generate a
   * display string per template.
   */
  display?: Maybe<Array<DisplayEntry>>;
  /** Domain name of the SuinsRegistration object */
  domain: Scalars['String']['output'];
  /**
   * Access a dynamic field on an object using its name. Names are arbitrary Move values whose
   * type have `copy`, `drop`, and `store`, and are specified using their type, and their BCS
   * contents, Base64 encoded.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicField?: Maybe<DynamicField>;
  /**
   * The dynamic fields and dynamic object fields on an object.
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicFields: DynamicFieldConnection;
  /**
   * Access a dynamic object field on an object using its name. Names are arbitrary Move values
   * whose type have `copy`, `drop`, and `store`, and are specified using their type, and their
   * BCS contents, Base64 encoded. The value of a dynamic object field can also be accessed
   * off-chain directly via its address (e.g. using `Query.object`).
   *
   * Dynamic fields on wrapped objects can be accessed by using the same API under the Owner
   * type.
   */
  dynamicObjectField?: Maybe<DynamicField>;
  /**
   * Determines whether a transaction can transfer this object, using the TransferObjects
   * transaction command or `sui::transfer::public_transfer`, both of which require the object to
   * have the `key` and `store` abilities.
   */
  hasPublicTransfer: Scalars['Boolean']['output'];
  /** Objects owned by this object, optionally `filter`-ed. */
  objects: MoveObjectConnection;
  /** The owner type of this object: Immutable, Shared, Parent, Address */
  owner?: Maybe<ObjectOwner>;
  /** The transaction block that created this version of the object. */
  previousTransactionBlock?: Maybe<TransactionBlock>;
  /**
   * The transaction blocks that sent objects to this object.
   *
   * `scanLimit` restricts the number of candidate transactions scanned when gathering a page of
   * results. It is required for queries that apply more than two complex filters (on function,
   * kind, sender, recipient, input object, changed object, or ids), and can be at most
   * `serviceConfig.maxScanLimit`.
   *
   * When the scan limit is reached the page will be returned even if it has fewer than `first`
   * results when paginating forward (`last` when paginating backwards). If there are more
   * transactions to scan, `pageInfo.hasNextPage` (or `pageInfo.hasPreviousPage`) will be set to
   * `true`, and `PageInfo.endCursor` (or `PageInfo.startCursor`) will be set to the last
   * transaction that was scanned as opposed to the last (or first) transaction in the page.
   *
   * Requesting the next (or previous) page after this cursor will resume the search, scanning
   * the next `scanLimit` many transactions in the direction of pagination, and so on until all
   * transactions in the scanning range have been visited.
   *
   * By default, the scanning range includes all transactions known to GraphQL, but it can be
   * restricted by the `after` and `before` cursors, and the `beforeCheckpoint`,
   * `afterCheckpoint` and `atCheckpoint` filters.
   */
  receivedTransactionBlocks: TransactionBlockConnection;
  /** The `0x3::staking_pool::StakedSui` objects owned by this object. */
  stakedSuis: StakedSuiConnection;
  /**
   * The current status of the object as read from the off-chain store. The possible states are:
   * NOT_INDEXED, the object is loaded from serialized data, such as the contents of a genesis or
   * system package upgrade transaction. LIVE, the version returned is the most recent for the
   * object, and it is not deleted or wrapped at that version. HISTORICAL, the object was
   * referenced at a specific version or checkpoint, so is fetched from historical tables and may
   * not be the latest version of the object. WRAPPED_OR_DELETED, the object is deleted or
   * wrapped and only partial information can be loaded."
   */
  status: ObjectKind;
  /**
   * The amount of SUI we would rebate if this object gets deleted or mutated. This number is
   * recalculated based on the present storage gas price.
   */
  storageRebate?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The SuinsRegistration NFTs owned by this object. These grant the owner the capability to
   * manage the associated domain.
   */
  suinsRegistrations: SuinsRegistrationConnection;
  version: Scalars['UInt53']['output'];
};


export type SuinsRegistrationBalanceArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


export type SuinsRegistrationBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type SuinsRegistrationCoinsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type SuinsRegistrationDefaultSuinsNameArgs = {
  format?: InputMaybe<DomainFormat>;
};


export type SuinsRegistrationDynamicFieldArgs = {
  name: DynamicFieldName;
};


export type SuinsRegistrationDynamicFieldsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type SuinsRegistrationDynamicObjectFieldArgs = {
  name: DynamicFieldName;
};


export type SuinsRegistrationObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type SuinsRegistrationReceivedTransactionBlocksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TransactionBlockFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  scanLimit?: InputMaybe<Scalars['Int']['input']>;
};


export type SuinsRegistrationStakedSuisArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type SuinsRegistrationSuinsRegistrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type SuinsRegistrationConnection = {
  __typename?: 'SuinsRegistrationConnection';
  /** A list of edges. */
  edges: Array<SuinsRegistrationEdge>;
  /** A list of nodes. */
  nodes: Array<SuinsRegistration>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type SuinsRegistrationEdge = {
  __typename?: 'SuinsRegistrationEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: SuinsRegistration;
};

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
  /**
   * The number of epochs that a validator has to recover from having less than
   * `validatorLowStakeThreshold` stake.
   */
  validatorLowStakeGracePeriod?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Validators with stake below this threshold will enter the grace period (see
   * `validatorLowStakeGracePeriod`), after which they are removed from the active validator set.
   */
  validatorLowStakeThreshold?: Maybe<Scalars['BigInt']['output']>;
  /**
   * Validators with stake below this threshold will be removed from the active validator set
   * at the next epoch boundary, without a grace period.
   */
  validatorVeryLowStakeThreshold?: Maybe<Scalars['BigInt']['output']>;
};

/** An argument to a programmable transaction command. */
export type TransactionArgument = GasCoin | Input | Result;

export type TransactionBlock = {
  __typename?: 'TransactionBlock';
  /** Serialized form of this transaction's `TransactionData`, BCS serialized and Base64 encoded. */
  bcs?: Maybe<Scalars['Base64']['output']>;
  /**
   * A 32-byte hash that uniquely identifies the transaction block contents, encoded in Base58.
   * This serves as a unique id for the block on chain.
   */
  digest?: Maybe<Scalars['String']['output']>;
  /** The effects field captures the results to the chain of executing this transaction. */
  effects?: Maybe<TransactionBlockEffects>;
  /**
   * This field is set by senders of a transaction block. It is an epoch reference that sets a
   * deadline after which validators will no longer consider the transaction valid. By default,
   * there is no deadline for when a transaction must execute.
   */
  expiration?: Maybe<Epoch>;
  /**
   * The gas input field provides information on what objects were used as gas as well as the
   * owner of the gas object(s) and information on the gas price and budget.
   *
   * If the owner of the gas object(s) is not the same as the sender, the transaction block is a
   * sponsored transaction block.
   */
  gasInput?: Maybe<GasInput>;
  /**
   * The type of this transaction as well as the commands and/or parameters comprising the
   * transaction of this kind.
   */
  kind?: Maybe<TransactionBlockKind>;
  /**
   * The address corresponding to the public key that signed this transaction. System
   * transactions do not have senders.
   */
  sender?: Maybe<Address>;
  /**
   * A list of all signatures, Base64-encoded, from senders, and potentially the gas owner if
   * this is a sponsored transaction.
   */
  signatures?: Maybe<Array<Scalars['Base64']['output']>>;
};

export type TransactionBlockConnection = {
  __typename?: 'TransactionBlockConnection';
  /** A list of edges. */
  edges: Array<TransactionBlockEdge>;
  /** A list of nodes. */
  nodes: Array<TransactionBlock>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type TransactionBlockEdge = {
  __typename?: 'TransactionBlockEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: TransactionBlock;
};

/** The effects representing the result of executing a transaction block. */
export type TransactionBlockEffects = {
  __typename?: 'TransactionBlockEffects';
  /** The error code of the Move abort, populated if this transaction failed with a Move abort. */
  abortCode?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The effect this transaction had on the balances (sum of coin values per coin type) of
   * addresses and objects.
   */
  balanceChanges: BalanceChangeConnection;
  /** Base64 encoded bcs serialization of the on-chain transaction effects. */
  bcs: Scalars['Base64']['output'];
  /** The checkpoint this transaction was finalized in. */
  checkpoint?: Maybe<Checkpoint>;
  /** Transactions whose outputs this transaction depends upon. */
  dependencies: DependencyConnection;
  /** The epoch this transaction was finalized in. */
  epoch?: Maybe<Epoch>;
  /**
   * The reason for a transaction failure, if it did fail.
   * If the error is a Move abort, the error message will be resolved to a human-readable form if
   * possible, otherwise it will fall back to displaying the abort code and location.
   */
  errors?: Maybe<Scalars['String']['output']>;
  /** Events emitted by this transaction block. */
  events: EventConnection;
  /** Effects to the gas object. */
  gasEffects?: Maybe<GasEffects>;
  /**
   * The latest version of all objects (apart from packages) that have been created or modified
   * by this transaction, immediately following this transaction.
   */
  lamportVersion: Scalars['UInt53']['output'];
  /** The effect this transaction had on objects on-chain. */
  objectChanges: ObjectChangeConnection;
  /** Whether the transaction executed successfully or not. */
  status?: Maybe<ExecutionStatus>;
  /** Timestamp corresponding to the checkpoint this transaction was finalized in. */
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  /** The transaction that ran to produce these effects. */
  transactionBlock?: Maybe<TransactionBlock>;
  /** Shared objects that are referenced by but not changed by this transaction. */
  unchangedSharedObjects: UnchangedSharedObjectConnection;
};


/** The effects representing the result of executing a transaction block. */
export type TransactionBlockEffectsBalanceChangesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The effects representing the result of executing a transaction block. */
export type TransactionBlockEffectsDependenciesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The effects representing the result of executing a transaction block. */
export type TransactionBlockEffectsEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The effects representing the result of executing a transaction block. */
export type TransactionBlockEffectsObjectChangesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** The effects representing the result of executing a transaction block. */
export type TransactionBlockEffectsUnchangedSharedObjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type TransactionBlockFilter = {
  /**
   * Limit to transactions that interacted with the given address. The address could be a
   * sender, sponsor, or recipient of the transaction.
   */
  affectedAddress?: InputMaybe<Scalars['SuiAddress']['input']>;
  /** Limit to transactions that occured strictly after the given checkpoint. */
  afterCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit to transactions in the given checkpoint. */
  atCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /** Limit to transaction that occured strictly before the given checkpoint. */
  beforeCheckpoint?: InputMaybe<Scalars['UInt53']['input']>;
  /**
   * Limit to transactions that output a versioon of this object. NOTE: this input filter has
   * been deprecated in favor of `affectedObject` which offers an easier to understand behavor.
   *
   * This filter will be removed with 1.36.0 (2024-10-14), or at least one release after
   * `affectedObject` is introduced, whichever is later.
   */
  changedObject?: InputMaybe<Scalars['SuiAddress']['input']>;
  /**
   * Filter transactions by move function called. Calls can be filtered by the `package`,
   * `package::module`, or the `package::module::name` of their function.
   */
  function?: InputMaybe<Scalars['String']['input']>;
  /**
   * Limit to transactions that accepted the given object as an input. NOTE: this input filter
   * has been deprecated in favor of `affectedObject` which offers an easier to under behavior.
   *
   * This filter will be removed with 1.36.0 (2024-10-14), or at least one release after
   * `affectedObject` is introduced, whichever is later.
   */
  inputObject?: InputMaybe<Scalars['SuiAddress']['input']>;
  /** An input filter selecting for either system or programmable transactions. */
  kind?: InputMaybe<TransactionBlockKindInput>;
  /** Limit to transactions that were sent by the given address. */
  sentAddress?: InputMaybe<Scalars['SuiAddress']['input']>;
  /** Select transactions by their digest. */
  transactionIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** The kind of transaction block, either a programmable transaction or a system transaction. */
export type TransactionBlockKind = AuthenticatorStateUpdateTransaction | ChangeEpochTransaction | ConsensusCommitPrologueTransaction | EndOfEpochTransaction | GenesisTransaction | ProgrammableTransactionBlock | RandomnessStateUpdateTransaction;

/** An input filter selecting for either system or programmable transactions. */
export enum TransactionBlockKindInput {
  /** A user submitted transaction block. */
  ProgrammableTx = 'PROGRAMMABLE_TX',
  /**
   * A system transaction can be one of several types of transactions.
   * See [unions/transaction-block-kind] for more details.
   */
  SystemTx = 'SYSTEM_TX'
}

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

/**
 * The optional extra data a user can provide to a transaction dry run.
 * `sender` defaults to `0x0`. If `gasObjects` is not present, or is an empty list,
 * it is substituted with a mock Coin object, `gasPrice` defaults to the reference
 * gas price, `gasBudget` defaults to the max gas budget and `gasSponsor` defaults
 * to the sender.
 */
export type TransactionMetadata = {
  gasBudget?: InputMaybe<Scalars['UInt53']['input']>;
  gasObjects?: InputMaybe<Array<ObjectRef>>;
  gasPrice?: InputMaybe<Scalars['UInt53']['input']>;
  gasSponsor?: InputMaybe<Scalars['SuiAddress']['input']>;
  sender?: InputMaybe<Scalars['SuiAddress']['input']>;
};

/**
 * Transfers `inputs` to `address`. All inputs must have the `store` ability (allows public
 * transfer) and must not be previously immutable or shared.
 */
export type TransferObjectsTransaction = {
  __typename?: 'TransferObjectsTransaction';
  /** The address to transfer to. */
  address: TransactionArgument;
  /** The objects to transfer. */
  inputs: Array<TransactionArgument>;
};

/** Information about which previous versions of a package introduced its types. */
export type TypeOrigin = {
  __typename?: 'TypeOrigin';
  /** The storage ID of the package that first defined this type. */
  definingId: Scalars['SuiAddress']['output'];
  /** Module defining the type. */
  module: Scalars['String']['output'];
  /** Name of the struct. */
  struct: Scalars['String']['output'];
};

/**
 * Details pertaining to shared objects that are referenced by but not changed by a transaction.
 * This information is considered part of the effects, because although the transaction specifies
 * the shared object as input, consensus must schedule it and pick the version that is actually
 * used.
 */
export type UnchangedSharedObject = SharedObjectCancelled | SharedObjectDelete | SharedObjectRead;

export type UnchangedSharedObjectConnection = {
  __typename?: 'UnchangedSharedObjectConnection';
  /** A list of edges. */
  edges: Array<UnchangedSharedObjectEdge>;
  /** A list of nodes. */
  nodes: Array<UnchangedSharedObject>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type UnchangedSharedObjectEdge = {
  __typename?: 'UnchangedSharedObjectEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: UnchangedSharedObject;
};

/** Upgrades a Move Package. */
export type UpgradeTransaction = {
  __typename?: 'UpgradeTransaction';
  /** ID of the package being upgraded. */
  currentPackage: Scalars['SuiAddress']['output'];
  /** IDs of the transitive dependencies of the package to be published. */
  dependencies: Array<Scalars['SuiAddress']['output']>;
  /** Bytecode for the modules to be published, BCS serialized and Base64 encoded. */
  modules: Array<Scalars['Base64']['output']>;
  /** The `UpgradeTicket` authorizing the upgrade. */
  upgradeTicket: TransactionArgument;
};

export type Validator = {
  __typename?: 'Validator';
  /** The validator's address. */
  address: Address;
  /**
   * The APY of this validator in basis points.
   * To get the APY in percentage, divide by 100.
   */
  apy?: Maybe<Scalars['Int']['output']>;
  /**
   * The number of epochs for which this validator has been below the
   * low stake threshold.
   */
  atRisk?: Maybe<Scalars['UInt53']['output']>;
  /** The fee charged by the validator for staking services. */
  commissionRate?: Maybe<Scalars['Int']['output']>;
  /** Validator's set of credentials such as public keys, network addresses and others. */
  credentials?: Maybe<ValidatorCredentials>;
  /** Validator's description. */
  description?: Maybe<Scalars['String']['output']>;
  /**
   * The validator's current exchange object. The exchange rate is used to determine
   * the amount of SUI tokens that each past SUI staker can withdraw in the future.
   * @deprecated The exchange object is a wrapped object. Access its dynamic fields through the `exchangeRatesTable` query.
   */
  exchangeRates?: Maybe<MoveObject>;
  /** Number of exchange rates in the table. */
  exchangeRatesSize?: Maybe<Scalars['UInt53']['output']>;
  /**
   * A wrapped object containing the validator's exchange rates. This is a table from epoch
   * number to `PoolTokenExchangeRate` value. The exchange rate is used to determine the amount
   * of SUI tokens that each past SUI staker can withdraw in the future.
   */
  exchangeRatesTable?: Maybe<Owner>;
  /** The reference gas price for this epoch. */
  gasPrice?: Maybe<Scalars['BigInt']['output']>;
  /** Validator's url containing their custom image. */
  imageUrl?: Maybe<Scalars['String']['output']>;
  /** Validator's name. */
  name?: Maybe<Scalars['String']['output']>;
  /** The proposed next epoch fee for the validator's staking services. */
  nextEpochCommissionRate?: Maybe<Scalars['Int']['output']>;
  /** Validator's set of credentials for the next epoch. */
  nextEpochCredentials?: Maybe<ValidatorCredentials>;
  /** The validator's gas price quote for the next epoch. */
  nextEpochGasPrice?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The total number of SUI tokens in this pool plus
   * the pending stake amount for this epoch.
   */
  nextEpochStake?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The validator's current valid `Cap` object. Validators can delegate
   * the operation ability to another address. The address holding this `Cap` object
   * can then update the reference gas price and tallying rule on behalf of the validator.
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
  /** The addresses of other validators this validator has reported. */
  reportRecords: AddressConnection;
  /** The epoch stake rewards will be added here at the end of each epoch. */
  rewardsPool?: Maybe<Scalars['BigInt']['output']>;
  /**
   * The validator's current staking pool object, used to track the amount of stake
   * and to compound staking rewards.
   * @deprecated The staking pool is a wrapped object. Access its fields directly on the `Validator` type.
   */
  stakingPool?: Maybe<MoveObject>;
  /** The epoch at which this pool became active. */
  stakingPoolActivationEpoch?: Maybe<Scalars['UInt53']['output']>;
  /** The ID of this validator's `0x3::staking_pool::StakingPool`. */
  stakingPoolId: Scalars['SuiAddress']['output'];
  /** The total number of SUI tokens in this pool. */
  stakingPoolSuiBalance?: Maybe<Scalars['BigInt']['output']>;
  /** The voting power of this validator in basis points (e.g., 100 = 1% voting power). */
  votingPower?: Maybe<Scalars['Int']['output']>;
};


export type ValidatorReportRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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
  /** The current set of active validators. */
  activeValidators: ValidatorConnection;
  /** Object ID of the `Table` storing the inactive staking pools. */
  inactivePoolsId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Size of the inactive pools `Table`. */
  inactivePoolsSize?: Maybe<Scalars['Int']['output']>;
  /** Object ID of the wrapped object `TableVec` storing the pending active validators. */
  pendingActiveValidatorsId?: Maybe<Scalars['SuiAddress']['output']>;
  /** Size of the pending active validators table. */
  pendingActiveValidatorsSize?: Maybe<Scalars['Int']['output']>;
  /**
   * Validators that are pending removal from the active validator set, expressed as indices in
   * to `activeValidators`.
   */
  pendingRemovals?: Maybe<Array<Scalars['Int']['output']>>;
  /**
   * Object ID of the `Table` storing the mapping from staking pool ids to the addresses
   * of the corresponding validators. This is needed because a validator's address
   * can potentially change but the object ID of its pool will not.
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

/**
 * An enum that specifies the intent scope to be used to parse the bytes for signature
 * verification.
 */
export enum ZkLoginIntentScope {
  /** Indicates that the bytes are to be parsed as a personal message. */
  PersonalMessage = 'PERSONAL_MESSAGE',
  /** Indicates that the bytes are to be parsed as transaction data bytes. */
  TransactionData = 'TRANSACTION_DATA'
}

/** The result of the zkLogin signature verification. */
export type ZkLoginVerifyResult = {
  __typename?: 'ZkLoginVerifyResult';
  /** The errors field captures any verification error */
  errors: Array<Scalars['String']['output']>;
  /** The boolean result of the verification. If true, errors should be empty. */
  success: Scalars['Boolean']['output'];
};

export type GetAllBalancesQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAllBalancesQuery = { __typename?: 'Query', address?: { __typename?: 'Address', balances: { __typename?: 'BalanceConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'Balance', coinObjectCount?: any | null, totalBalance?: any | null, coinType: { __typename?: 'MoveType', repr: string } }> } } | null };

export type GetBalanceQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetBalanceQuery = { __typename?: 'Query', address?: { __typename?: 'Address', balance?: { __typename?: 'Balance', coinObjectCount?: any | null, totalBalance?: any | null, coinType: { __typename?: 'MoveType', repr: string } } | null } | null };

export type GetCoinsQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCoinsQuery = { __typename?: 'Query', address?: { __typename?: 'Address', address: any, coins: { __typename?: 'CoinConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'Coin', coinBalance?: any | null, address: any, version: any, digest?: string | null, owner?: { __typename: 'AddressOwner', owner?: { __typename?: 'Owner', asObject?: { __typename?: 'Object', address: any } | null, asAddress?: { __typename?: 'Address', address: any } | null } | null } | { __typename: 'ConsensusAddressOwner', startVersion: any, owner?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Immutable' } | { __typename: 'Parent', parent?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Shared', initialSharedVersion: any } | null, contents?: { __typename?: 'MoveValue', bcs: any, type: { __typename?: 'MoveType', repr: string } } | null }> } } | null };

export type GetDynamicFieldsQueryVariables = Exact<{
  parentId: Scalars['SuiAddress']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetDynamicFieldsQuery = { __typename?: 'Query', owner?: { __typename?: 'Owner', dynamicFields: { __typename?: 'DynamicFieldConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'DynamicField', name?: { __typename?: 'MoveValue', bcs: any, type: { __typename?: 'MoveType', repr: string } } | null, value?: { __typename: 'MoveObject', contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | { __typename: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null }> } } | null };

export type GetReferenceGasPriceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetReferenceGasPriceQuery = { __typename?: 'Query', epoch?: { __typename?: 'Epoch', referenceGasPrice?: any | null } | null };

export type ResolveNameServiceNamesQueryVariables = Exact<{
  address: Scalars['SuiAddress']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type ResolveNameServiceNamesQuery = { __typename?: 'Query', address?: { __typename?: 'Address', suinsRegistrations: { __typename?: 'SuinsRegistrationConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'SuinsRegistration', domain: string }> } } | null };

export type GetOwnedObjectsQueryVariables = Exact<{
  owner: Scalars['SuiAddress']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ObjectFilter>;
}>;


export type GetOwnedObjectsQuery = { __typename?: 'Query', address?: { __typename?: 'Address', objects: { __typename?: 'MoveObjectConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'MoveObject', address: any, digest?: string | null, version: any, contents?: { __typename?: 'MoveValue', bcs: any, type: { __typename?: 'MoveType', repr: string } } | null, owner?: { __typename: 'AddressOwner', owner?: { __typename?: 'Owner', asObject?: { __typename?: 'Object', address: any } | null, asAddress?: { __typename?: 'Address', address: any } | null } | null } | { __typename: 'ConsensusAddressOwner', startVersion: any, owner?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Immutable' } | { __typename: 'Parent', parent?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Shared', initialSharedVersion: any } | null }> } } | null };

export type MultiGetObjectsQueryVariables = Exact<{
  objectIds: Array<Scalars['SuiAddress']['input']> | Scalars['SuiAddress']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type MultiGetObjectsQuery = { __typename?: 'Query', objects: { __typename?: 'ObjectConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes: Array<{ __typename?: 'Object', address: any, digest?: string | null, version: any, asMoveObject?: { __typename?: 'MoveObject', contents?: { __typename?: 'MoveValue', bcs: any, type: { __typename?: 'MoveType', repr: string } } | null } | null, owner?: { __typename: 'AddressOwner', owner?: { __typename?: 'Owner', asObject?: { __typename?: 'Object', address: any } | null, asAddress?: { __typename?: 'Address', address: any } | null } | null } | { __typename: 'ConsensusAddressOwner', startVersion: any, owner?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Immutable' } | { __typename: 'Parent', parent?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Shared', initialSharedVersion: any } | null }> } };

export type Object_FieldsFragment = { __typename?: 'Object', address: any, digest?: string | null, version: any, asMoveObject?: { __typename?: 'MoveObject', contents?: { __typename?: 'MoveValue', bcs: any, type: { __typename?: 'MoveType', repr: string } } | null } | null, owner?: { __typename: 'AddressOwner', owner?: { __typename?: 'Owner', asObject?: { __typename?: 'Object', address: any } | null, asAddress?: { __typename?: 'Address', address: any } | null } | null } | { __typename: 'ConsensusAddressOwner', startVersion: any, owner?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Immutable' } | { __typename: 'Parent', parent?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Shared', initialSharedVersion: any } | null };

export type Move_Object_FieldsFragment = { __typename?: 'MoveObject', address: any, digest?: string | null, version: any, contents?: { __typename?: 'MoveValue', bcs: any, type: { __typename?: 'MoveType', repr: string } } | null, owner?: { __typename: 'AddressOwner', owner?: { __typename?: 'Owner', asObject?: { __typename?: 'Object', address: any } | null, asAddress?: { __typename?: 'Address', address: any } | null } | null } | { __typename: 'ConsensusAddressOwner', startVersion: any, owner?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Immutable' } | { __typename: 'Parent', parent?: { __typename?: 'Owner', address: any } | null } | { __typename: 'Shared', initialSharedVersion: any } | null };

type Object_Owner_Fields_AddressOwner_Fragment = { __typename: 'AddressOwner', owner?: { __typename?: 'Owner', asObject?: { __typename?: 'Object', address: any } | null, asAddress?: { __typename?: 'Address', address: any } | null } | null };

type Object_Owner_Fields_ConsensusAddressOwner_Fragment = { __typename: 'ConsensusAddressOwner', startVersion: any, owner?: { __typename?: 'Owner', address: any } | null };

type Object_Owner_Fields_Immutable_Fragment = { __typename: 'Immutable' };

type Object_Owner_Fields_Parent_Fragment = { __typename: 'Parent', parent?: { __typename?: 'Owner', address: any } | null };

type Object_Owner_Fields_Shared_Fragment = { __typename: 'Shared', initialSharedVersion: any };

export type Object_Owner_FieldsFragment = Object_Owner_Fields_AddressOwner_Fragment | Object_Owner_Fields_ConsensusAddressOwner_Fragment | Object_Owner_Fields_Immutable_Fragment | Object_Owner_Fields_Parent_Fragment | Object_Owner_Fields_Shared_Fragment;

export type DryRunTransactionBlockQueryVariables = Exact<{
  txBytes: Scalars['String']['input'];
}>;


export type DryRunTransactionBlockQuery = { __typename?: 'Query', dryRunTransactionBlock: { __typename?: 'DryRunResult', error?: string | null, transaction?: { __typename?: 'TransactionBlock', digest?: string | null, bcs?: any | null, signatures?: Array<any> | null, effects?: { __typename?: 'TransactionBlockEffects', bcs: any, epoch?: { __typename?: 'Epoch', epochId: any } | null, unchangedSharedObjects: { __typename?: 'UnchangedSharedObjectConnection', nodes: Array<{ __typename: 'SharedObjectCancelled' } | { __typename: 'SharedObjectDelete' } | { __typename: 'SharedObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> }, objectChanges: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: any, inputState?: { __typename?: 'Object', version: any, asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> } } | null } | null } };

export type ExecuteTransactionBlockMutationVariables = Exact<{
  txBytes: Scalars['String']['input'];
  signatures: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type ExecuteTransactionBlockMutation = { __typename?: 'Mutation', executeTransactionBlock: { __typename?: 'ExecutionResult', errors?: Array<string> | null, effects: { __typename?: 'TransactionBlockEffects', transactionBlock?: { __typename?: 'TransactionBlock', digest?: string | null, bcs?: any | null, signatures?: Array<any> | null, effects?: { __typename?: 'TransactionBlockEffects', bcs: any, epoch?: { __typename?: 'Epoch', epochId: any } | null, unchangedSharedObjects: { __typename?: 'UnchangedSharedObjectConnection', nodes: Array<{ __typename: 'SharedObjectCancelled' } | { __typename: 'SharedObjectDelete' } | { __typename: 'SharedObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> }, objectChanges: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: any, inputState?: { __typename?: 'Object', version: any, asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> } } | null } | null } } };

export type GetTransactionBlockQueryVariables = Exact<{
  digest: Scalars['String']['input'];
}>;


export type GetTransactionBlockQuery = { __typename?: 'Query', transactionBlock?: { __typename?: 'TransactionBlock', digest?: string | null, bcs?: any | null, signatures?: Array<any> | null, effects?: { __typename?: 'TransactionBlockEffects', bcs: any, epoch?: { __typename?: 'Epoch', epochId: any } | null, unchangedSharedObjects: { __typename?: 'UnchangedSharedObjectConnection', nodes: Array<{ __typename: 'SharedObjectCancelled' } | { __typename: 'SharedObjectDelete' } | { __typename: 'SharedObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> }, objectChanges: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: any, inputState?: { __typename?: 'Object', version: any, asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> } } | null } | null };

export type Transaction_FieldsFragment = { __typename?: 'TransactionBlock', digest?: string | null, bcs?: any | null, signatures?: Array<any> | null, effects?: { __typename?: 'TransactionBlockEffects', bcs: any, epoch?: { __typename?: 'Epoch', epochId: any } | null, unchangedSharedObjects: { __typename?: 'UnchangedSharedObjectConnection', nodes: Array<{ __typename: 'SharedObjectCancelled' } | { __typename: 'SharedObjectDelete' } | { __typename: 'SharedObjectRead', object?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> }, objectChanges: { __typename?: 'ObjectChangeConnection', nodes: Array<{ __typename?: 'ObjectChange', address: any, inputState?: { __typename?: 'Object', version: any, asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null, outputState?: { __typename?: 'Object', asMoveObject?: { __typename?: 'MoveObject', address: any, contents?: { __typename?: 'MoveValue', type: { __typename?: 'MoveType', repr: string } } | null } | null } | null }> } } | null };

export type VerifyZkLoginSignatureQueryVariables = Exact<{
  bytes: Scalars['Base64']['input'];
  signature: Scalars['Base64']['input'];
  intentScope: ZkLoginIntentScope;
  author: Scalars['SuiAddress']['input'];
}>;


export type VerifyZkLoginSignatureQuery = { __typename?: 'Query', verifyZkloginSignature: { __typename?: 'ZkLoginVerifyResult', success: boolean, errors: Array<string> } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: DocumentTypeDecoration<TResult, TVariables>['__apiType'];
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const Object_Owner_FieldsFragmentDoc = new TypedDocumentString(`
    fragment OBJECT_OWNER_FIELDS on ObjectOwner {
  __typename
  ... on AddressOwner {
    owner {
      asObject {
        address
      }
      asAddress {
        address
      }
    }
  }
  ... on Parent {
    parent {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    owner {
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
}
    fragment OBJECT_OWNER_FIELDS on ObjectOwner {
  __typename
  ... on AddressOwner {
    owner {
      asObject {
        address
      }
      asAddress {
        address
      }
    }
  }
  ... on Parent {
    parent {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    owner {
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
}
    fragment OBJECT_OWNER_FIELDS on ObjectOwner {
  __typename
  ... on AddressOwner {
    owner {
      asObject {
        address
      }
      asAddress {
        address
      }
    }
  }
  ... on Parent {
    parent {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    owner {
      address
    }
  }
}`, {"fragmentName":"MOVE_OBJECT_FIELDS"}) as unknown as TypedDocumentString<Move_Object_FieldsFragment, unknown>;
export const Transaction_FieldsFragmentDoc = new TypedDocumentString(`
    fragment TRANSACTION_FIELDS on TransactionBlock {
  digest
  bcs
  signatures
  effects {
    bcs
    epoch {
      epochId
    }
    unchangedSharedObjects {
      nodes {
        __typename
        ... on SharedObjectRead {
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
        coinObjectCount
        totalBalance
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetAllBalancesQuery, GetAllBalancesQueryVariables>;
export const GetBalanceDocument = new TypedDocumentString(`
    query getBalance($owner: SuiAddress!, $type: String = "0x2::sui::SUI") {
  address(address: $owner) {
    balance(type: $type) {
      coinType {
        repr
      }
      coinObjectCount
      totalBalance
    }
  }
}
    `) as unknown as TypedDocumentString<GetBalanceQuery, GetBalanceQueryVariables>;
export const GetCoinsDocument = new TypedDocumentString(`
    query getCoins($owner: SuiAddress!, $first: Int, $cursor: String, $type: String = "0x2::sui::SUI") {
  address(address: $owner) {
    address
    coins(first: $first, after: $cursor, type: $type) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        coinBalance
        owner {
          ...OBJECT_OWNER_FIELDS
        }
        contents {
          bcs
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
    fragment OBJECT_OWNER_FIELDS on ObjectOwner {
  __typename
  ... on AddressOwner {
    owner {
      asObject {
        address
      }
      asAddress {
        address
      }
    }
  }
  ... on Parent {
    parent {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    owner {
      address
    }
  }
}`) as unknown as TypedDocumentString<GetCoinsQuery, GetCoinsQueryVariables>;
export const GetDynamicFieldsDocument = new TypedDocumentString(`
    query getDynamicFields($parentId: SuiAddress!, $first: Int, $cursor: String) {
  owner(address: $parentId) {
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
export const GetReferenceGasPriceDocument = new TypedDocumentString(`
    query getReferenceGasPrice {
  epoch {
    referenceGasPrice
  }
}
    `) as unknown as TypedDocumentString<GetReferenceGasPriceQuery, GetReferenceGasPriceQueryVariables>;
export const ResolveNameServiceNamesDocument = new TypedDocumentString(`
    query resolveNameServiceNames($address: SuiAddress!, $limit: Int, $cursor: String) {
  address(address: $address) {
    suinsRegistrations(first: $limit, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        domain
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ResolveNameServiceNamesQuery, ResolveNameServiceNamesQueryVariables>;
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
}
fragment OBJECT_OWNER_FIELDS on ObjectOwner {
  __typename
  ... on AddressOwner {
    owner {
      asObject {
        address
      }
      asAddress {
        address
      }
    }
  }
  ... on Parent {
    parent {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    owner {
      address
    }
  }
}`) as unknown as TypedDocumentString<GetOwnedObjectsQuery, GetOwnedObjectsQueryVariables>;
export const MultiGetObjectsDocument = new TypedDocumentString(`
    query multiGetObjects($objectIds: [SuiAddress!]!, $limit: Int, $cursor: String) {
  objects(first: $limit, after: $cursor, filter: {objectIds: $objectIds}) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ...OBJECT_FIELDS
    }
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
}
fragment OBJECT_OWNER_FIELDS on ObjectOwner {
  __typename
  ... on AddressOwner {
    owner {
      asObject {
        address
      }
      asAddress {
        address
      }
    }
  }
  ... on Parent {
    parent {
      address
    }
  }
  ... on Shared {
    initialSharedVersion
  }
  ... on ConsensusAddressOwner {
    startVersion
    owner {
      address
    }
  }
}`) as unknown as TypedDocumentString<MultiGetObjectsQuery, MultiGetObjectsQueryVariables>;
export const DryRunTransactionBlockDocument = new TypedDocumentString(`
    query dryRunTransactionBlock($txBytes: String!) {
  dryRunTransactionBlock(txBytes: $txBytes) {
    error
    transaction {
      ...TRANSACTION_FIELDS
    }
  }
}
    fragment TRANSACTION_FIELDS on TransactionBlock {
  digest
  bcs
  signatures
  effects {
    bcs
    epoch {
      epochId
    }
    unchangedSharedObjects {
      nodes {
        __typename
        ... on SharedObjectRead {
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
  }
}`) as unknown as TypedDocumentString<DryRunTransactionBlockQuery, DryRunTransactionBlockQueryVariables>;
export const ExecuteTransactionBlockDocument = new TypedDocumentString(`
    mutation executeTransactionBlock($txBytes: String!, $signatures: [String!]!) {
  executeTransactionBlock(txBytes: $txBytes, signatures: $signatures) {
    errors
    effects {
      transactionBlock {
        ...TRANSACTION_FIELDS
      }
    }
  }
}
    fragment TRANSACTION_FIELDS on TransactionBlock {
  digest
  bcs
  signatures
  effects {
    bcs
    epoch {
      epochId
    }
    unchangedSharedObjects {
      nodes {
        __typename
        ... on SharedObjectRead {
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
  }
}`) as unknown as TypedDocumentString<ExecuteTransactionBlockMutation, ExecuteTransactionBlockMutationVariables>;
export const GetTransactionBlockDocument = new TypedDocumentString(`
    query getTransactionBlock($digest: String!) {
  transactionBlock(digest: $digest) {
    ...TRANSACTION_FIELDS
  }
}
    fragment TRANSACTION_FIELDS on TransactionBlock {
  digest
  bcs
  signatures
  effects {
    bcs
    epoch {
      epochId
    }
    unchangedSharedObjects {
      nodes {
        __typename
        ... on SharedObjectRead {
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
  }
}`) as unknown as TypedDocumentString<GetTransactionBlockQuery, GetTransactionBlockQueryVariables>;
export const VerifyZkLoginSignatureDocument = new TypedDocumentString(`
    query verifyZkLoginSignature($bytes: Base64!, $signature: Base64!, $intentScope: ZkLoginIntentScope!, $author: SuiAddress!) {
  verifyZkloginSignature(
    bytes: $bytes
    signature: $signature
    intentScope: $intentScope
    author: $author
  ) {
    success
    errors
  }
}
    `) as unknown as TypedDocumentString<VerifyZkLoginSignatureQuery, VerifyZkLoginSignatureQueryVariables>;