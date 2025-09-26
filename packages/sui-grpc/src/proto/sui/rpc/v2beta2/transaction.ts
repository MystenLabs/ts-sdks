// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
import { Duration } from '../../../google/protobuf/duration.js';
import { Empty } from '../../../google/protobuf/empty.js';
import { Object } from './object.js';
import { Timestamp } from '../../../google/protobuf/timestamp.js';
import { Argument } from './argument.js';
import { Input } from './input.js';
import { ObjectReference } from './object_reference.js';
import { Bcs } from './bcs.js';
/**
 * A transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Transaction
 */
export interface Transaction {
	/**
	 * This Transaction serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs bcs = 1
	 */
	bcs?: Bcs;
	/**
	 * The digest of this Transaction.
	 *
	 * @generated from protobuf field: optional string digest = 2
	 */
	digest?: string;
	/**
	 * Version of this Transaction.
	 *
	 * @generated from protobuf field: optional int32 version = 3
	 */
	version?: number;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.TransactionKind kind = 4
	 */
	kind?: TransactionKind;
	/**
	 * @generated from protobuf field: optional string sender = 5
	 */
	sender?: string;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.GasPayment gas_payment = 6
	 */
	gasPayment?: GasPayment;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.TransactionExpiration expiration = 7
	 */
	expiration?: TransactionExpiration;
}
/**
 * Payment information for executing a transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GasPayment
 */
export interface GasPayment {
	/**
	 * Set of gas objects to use for payment.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ObjectReference objects = 1
	 */
	objects: ObjectReference[];
	/**
	 * Owner of the gas objects, either the transaction sender or a sponsor.
	 *
	 * @generated from protobuf field: optional string owner = 2
	 */
	owner?: string;
	/**
	 * Gas unit price to use when charging for computation.
	 *
	 * Must be greater than or equal to the network's current RGP (reference gas price).
	 *
	 * @generated from protobuf field: optional uint64 price = 3
	 */
	price?: bigint;
	/**
	 * Total budget willing to spend for the execution of a transaction.
	 *
	 * @generated from protobuf field: optional uint64 budget = 4
	 */
	budget?: bigint;
}
/**
 * A TTL for a transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TransactionExpiration
 */
export interface TransactionExpiration {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.TransactionExpiration.TransactionExpirationKind kind = 1
	 */
	kind?: TransactionExpiration_TransactionExpirationKind;
	/**
	 * @generated from protobuf field: optional uint64 epoch = 2
	 */
	epoch?: bigint;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.TransactionExpiration.TransactionExpirationKind
 */
export enum TransactionExpiration_TransactionExpirationKind {
	/**
	 * @generated from protobuf enum value: TRANSACTION_EXPIRATION_KIND_UNKNOWN = 0;
	 */
	TRANSACTION_EXPIRATION_KIND_UNKNOWN = 0,
	/**
	 * The transaction has no expiration.
	 *
	 * @generated from protobuf enum value: NONE = 1;
	 */
	NONE = 1,
	/**
	 * Validators won't sign and execute transaction unless the expiration epoch
	 * is greater than or equal to the current epoch.
	 *
	 * @generated from protobuf enum value: EPOCH = 2;
	 */
	EPOCH = 2,
}
/**
 * Transaction type.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TransactionKind
 */
export interface TransactionKind {
	/**
	 * @generated from protobuf oneof: kind
	 */
	kind:
		| {
				oneofKind: 'programmableTransaction';
				/**
				 * A user transaction comprised of a list of native commands and Move calls.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ProgrammableTransaction programmable_transaction = 2
				 */
				programmableTransaction: ProgrammableTransaction;
		  }
		| {
				oneofKind: 'programmableSystemTransaction';
				// System Transactions

				/**
				 * A system transaction comprised of a list of native commands and Move calls.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ProgrammableTransaction programmable_system_transaction = 3
				 */
				programmableSystemTransaction: ProgrammableTransaction;
		  }
		| {
				oneofKind: 'changeEpoch';
				/**
				 * System transaction used to end an epoch.
				 *
				 * The `ChangeEpoch` variant is now deprecated (but the `ChangeEpoch` struct is still used by
				 * `EndOfEpochTransaction`).
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ChangeEpoch change_epoch = 100
				 */
				changeEpoch: ChangeEpoch;
		  }
		| {
				oneofKind: 'genesis';
				/**
				 * Transaction used to initialize the chain state.
				 *
				 * Only valid if in the genesis checkpoint (0) and if this is the very first transaction ever
				 * executed on the chain.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.GenesisTransaction genesis = 101
				 */
				genesis: GenesisTransaction;
		  }
		| {
				oneofKind: 'consensusCommitPrologueV1';
				/**
				 * V1 consensus commit update.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v1 = 102
				 */
				consensusCommitPrologueV1: ConsensusCommitPrologue;
		  }
		| {
				oneofKind: 'authenticatorStateUpdate';
				/**
				 * Update set of valid JWKs used for zklogin.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.AuthenticatorStateUpdate authenticator_state_update = 103
				 */
				authenticatorStateUpdate: AuthenticatorStateUpdate;
		  }
		| {
				oneofKind: 'endOfEpoch';
				/**
				 * Set of operations to run at the end of the epoch to close out the current epoch and start
				 * the next one.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.EndOfEpochTransaction end_of_epoch = 104
				 */
				endOfEpoch: EndOfEpochTransaction;
		  }
		| {
				oneofKind: 'randomnessStateUpdate';
				/**
				 * Randomness update.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.RandomnessStateUpdate randomness_state_update = 105
				 */
				randomnessStateUpdate: RandomnessStateUpdate;
		  }
		| {
				oneofKind: 'consensusCommitPrologueV2';
				/**
				 * V2 consensus commit update.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v2 = 106
				 */
				consensusCommitPrologueV2: ConsensusCommitPrologue;
		  }
		| {
				oneofKind: 'consensusCommitPrologueV3';
				/**
				 * V3 consensus commit update.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v3 = 107
				 */
				consensusCommitPrologueV3: ConsensusCommitPrologue;
		  }
		| {
				oneofKind: 'consensusCommitPrologueV4';
				/**
				 * V4 consensus commit update.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v4 = 108
				 */
				consensusCommitPrologueV4: ConsensusCommitPrologue;
		  }
		| {
				oneofKind: undefined;
		  };
}
/**
 * A user transaction.
 *
 * Contains a series of native commands and Move calls where the results of one command can be
 * used in future commands.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ProgrammableTransaction
 */
export interface ProgrammableTransaction {
	/**
	 * Input objects or primitive values.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Input inputs = 1
	 */
	inputs: Input[];
	/**
	 * The commands to be executed sequentially. A failure in any command
	 * results in the failure of the entire transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Command commands = 2
	 */
	commands: Command[];
}
/**
 * A single command in a programmable transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Command
 */
export interface Command {
	/**
	 * @generated from protobuf oneof: command
	 */
	command:
		| {
				oneofKind: 'moveCall';
				/**
				 * A call to either an entry or a public Move function.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.MoveCall move_call = 1
				 */
				moveCall: MoveCall;
		  }
		| {
				oneofKind: 'transferObjects';
				/**
				 * `(Vec<forall T:key+store. T>, address)`
				 * It sends n-objects to the specified address. These objects must have store
				 * (public transfer) and either the previous owner must be an address or the object must
				 * be newly created.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.TransferObjects transfer_objects = 2
				 */
				transferObjects: TransferObjects;
		  }
		| {
				oneofKind: 'splitCoins';
				/**
				 * `(&mut Coin<T>, Vec<u64>)` -> `Vec<Coin<T>>`
				 * It splits off some amounts into new coins with those amounts.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.SplitCoins split_coins = 3
				 */
				splitCoins: SplitCoins;
		  }
		| {
				oneofKind: 'mergeCoins';
				/**
				 * `(&mut Coin<T>, Vec<Coin<T>>)`
				 * It merges n-coins into the first coin.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.MergeCoins merge_coins = 4
				 */
				mergeCoins: MergeCoins;
		  }
		| {
				oneofKind: 'publish';
				/**
				 * Publishes a Move package. It takes the package bytes and a list of the package's transitive
				 * dependencies to link against on chain.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.Publish publish = 5
				 */
				publish: Publish;
		  }
		| {
				oneofKind: 'makeMoveVector';
				/**
				 * `forall T: Vec<T> -> vector<T>`
				 * Given n-values of the same type, it constructs a vector. For non-objects or an empty vector,
				 * the type tag must be specified.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.MakeMoveVector make_move_vector = 6
				 */
				makeMoveVector: MakeMoveVector;
		  }
		| {
				oneofKind: 'upgrade';
				/**
				 * Upgrades a Move package.
				 * Takes (in order):
				 * 1. A vector of serialized modules for the package.
				 * 2. A vector of object ids for the transitive dependencies of the new package.
				 * 3. The object ID of the package being upgraded.
				 * 4. An argument holding the `UpgradeTicket` that must have been produced from an earlier command in the same
				 *    programmable transaction.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.Upgrade upgrade = 7
				 */
				upgrade: Upgrade;
		  }
		| {
				oneofKind: undefined;
		  };
}
/**
 * Command to call a Move function.
 *
 * Functions that can be called by a `MoveCall` command are those that have a function signature
 * that is either `entry` or `public` (which don't have a reference return type).
 *
 * @generated from protobuf message sui.rpc.v2beta2.MoveCall
 */
export interface MoveCall {
	/**
	 * The package containing the module and function.
	 *
	 * @generated from protobuf field: optional string package = 1
	 */
	package?: string;
	/**
	 * The specific module in the package containing the function.
	 *
	 * @generated from protobuf field: optional string module = 2
	 */
	module?: string;
	/**
	 * The function to be called.
	 *
	 * @generated from protobuf field: optional string function = 3
	 */
	function?: string;
	/**
	 * The type arguments to the function.
	 *
	 * @generated from protobuf field: repeated string type_arguments = 4
	 */
	typeArguments: string[];
	/**
	 * The arguments to the function.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Argument arguments = 5
	 */
	arguments: Argument[];
}
/**
 * Command to transfer ownership of a set of objects to an address.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TransferObjects
 */
export interface TransferObjects {
	/**
	 * Set of objects to transfer.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Argument objects = 1
	 */
	objects: Argument[];
	/**
	 * The address to transfer ownership to.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Argument address = 2
	 */
	address?: Argument;
}
/**
 * Command to split a single coin object into multiple coins.
 *
 * @generated from protobuf message sui.rpc.v2beta2.SplitCoins
 */
export interface SplitCoins {
	/**
	 * The coin to split.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Argument coin = 1
	 */
	coin?: Argument;
	/**
	 * The amounts to split off.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Argument amounts = 2
	 */
	amounts: Argument[];
}
/**
 * Command to merge multiple coins of the same type into a single coin.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MergeCoins
 */
export interface MergeCoins {
	/**
	 * Coin to merge coins into.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Argument coin = 1
	 */
	coin?: Argument;
	/**
	 * Set of coins to merge into `coin`.
	 *
	 * All listed coins must be of the same type and be the same type as `coin`
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Argument coins_to_merge = 2
	 */
	coinsToMerge: Argument[];
}
/**
 * Command to publish a new Move package.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Publish
 */
export interface Publish {
	/**
	 * The serialized Move modules.
	 *
	 * @generated from protobuf field: repeated bytes modules = 1
	 */
	modules: Uint8Array[];
	/**
	 * Set of packages that the to-be published package depends on.
	 *
	 * @generated from protobuf field: repeated string dependencies = 2
	 */
	dependencies: string[];
}
/**
 * Command to build a Move vector out of a set of individual elements.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MakeMoveVector
 */
export interface MakeMoveVector {
	/**
	 * Type of the individual elements.
	 *
	 * This is required to be set when the type can't be inferred, for example when the set of
	 * provided arguments are all pure input values.
	 *
	 * @generated from protobuf field: optional string element_type = 1
	 */
	elementType?: string;
	/**
	 * The set individual elements to build the vector with.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Argument elements = 2
	 */
	elements: Argument[];
}
/**
 * Command to upgrade an already published package.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Upgrade
 */
export interface Upgrade {
	/**
	 * The serialized Move modules.
	 *
	 * @generated from protobuf field: repeated bytes modules = 1
	 */
	modules: Uint8Array[];
	/**
	 * Set of packages that the to-be published package depends on.
	 *
	 * @generated from protobuf field: repeated string dependencies = 2
	 */
	dependencies: string[];
	/**
	 * Package ID of the package to upgrade.
	 *
	 * @generated from protobuf field: optional string package = 3
	 */
	package?: string;
	/**
	 * Ticket authorizing the upgrade.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Argument ticket = 4
	 */
	ticket?: Argument;
}
/**
 * Randomness update.
 *
 * @generated from protobuf message sui.rpc.v2beta2.RandomnessStateUpdate
 */
export interface RandomnessStateUpdate {
	/**
	 * Epoch of the randomness state update transaction.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1
	 */
	epoch?: bigint;
	/**
	 * Randomness round of the update.
	 *
	 * @generated from protobuf field: optional uint64 randomness_round = 2
	 */
	randomnessRound?: bigint;
	/**
	 * Updated random bytes.
	 *
	 * @generated from protobuf field: optional bytes random_bytes = 3
	 */
	randomBytes?: Uint8Array;
	/**
	 * The initial version of the randomness object that it was shared at.
	 *
	 * @generated from protobuf field: optional uint64 randomness_object_initial_shared_version = 4
	 */
	randomnessObjectInitialSharedVersion?: bigint;
}
/**
 * System transaction used to change the epoch.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ChangeEpoch
 */
export interface ChangeEpoch {
	/**
	 * The next (to become) epoch ID.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1
	 */
	epoch?: bigint;
	/**
	 * The protocol version in effect in the new epoch.
	 *
	 * @generated from protobuf field: optional uint64 protocol_version = 2
	 */
	protocolVersion?: bigint;
	/**
	 * The total amount of gas charged for storage during the epoch.
	 *
	 * @generated from protobuf field: optional uint64 storage_charge = 3
	 */
	storageCharge?: bigint;
	/**
	 * The total amount of gas charged for computation during the epoch.
	 *
	 * @generated from protobuf field: optional uint64 computation_charge = 4
	 */
	computationCharge?: bigint;
	/**
	 * The amount of storage rebate refunded to the txn senders.
	 *
	 * @generated from protobuf field: optional uint64 storage_rebate = 5
	 */
	storageRebate?: bigint;
	/**
	 * The non-refundable storage fee.
	 *
	 * @generated from protobuf field: optional uint64 non_refundable_storage_fee = 6
	 */
	nonRefundableStorageFee?: bigint;
	/**
	 * Unix timestamp when epoch started.
	 *
	 * @generated from protobuf field: optional google.protobuf.Timestamp epoch_start_timestamp = 7
	 */
	epochStartTimestamp?: Timestamp;
	/**
	 * System packages (specifically framework and Move stdlib) that are written before the new
	 * epoch starts. This tracks framework upgrades on chain. When executing the `ChangeEpoch` txn,
	 * the validator must write out the following modules.  Modules are provided with the version they
	 * will be upgraded to, their modules in serialized form (which include their package ID), and
	 * a list of their transitive dependencies.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.SystemPackage system_packages = 8
	 */
	systemPackages: SystemPackage[];
}
/**
 * System package.
 *
 * @generated from protobuf message sui.rpc.v2beta2.SystemPackage
 */
export interface SystemPackage {
	/**
	 * Version of the package.
	 *
	 * @generated from protobuf field: optional uint64 version = 1
	 */
	version?: bigint;
	/**
	 * Move modules.
	 *
	 * @generated from protobuf field: repeated bytes modules = 2
	 */
	modules: Uint8Array[];
	/**
	 * Package dependencies.
	 *
	 * @generated from protobuf field: repeated string dependencies = 3
	 */
	dependencies: string[];
}
/**
 * The genesis transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GenesisTransaction
 */
export interface GenesisTransaction {
	/**
	 * Set of genesis objects.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Object objects = 1
	 */
	objects: Object[];
}
/**
 * Consensus commit prologue system transaction.
 *
 * This message can represent V1, V2, and V3 prologue types.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ConsensusCommitPrologue
 */
export interface ConsensusCommitPrologue {
	/**
	 * Epoch of the commit prologue transaction.
	 *
	 * Present in V1, V2, V3, V4.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1
	 */
	epoch?: bigint;
	/**
	 * Consensus round of the commit.
	 *
	 * Present in V1, V2, V3, V4.
	 *
	 * @generated from protobuf field: optional uint64 round = 2
	 */
	round?: bigint;
	/**
	 * Unix timestamp from consensus.
	 *
	 * Present in V1, V2, V3, V4.
	 *
	 * @generated from protobuf field: optional google.protobuf.Timestamp commit_timestamp = 3
	 */
	commitTimestamp?: Timestamp;
	/**
	 * Digest of consensus output.
	 *
	 * Present in V2, V3, V4.
	 *
	 * @generated from protobuf field: optional string consensus_commit_digest = 4
	 */
	consensusCommitDigest?: string;
	/**
	 * The sub DAG index of the consensus commit. This field is populated if there
	 * are multiple consensus commits per round.
	 *
	 * Present in V3, V4.
	 *
	 * @generated from protobuf field: optional uint64 sub_dag_index = 5
	 */
	subDagIndex?: bigint;
	/**
	 * Stores consensus handler determined consensus object version assignments.
	 *
	 * Present in V3, V4.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ConsensusDeterminedVersionAssignments consensus_determined_version_assignments = 6
	 */
	consensusDeterminedVersionAssignments?: ConsensusDeterminedVersionAssignments;
	/**
	 * Digest of any additional state computed by the consensus handler.
	 * Used to detect forking bugs as early as possible.
	 *
	 * Present in V4.
	 *
	 * @generated from protobuf field: optional string additional_state_digest = 7
	 */
	additionalStateDigest?: string;
}
/**
 * Object version assignment from consensus.
 *
 * @generated from protobuf message sui.rpc.v2beta2.VersionAssignment
 */
export interface VersionAssignment {
	/**
	 * `ObjectId` of the object.
	 *
	 * @generated from protobuf field: optional string object_id = 1
	 */
	objectId?: string;
	/**
	 * start version of the consensus stream for this object
	 *
	 * @generated from protobuf field: optional uint64 start_version = 2
	 */
	startVersion?: bigint;
	/**
	 * Assigned version.
	 *
	 * @generated from protobuf field: optional uint64 version = 3
	 */
	version?: bigint;
}
/**
 * A transaction that was canceled.
 *
 * @generated from protobuf message sui.rpc.v2beta2.CanceledTransaction
 */
export interface CanceledTransaction {
	/**
	 * Digest of the canceled transaction.
	 *
	 * @generated from protobuf field: optional string digest = 1
	 */
	digest?: string;
	/**
	 * List of object version assignments.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.VersionAssignment version_assignments = 2
	 */
	versionAssignments: VersionAssignment[];
}
/**
 * Version assignments performed by consensus.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ConsensusDeterminedVersionAssignments
 */
export interface ConsensusDeterminedVersionAssignments {
	/**
	 * Version of this message
	 *
	 * @generated from protobuf field: optional int32 version = 1
	 */
	version?: number;
	/**
	 * Canceled transaction version assignment.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.CanceledTransaction canceled_transactions = 3
	 */
	canceledTransactions: CanceledTransaction[];
}
/**
 * Update the set of valid JWKs.
 *
 * @generated from protobuf message sui.rpc.v2beta2.AuthenticatorStateUpdate
 */
export interface AuthenticatorStateUpdate {
	/**
	 * Epoch of the authenticator state update transaction.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1
	 */
	epoch?: bigint;
	/**
	 * Consensus round of the authenticator state update.
	 *
	 * @generated from protobuf field: optional uint64 round = 2
	 */
	round?: bigint;
	/**
	 * Newly active JWKs.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ActiveJwk new_active_jwks = 3
	 */
	newActiveJwks: ActiveJwk[];
	/**
	 * The initial version of the authenticator object that it was shared at.
	 *
	 * @generated from protobuf field: optional uint64 authenticator_object_initial_shared_version = 4
	 */
	authenticatorObjectInitialSharedVersion?: bigint;
}
/**
 * A new JWK.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ActiveJwk
 */
export interface ActiveJwk {
	/**
	 * Identifier used to uniquely identify a JWK.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.JwkId id = 1
	 */
	id?: JwkId;
	/**
	 * The JWK.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Jwk jwk = 2
	 */
	jwk?: Jwk;
	/**
	 * Most recent epoch in which the JWK was validated.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 3
	 */
	epoch?: bigint;
}
/**
 * Key to uniquely identify a JWK.
 *
 * @generated from protobuf message sui.rpc.v2beta2.JwkId
 */
export interface JwkId {
	/**
	 * The issuer or identity of the OIDC provider.
	 *
	 * @generated from protobuf field: optional string iss = 1
	 */
	iss?: string;
	/**
	 * A key ID used to uniquely identify a key from an OIDC provider.
	 *
	 * @generated from protobuf field: optional string kid = 2
	 */
	kid?: string;
}
/**
 * A JSON web key.
 *
 * Struct that contains info for a JWK. A list of them for different kinds can
 * be retrieved from the JWK endpoint (for example, <https://www.googleapis.com/oauth2/v3/certs>).
 * The JWK is used to verify the JWT token.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Jwk
 */
export interface Jwk {
	/**
	 * Key type parameter, https://datatracker.ietf.org/doc/html/rfc7517#section-4.1.
	 *
	 * @generated from protobuf field: optional string kty = 1
	 */
	kty?: string;
	/**
	 * RSA public exponent, https://datatracker.ietf.org/doc/html/rfc7517#section-9.3.
	 *
	 * @generated from protobuf field: optional string e = 2
	 */
	e?: string;
	/**
	 * RSA modulus, https://datatracker.ietf.org/doc/html/rfc7517#section-9.3.
	 *
	 * @generated from protobuf field: optional string n = 3
	 */
	n?: string;
	/**
	 * Algorithm parameter, https://datatracker.ietf.org/doc/html/rfc7517#section-4.4.
	 *
	 * @generated from protobuf field: optional string alg = 4
	 */
	alg?: string;
}
/**
 * Set of operations run at the end of the epoch to close out the current epoch
 * and start the next one.
 *
 * @generated from protobuf message sui.rpc.v2beta2.EndOfEpochTransaction
 */
export interface EndOfEpochTransaction {
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.EndOfEpochTransactionKind transactions = 1
	 */
	transactions: EndOfEpochTransactionKind[];
}
/**
 * Operation run at the end of an epoch.
 *
 * @generated from protobuf message sui.rpc.v2beta2.EndOfEpochTransactionKind
 */
export interface EndOfEpochTransactionKind {
	/**
	 * @generated from protobuf oneof: kind
	 */
	kind:
		| {
				oneofKind: 'changeEpoch';
				/**
				 * End the epoch and start the next one.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ChangeEpoch change_epoch = 2
				 */
				changeEpoch: ChangeEpoch;
		  }
		| {
				oneofKind: 'authenticatorStateExpire';
				/**
				 * Expire JWKs used for zklogin.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.AuthenticatorStateExpire authenticator_state_expire = 3
				 */
				authenticatorStateExpire: AuthenticatorStateExpire;
		  }
		| {
				oneofKind: 'executionTimeObservations';
				/**
				 * Execution time observations from the committee to preserve cross epoch
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ExecutionTimeObservations execution_time_observations = 4
				 */
				executionTimeObservations: ExecutionTimeObservations;
		  }
		| {
				oneofKind: 'authenticatorStateCreate';
				// Use higher field numbers for kinds which happen infrequently.

				/**
				 * Create and initialize the authenticator object used for zklogin.
				 *
				 * @generated from protobuf field: google.protobuf.Empty authenticator_state_create = 200
				 */
				authenticatorStateCreate: Empty;
		  }
		| {
				oneofKind: 'randomnessStateCreate';
				/**
				 * Create and initialize the randomness object.
				 *
				 * @generated from protobuf field: google.protobuf.Empty randomness_state_create = 201
				 */
				randomnessStateCreate: Empty;
		  }
		| {
				oneofKind: 'denyListStateCreate';
				/**
				 * Create and initialize the deny list object.
				 *
				 * @generated from protobuf field: google.protobuf.Empty deny_list_state_create = 202
				 */
				denyListStateCreate: Empty;
		  }
		| {
				oneofKind: 'bridgeStateCreate';
				/**
				 * Create and initialize the bridge object.
				 *
				 * @generated from protobuf field: string bridge_state_create = 203
				 */
				bridgeStateCreate: string;
		  }
		| {
				oneofKind: 'bridgeCommitteeInit';
				/**
				 * Initialize the bridge committee.
				 *
				 * @generated from protobuf field: uint64 bridge_committee_init = 204
				 */
				bridgeCommitteeInit: bigint;
		  }
		| {
				oneofKind: 'accumulatorRootCreate';
				/**
				 * Create the accumulator root object.
				 *
				 * @generated from protobuf field: google.protobuf.Empty accumulator_root_create = 205
				 */
				accumulatorRootCreate: Empty;
		  }
		| {
				oneofKind: 'coinRegistryCreate';
				/**
				 * Create and initialize the Coin Registry object.
				 *
				 * @generated from protobuf field: google.protobuf.Empty coin_registry_create = 206
				 */
				coinRegistryCreate: Empty;
		  }
		| {
				oneofKind: undefined;
		  };
}
/**
 * Expire old JWKs.
 *
 * @generated from protobuf message sui.rpc.v2beta2.AuthenticatorStateExpire
 */
export interface AuthenticatorStateExpire {
	/**
	 * Expire JWKs that have a lower epoch than this.
	 *
	 * @generated from protobuf field: optional uint64 min_epoch = 1
	 */
	minEpoch?: bigint;
	/**
	 * The initial version of the authenticator object that it was shared at.
	 *
	 * @generated from protobuf field: optional uint64 authenticator_object_initial_shared_version = 2
	 */
	authenticatorObjectInitialSharedVersion?: bigint;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ExecutionTimeObservations
 */
export interface ExecutionTimeObservations {
	/**
	 * Version of this ExecutionTimeObservations
	 *
	 * @generated from protobuf field: optional int32 version = 1
	 */
	version?: number;
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ExecutionTimeObservation observations = 2
	 */
	observations: ExecutionTimeObservation[];
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ExecutionTimeObservation
 */
export interface ExecutionTimeObservation {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ExecutionTimeObservation.ExecutionTimeObservationKind kind = 1
	 */
	kind?: ExecutionTimeObservation_ExecutionTimeObservationKind;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveCall move_entry_point = 2
	 */
	moveEntryPoint?: MoveCall;
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ValidatorExecutionTimeObservation validator_observations = 3
	 */
	validatorObservations: ValidatorExecutionTimeObservation[];
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.ExecutionTimeObservation.ExecutionTimeObservationKind
 */
export enum ExecutionTimeObservation_ExecutionTimeObservationKind {
	/**
	 * @generated from protobuf enum value: EXECUTION_TIME_OBSERVATION_KIND_UNKNOWN = 0;
	 */
	EXECUTION_TIME_OBSERVATION_KIND_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: MOVE_ENTRY_POINT = 1;
	 */
	MOVE_ENTRY_POINT = 1,
	/**
	 * @generated from protobuf enum value: TRANSFER_OBJECTS = 2;
	 */
	TRANSFER_OBJECTS = 2,
	/**
	 * @generated from protobuf enum value: SPLIT_COINS = 3;
	 */
	SPLIT_COINS = 3,
	/**
	 * @generated from protobuf enum value: MERGE_COINS = 4;
	 */
	MERGE_COINS = 4,
	/**
	 * @generated from protobuf enum value: PUBLISH = 5;
	 */
	PUBLISH = 5,
	/**
	 * @generated from protobuf enum value: MAKE_MOVE_VECTOR = 6;
	 */
	MAKE_MOVE_VECTOR = 6,
	/**
	 * @generated from protobuf enum value: UPGRADE = 7;
	 */
	UPGRADE = 7,
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ValidatorExecutionTimeObservation
 */
export interface ValidatorExecutionTimeObservation {
	/**
	 * Bls12381 public key of the validator
	 *
	 * @generated from protobuf field: optional bytes validator = 1
	 */
	validator?: Uint8Array;
	/**
	 * Duration of an execution observation
	 *
	 * @generated from protobuf field: optional google.protobuf.Duration duration = 2
	 */
	duration?: Duration;
}
// @generated message type with reflection information, may provide speed optimized methods
class Transaction$Type extends MessageType<Transaction> {
	constructor() {
		super('sui.rpc.v2beta2.Transaction', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'version', kind: 'scalar', opt: true, T: 5 /*ScalarType.INT32*/ },
			{ no: 4, name: 'kind', kind: 'message', T: () => TransactionKind },
			{ no: 5, name: 'sender', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 6, name: 'gas_payment', kind: 'message', T: () => GasPayment },
			{ no: 7, name: 'expiration', kind: 'message', T: () => TransactionExpiration },
		]);
	}
	create(value?: PartialMessage<Transaction>): Transaction {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Transaction>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Transaction,
	): Transaction {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Bcs bcs */ 1:
					message.bcs = Bcs.internalBinaryRead(reader, reader.uint32(), options, message.bcs);
					break;
				case /* optional string digest */ 2:
					message.digest = reader.string();
					break;
				case /* optional int32 version */ 3:
					message.version = reader.int32();
					break;
				case /* optional sui.rpc.v2beta2.TransactionKind kind */ 4:
					message.kind = TransactionKind.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.kind,
					);
					break;
				case /* optional string sender */ 5:
					message.sender = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.GasPayment gas_payment */ 6:
					message.gasPayment = GasPayment.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.gasPayment,
					);
					break;
				case /* optional sui.rpc.v2beta2.TransactionExpiration expiration */ 7:
					message.expiration = TransactionExpiration.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.expiration,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Transaction,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Bcs bcs = 1; */
		if (message.bcs)
			Bcs.internalBinaryWrite(
				message.bcs,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string digest = 2; */
		if (message.digest !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.digest);
		/* optional int32 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).int32(message.version);
		/* optional sui.rpc.v2beta2.TransactionKind kind = 4; */
		if (message.kind)
			TransactionKind.internalBinaryWrite(
				message.kind,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string sender = 5; */
		if (message.sender !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.sender);
		/* optional sui.rpc.v2beta2.GasPayment gas_payment = 6; */
		if (message.gasPayment)
			GasPayment.internalBinaryWrite(
				message.gasPayment,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.TransactionExpiration expiration = 7; */
		if (message.expiration)
			TransactionExpiration.internalBinaryWrite(
				message.expiration,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Transaction
 */
export const Transaction = new Transaction$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GasPayment$Type extends MessageType<GasPayment> {
	constructor() {
		super('sui.rpc.v2beta2.GasPayment', [
			{
				no: 1,
				name: 'objects',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ObjectReference,
			},
			{ no: 2, name: 'owner', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'price',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'budget',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<GasPayment>): GasPayment {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.objects = [];
		if (value !== undefined) reflectionMergePartial<GasPayment>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GasPayment,
	): GasPayment {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.ObjectReference objects */ 1:
					message.objects.push(
						ObjectReference.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional string owner */ 2:
					message.owner = reader.string();
					break;
				case /* optional uint64 price */ 3:
					message.price = reader.uint64().toBigInt();
					break;
				case /* optional uint64 budget */ 4:
					message.budget = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: GasPayment,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.ObjectReference objects = 1; */
		for (let i = 0; i < message.objects.length; i++)
			ObjectReference.internalBinaryWrite(
				message.objects[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string owner = 2; */
		if (message.owner !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.owner);
		/* optional uint64 price = 3; */
		if (message.price !== undefined) writer.tag(3, WireType.Varint).uint64(message.price);
		/* optional uint64 budget = 4; */
		if (message.budget !== undefined) writer.tag(4, WireType.Varint).uint64(message.budget);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GasPayment
 */
export const GasPayment = new GasPayment$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TransactionExpiration$Type extends MessageType<TransactionExpiration> {
	constructor() {
		super('sui.rpc.v2beta2.TransactionExpiration', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta2.TransactionExpiration.TransactionExpirationKind',
					TransactionExpiration_TransactionExpirationKind,
				],
			},
			{
				no: 2,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<TransactionExpiration>): TransactionExpiration {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<TransactionExpiration>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TransactionExpiration,
	): TransactionExpiration {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.TransactionExpiration.TransactionExpirationKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional uint64 epoch */ 2:
					message.epoch = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: TransactionExpiration,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.TransactionExpiration.TransactionExpirationKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional uint64 epoch = 2; */
		if (message.epoch !== undefined) writer.tag(2, WireType.Varint).uint64(message.epoch);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TransactionExpiration
 */
export const TransactionExpiration = new TransactionExpiration$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TransactionKind$Type extends MessageType<TransactionKind> {
	constructor() {
		super('sui.rpc.v2beta2.TransactionKind', [
			{
				no: 2,
				name: 'programmable_transaction',
				kind: 'message',
				oneof: 'kind',
				T: () => ProgrammableTransaction,
			},
			{
				no: 3,
				name: 'programmable_system_transaction',
				kind: 'message',
				oneof: 'kind',
				T: () => ProgrammableTransaction,
			},
			{ no: 100, name: 'change_epoch', kind: 'message', oneof: 'kind', T: () => ChangeEpoch },
			{ no: 101, name: 'genesis', kind: 'message', oneof: 'kind', T: () => GenesisTransaction },
			{
				no: 102,
				name: 'consensus_commit_prologue_v1',
				kind: 'message',
				oneof: 'kind',
				T: () => ConsensusCommitPrologue,
			},
			{
				no: 103,
				name: 'authenticator_state_update',
				kind: 'message',
				oneof: 'kind',
				T: () => AuthenticatorStateUpdate,
			},
			{
				no: 104,
				name: 'end_of_epoch',
				kind: 'message',
				oneof: 'kind',
				T: () => EndOfEpochTransaction,
			},
			{
				no: 105,
				name: 'randomness_state_update',
				kind: 'message',
				oneof: 'kind',
				T: () => RandomnessStateUpdate,
			},
			{
				no: 106,
				name: 'consensus_commit_prologue_v2',
				kind: 'message',
				oneof: 'kind',
				T: () => ConsensusCommitPrologue,
			},
			{
				no: 107,
				name: 'consensus_commit_prologue_v3',
				kind: 'message',
				oneof: 'kind',
				T: () => ConsensusCommitPrologue,
			},
			{
				no: 108,
				name: 'consensus_commit_prologue_v4',
				kind: 'message',
				oneof: 'kind',
				T: () => ConsensusCommitPrologue,
			},
		]);
	}
	create(value?: PartialMessage<TransactionKind>): TransactionKind {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.kind = { oneofKind: undefined };
		if (value !== undefined) reflectionMergePartial<TransactionKind>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TransactionKind,
	): TransactionKind {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* sui.rpc.v2beta2.ProgrammableTransaction programmable_transaction */ 2:
					message.kind = {
						oneofKind: 'programmableTransaction',
						programmableTransaction: ProgrammableTransaction.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).programmableTransaction,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ProgrammableTransaction programmable_system_transaction */ 3:
					message.kind = {
						oneofKind: 'programmableSystemTransaction',
						programmableSystemTransaction: ProgrammableTransaction.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).programmableSystemTransaction,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ChangeEpoch change_epoch */ 100:
					message.kind = {
						oneofKind: 'changeEpoch',
						changeEpoch: ChangeEpoch.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).changeEpoch,
						),
					};
					break;
				case /* sui.rpc.v2beta2.GenesisTransaction genesis */ 101:
					message.kind = {
						oneofKind: 'genesis',
						genesis: GenesisTransaction.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).genesis,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v1 */ 102:
					message.kind = {
						oneofKind: 'consensusCommitPrologueV1',
						consensusCommitPrologueV1: ConsensusCommitPrologue.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).consensusCommitPrologueV1,
						),
					};
					break;
				case /* sui.rpc.v2beta2.AuthenticatorStateUpdate authenticator_state_update */ 103:
					message.kind = {
						oneofKind: 'authenticatorStateUpdate',
						authenticatorStateUpdate: AuthenticatorStateUpdate.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).authenticatorStateUpdate,
						),
					};
					break;
				case /* sui.rpc.v2beta2.EndOfEpochTransaction end_of_epoch */ 104:
					message.kind = {
						oneofKind: 'endOfEpoch',
						endOfEpoch: EndOfEpochTransaction.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).endOfEpoch,
						),
					};
					break;
				case /* sui.rpc.v2beta2.RandomnessStateUpdate randomness_state_update */ 105:
					message.kind = {
						oneofKind: 'randomnessStateUpdate',
						randomnessStateUpdate: RandomnessStateUpdate.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).randomnessStateUpdate,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v2 */ 106:
					message.kind = {
						oneofKind: 'consensusCommitPrologueV2',
						consensusCommitPrologueV2: ConsensusCommitPrologue.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).consensusCommitPrologueV2,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v3 */ 107:
					message.kind = {
						oneofKind: 'consensusCommitPrologueV3',
						consensusCommitPrologueV3: ConsensusCommitPrologue.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).consensusCommitPrologueV3,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v4 */ 108:
					message.kind = {
						oneofKind: 'consensusCommitPrologueV4',
						consensusCommitPrologueV4: ConsensusCommitPrologue.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).consensusCommitPrologueV4,
						),
					};
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: TransactionKind,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* sui.rpc.v2beta2.ProgrammableTransaction programmable_transaction = 2; */
		if (message.kind.oneofKind === 'programmableTransaction')
			ProgrammableTransaction.internalBinaryWrite(
				message.kind.programmableTransaction,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ProgrammableTransaction programmable_system_transaction = 3; */
		if (message.kind.oneofKind === 'programmableSystemTransaction')
			ProgrammableTransaction.internalBinaryWrite(
				message.kind.programmableSystemTransaction,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ChangeEpoch change_epoch = 100; */
		if (message.kind.oneofKind === 'changeEpoch')
			ChangeEpoch.internalBinaryWrite(
				message.kind.changeEpoch,
				writer.tag(100, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.GenesisTransaction genesis = 101; */
		if (message.kind.oneofKind === 'genesis')
			GenesisTransaction.internalBinaryWrite(
				message.kind.genesis,
				writer.tag(101, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v1 = 102; */
		if (message.kind.oneofKind === 'consensusCommitPrologueV1')
			ConsensusCommitPrologue.internalBinaryWrite(
				message.kind.consensusCommitPrologueV1,
				writer.tag(102, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.AuthenticatorStateUpdate authenticator_state_update = 103; */
		if (message.kind.oneofKind === 'authenticatorStateUpdate')
			AuthenticatorStateUpdate.internalBinaryWrite(
				message.kind.authenticatorStateUpdate,
				writer.tag(103, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.EndOfEpochTransaction end_of_epoch = 104; */
		if (message.kind.oneofKind === 'endOfEpoch')
			EndOfEpochTransaction.internalBinaryWrite(
				message.kind.endOfEpoch,
				writer.tag(104, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.RandomnessStateUpdate randomness_state_update = 105; */
		if (message.kind.oneofKind === 'randomnessStateUpdate')
			RandomnessStateUpdate.internalBinaryWrite(
				message.kind.randomnessStateUpdate,
				writer.tag(105, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v2 = 106; */
		if (message.kind.oneofKind === 'consensusCommitPrologueV2')
			ConsensusCommitPrologue.internalBinaryWrite(
				message.kind.consensusCommitPrologueV2,
				writer.tag(106, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v3 = 107; */
		if (message.kind.oneofKind === 'consensusCommitPrologueV3')
			ConsensusCommitPrologue.internalBinaryWrite(
				message.kind.consensusCommitPrologueV3,
				writer.tag(107, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ConsensusCommitPrologue consensus_commit_prologue_v4 = 108; */
		if (message.kind.oneofKind === 'consensusCommitPrologueV4')
			ConsensusCommitPrologue.internalBinaryWrite(
				message.kind.consensusCommitPrologueV4,
				writer.tag(108, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TransactionKind
 */
export const TransactionKind = new TransactionKind$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ProgrammableTransaction$Type extends MessageType<ProgrammableTransaction> {
	constructor() {
		super('sui.rpc.v2beta2.ProgrammableTransaction', [
			{ no: 1, name: 'inputs', kind: 'message', repeat: 2 /*RepeatType.UNPACKED*/, T: () => Input },
			{
				no: 2,
				name: 'commands',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Command,
			},
		]);
	}
	create(value?: PartialMessage<ProgrammableTransaction>): ProgrammableTransaction {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.inputs = [];
		message.commands = [];
		if (value !== undefined) reflectionMergePartial<ProgrammableTransaction>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ProgrammableTransaction,
	): ProgrammableTransaction {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.Input inputs */ 1:
					message.inputs.push(Input.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* repeated sui.rpc.v2beta2.Command commands */ 2:
					message.commands.push(Command.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ProgrammableTransaction,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.Input inputs = 1; */
		for (let i = 0; i < message.inputs.length; i++)
			Input.internalBinaryWrite(
				message.inputs[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.Command commands = 2; */
		for (let i = 0; i < message.commands.length; i++)
			Command.internalBinaryWrite(
				message.commands[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ProgrammableTransaction
 */
export const ProgrammableTransaction = new ProgrammableTransaction$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Command$Type extends MessageType<Command> {
	constructor() {
		super('sui.rpc.v2beta2.Command', [
			{ no: 1, name: 'move_call', kind: 'message', oneof: 'command', T: () => MoveCall },
			{
				no: 2,
				name: 'transfer_objects',
				kind: 'message',
				oneof: 'command',
				T: () => TransferObjects,
			},
			{ no: 3, name: 'split_coins', kind: 'message', oneof: 'command', T: () => SplitCoins },
			{ no: 4, name: 'merge_coins', kind: 'message', oneof: 'command', T: () => MergeCoins },
			{ no: 5, name: 'publish', kind: 'message', oneof: 'command', T: () => Publish },
			{
				no: 6,
				name: 'make_move_vector',
				kind: 'message',
				oneof: 'command',
				T: () => MakeMoveVector,
			},
			{ no: 7, name: 'upgrade', kind: 'message', oneof: 'command', T: () => Upgrade },
		]);
	}
	create(value?: PartialMessage<Command>): Command {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.command = { oneofKind: undefined };
		if (value !== undefined) reflectionMergePartial<Command>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Command,
	): Command {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* sui.rpc.v2beta2.MoveCall move_call */ 1:
					message.command = {
						oneofKind: 'moveCall',
						moveCall: MoveCall.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).moveCall,
						),
					};
					break;
				case /* sui.rpc.v2beta2.TransferObjects transfer_objects */ 2:
					message.command = {
						oneofKind: 'transferObjects',
						transferObjects: TransferObjects.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).transferObjects,
						),
					};
					break;
				case /* sui.rpc.v2beta2.SplitCoins split_coins */ 3:
					message.command = {
						oneofKind: 'splitCoins',
						splitCoins: SplitCoins.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).splitCoins,
						),
					};
					break;
				case /* sui.rpc.v2beta2.MergeCoins merge_coins */ 4:
					message.command = {
						oneofKind: 'mergeCoins',
						mergeCoins: MergeCoins.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).mergeCoins,
						),
					};
					break;
				case /* sui.rpc.v2beta2.Publish publish */ 5:
					message.command = {
						oneofKind: 'publish',
						publish: Publish.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).publish,
						),
					};
					break;
				case /* sui.rpc.v2beta2.MakeMoveVector make_move_vector */ 6:
					message.command = {
						oneofKind: 'makeMoveVector',
						makeMoveVector: MakeMoveVector.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).makeMoveVector,
						),
					};
					break;
				case /* sui.rpc.v2beta2.Upgrade upgrade */ 7:
					message.command = {
						oneofKind: 'upgrade',
						upgrade: Upgrade.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.command as any).upgrade,
						),
					};
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Command,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* sui.rpc.v2beta2.MoveCall move_call = 1; */
		if (message.command.oneofKind === 'moveCall')
			MoveCall.internalBinaryWrite(
				message.command.moveCall,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.TransferObjects transfer_objects = 2; */
		if (message.command.oneofKind === 'transferObjects')
			TransferObjects.internalBinaryWrite(
				message.command.transferObjects,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.SplitCoins split_coins = 3; */
		if (message.command.oneofKind === 'splitCoins')
			SplitCoins.internalBinaryWrite(
				message.command.splitCoins,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.MergeCoins merge_coins = 4; */
		if (message.command.oneofKind === 'mergeCoins')
			MergeCoins.internalBinaryWrite(
				message.command.mergeCoins,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.Publish publish = 5; */
		if (message.command.oneofKind === 'publish')
			Publish.internalBinaryWrite(
				message.command.publish,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.MakeMoveVector make_move_vector = 6; */
		if (message.command.oneofKind === 'makeMoveVector')
			MakeMoveVector.internalBinaryWrite(
				message.command.makeMoveVector,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.Upgrade upgrade = 7; */
		if (message.command.oneofKind === 'upgrade')
			Upgrade.internalBinaryWrite(
				message.command.upgrade,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Command
 */
export const Command = new Command$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MoveCall$Type extends MessageType<MoveCall> {
	constructor() {
		super('sui.rpc.v2beta2.MoveCall', [
			{ no: 1, name: 'package', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'module', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'function', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 4,
				name: 'type_arguments',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 5,
				name: 'arguments',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Argument,
			},
		]);
	}
	create(value?: PartialMessage<MoveCall>): MoveCall {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.typeArguments = [];
		message.arguments = [];
		if (value !== undefined) reflectionMergePartial<MoveCall>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MoveCall,
	): MoveCall {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package */ 1:
					message.package = reader.string();
					break;
				case /* optional string module */ 2:
					message.module = reader.string();
					break;
				case /* optional string function */ 3:
					message.function = reader.string();
					break;
				case /* repeated string type_arguments */ 4:
					message.typeArguments.push(reader.string());
					break;
				case /* repeated sui.rpc.v2beta2.Argument arguments */ 5:
					message.arguments.push(Argument.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MoveCall,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package = 1; */
		if (message.package !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.package);
		/* optional string module = 2; */
		if (message.module !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.module);
		/* optional string function = 3; */
		if (message.function !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.function);
		/* repeated string type_arguments = 4; */
		for (let i = 0; i < message.typeArguments.length; i++)
			writer.tag(4, WireType.LengthDelimited).string(message.typeArguments[i]);
		/* repeated sui.rpc.v2beta2.Argument arguments = 5; */
		for (let i = 0; i < message.arguments.length; i++)
			Argument.internalBinaryWrite(
				message.arguments[i],
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MoveCall
 */
export const MoveCall = new MoveCall$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TransferObjects$Type extends MessageType<TransferObjects> {
	constructor() {
		super('sui.rpc.v2beta2.TransferObjects', [
			{
				no: 1,
				name: 'objects',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Argument,
			},
			{ no: 2, name: 'address', kind: 'message', T: () => Argument },
		]);
	}
	create(value?: PartialMessage<TransferObjects>): TransferObjects {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.objects = [];
		if (value !== undefined) reflectionMergePartial<TransferObjects>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TransferObjects,
	): TransferObjects {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.Argument objects */ 1:
					message.objects.push(Argument.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* optional sui.rpc.v2beta2.Argument address */ 2:
					message.address = Argument.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.address,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: TransferObjects,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.Argument objects = 1; */
		for (let i = 0; i < message.objects.length; i++)
			Argument.internalBinaryWrite(
				message.objects[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.Argument address = 2; */
		if (message.address)
			Argument.internalBinaryWrite(
				message.address,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TransferObjects
 */
export const TransferObjects = new TransferObjects$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SplitCoins$Type extends MessageType<SplitCoins> {
	constructor() {
		super('sui.rpc.v2beta2.SplitCoins', [
			{ no: 1, name: 'coin', kind: 'message', T: () => Argument },
			{
				no: 2,
				name: 'amounts',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Argument,
			},
		]);
	}
	create(value?: PartialMessage<SplitCoins>): SplitCoins {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.amounts = [];
		if (value !== undefined) reflectionMergePartial<SplitCoins>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SplitCoins,
	): SplitCoins {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Argument coin */ 1:
					message.coin = Argument.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.coin,
					);
					break;
				case /* repeated sui.rpc.v2beta2.Argument amounts */ 2:
					message.amounts.push(Argument.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: SplitCoins,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Argument coin = 1; */
		if (message.coin)
			Argument.internalBinaryWrite(
				message.coin,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.Argument amounts = 2; */
		for (let i = 0; i < message.amounts.length; i++)
			Argument.internalBinaryWrite(
				message.amounts[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SplitCoins
 */
export const SplitCoins = new SplitCoins$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MergeCoins$Type extends MessageType<MergeCoins> {
	constructor() {
		super('sui.rpc.v2beta2.MergeCoins', [
			{ no: 1, name: 'coin', kind: 'message', T: () => Argument },
			{
				no: 2,
				name: 'coins_to_merge',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Argument,
			},
		]);
	}
	create(value?: PartialMessage<MergeCoins>): MergeCoins {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.coinsToMerge = [];
		if (value !== undefined) reflectionMergePartial<MergeCoins>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MergeCoins,
	): MergeCoins {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Argument coin */ 1:
					message.coin = Argument.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.coin,
					);
					break;
				case /* repeated sui.rpc.v2beta2.Argument coins_to_merge */ 2:
					message.coinsToMerge.push(Argument.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MergeCoins,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Argument coin = 1; */
		if (message.coin)
			Argument.internalBinaryWrite(
				message.coin,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.Argument coins_to_merge = 2; */
		for (let i = 0; i < message.coinsToMerge.length; i++)
			Argument.internalBinaryWrite(
				message.coinsToMerge[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MergeCoins
 */
export const MergeCoins = new MergeCoins$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Publish$Type extends MessageType<Publish> {
	constructor() {
		super('sui.rpc.v2beta2.Publish', [
			{
				no: 1,
				name: 'modules',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 2,
				name: 'dependencies',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<Publish>): Publish {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.modules = [];
		message.dependencies = [];
		if (value !== undefined) reflectionMergePartial<Publish>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Publish,
	): Publish {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated bytes modules */ 1:
					message.modules.push(reader.bytes());
					break;
				case /* repeated string dependencies */ 2:
					message.dependencies.push(reader.string());
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Publish,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated bytes modules = 1; */
		for (let i = 0; i < message.modules.length; i++)
			writer.tag(1, WireType.LengthDelimited).bytes(message.modules[i]);
		/* repeated string dependencies = 2; */
		for (let i = 0; i < message.dependencies.length; i++)
			writer.tag(2, WireType.LengthDelimited).string(message.dependencies[i]);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Publish
 */
export const Publish = new Publish$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MakeMoveVector$Type extends MessageType<MakeMoveVector> {
	constructor() {
		super('sui.rpc.v2beta2.MakeMoveVector', [
			{ no: 1, name: 'element_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'elements',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Argument,
			},
		]);
	}
	create(value?: PartialMessage<MakeMoveVector>): MakeMoveVector {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.elements = [];
		if (value !== undefined) reflectionMergePartial<MakeMoveVector>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MakeMoveVector,
	): MakeMoveVector {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string element_type */ 1:
					message.elementType = reader.string();
					break;
				case /* repeated sui.rpc.v2beta2.Argument elements */ 2:
					message.elements.push(Argument.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MakeMoveVector,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string element_type = 1; */
		if (message.elementType !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.elementType);
		/* repeated sui.rpc.v2beta2.Argument elements = 2; */
		for (let i = 0; i < message.elements.length; i++)
			Argument.internalBinaryWrite(
				message.elements[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MakeMoveVector
 */
export const MakeMoveVector = new MakeMoveVector$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Upgrade$Type extends MessageType<Upgrade> {
	constructor() {
		super('sui.rpc.v2beta2.Upgrade', [
			{
				no: 1,
				name: 'modules',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 2,
				name: 'dependencies',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
			{ no: 3, name: 'package', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'ticket', kind: 'message', T: () => Argument },
		]);
	}
	create(value?: PartialMessage<Upgrade>): Upgrade {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.modules = [];
		message.dependencies = [];
		if (value !== undefined) reflectionMergePartial<Upgrade>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Upgrade,
	): Upgrade {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated bytes modules */ 1:
					message.modules.push(reader.bytes());
					break;
				case /* repeated string dependencies */ 2:
					message.dependencies.push(reader.string());
					break;
				case /* optional string package */ 3:
					message.package = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.Argument ticket */ 4:
					message.ticket = Argument.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.ticket,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Upgrade,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated bytes modules = 1; */
		for (let i = 0; i < message.modules.length; i++)
			writer.tag(1, WireType.LengthDelimited).bytes(message.modules[i]);
		/* repeated string dependencies = 2; */
		for (let i = 0; i < message.dependencies.length; i++)
			writer.tag(2, WireType.LengthDelimited).string(message.dependencies[i]);
		/* optional string package = 3; */
		if (message.package !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.package);
		/* optional sui.rpc.v2beta2.Argument ticket = 4; */
		if (message.ticket)
			Argument.internalBinaryWrite(
				message.ticket,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Upgrade
 */
export const Upgrade = new Upgrade$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RandomnessStateUpdate$Type extends MessageType<RandomnessStateUpdate> {
	constructor() {
		super('sui.rpc.v2beta2.RandomnessStateUpdate', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'randomness_round',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'random_bytes', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{
				no: 4,
				name: 'randomness_object_initial_shared_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<RandomnessStateUpdate>): RandomnessStateUpdate {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<RandomnessStateUpdate>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: RandomnessStateUpdate,
	): RandomnessStateUpdate {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 randomness_round */ 2:
					message.randomnessRound = reader.uint64().toBigInt();
					break;
				case /* optional bytes random_bytes */ 3:
					message.randomBytes = reader.bytes();
					break;
				case /* optional uint64 randomness_object_initial_shared_version */ 4:
					message.randomnessObjectInitialSharedVersion = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: RandomnessStateUpdate,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional uint64 randomness_round = 2; */
		if (message.randomnessRound !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.randomnessRound);
		/* optional bytes random_bytes = 3; */
		if (message.randomBytes !== undefined)
			writer.tag(3, WireType.LengthDelimited).bytes(message.randomBytes);
		/* optional uint64 randomness_object_initial_shared_version = 4; */
		if (message.randomnessObjectInitialSharedVersion !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.randomnessObjectInitialSharedVersion);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.RandomnessStateUpdate
 */
export const RandomnessStateUpdate = new RandomnessStateUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChangeEpoch$Type extends MessageType<ChangeEpoch> {
	constructor() {
		super('sui.rpc.v2beta2.ChangeEpoch', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'protocol_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'storage_charge',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'computation_charge',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: 'storage_rebate',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 6,
				name: 'non_refundable_storage_fee',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 7, name: 'epoch_start_timestamp', kind: 'message', T: () => Timestamp },
			{
				no: 8,
				name: 'system_packages',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => SystemPackage,
			},
		]);
	}
	create(value?: PartialMessage<ChangeEpoch>): ChangeEpoch {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.systemPackages = [];
		if (value !== undefined) reflectionMergePartial<ChangeEpoch>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ChangeEpoch,
	): ChangeEpoch {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 protocol_version */ 2:
					message.protocolVersion = reader.uint64().toBigInt();
					break;
				case /* optional uint64 storage_charge */ 3:
					message.storageCharge = reader.uint64().toBigInt();
					break;
				case /* optional uint64 computation_charge */ 4:
					message.computationCharge = reader.uint64().toBigInt();
					break;
				case /* optional uint64 storage_rebate */ 5:
					message.storageRebate = reader.uint64().toBigInt();
					break;
				case /* optional uint64 non_refundable_storage_fee */ 6:
					message.nonRefundableStorageFee = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.Timestamp epoch_start_timestamp */ 7:
					message.epochStartTimestamp = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.epochStartTimestamp,
					);
					break;
				case /* repeated sui.rpc.v2beta2.SystemPackage system_packages */ 8:
					message.systemPackages.push(
						SystemPackage.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ChangeEpoch,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional uint64 protocol_version = 2; */
		if (message.protocolVersion !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.protocolVersion);
		/* optional uint64 storage_charge = 3; */
		if (message.storageCharge !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.storageCharge);
		/* optional uint64 computation_charge = 4; */
		if (message.computationCharge !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.computationCharge);
		/* optional uint64 storage_rebate = 5; */
		if (message.storageRebate !== undefined)
			writer.tag(5, WireType.Varint).uint64(message.storageRebate);
		/* optional uint64 non_refundable_storage_fee = 6; */
		if (message.nonRefundableStorageFee !== undefined)
			writer.tag(6, WireType.Varint).uint64(message.nonRefundableStorageFee);
		/* optional google.protobuf.Timestamp epoch_start_timestamp = 7; */
		if (message.epochStartTimestamp)
			Timestamp.internalBinaryWrite(
				message.epochStartTimestamp,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.SystemPackage system_packages = 8; */
		for (let i = 0; i < message.systemPackages.length; i++)
			SystemPackage.internalBinaryWrite(
				message.systemPackages[i],
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ChangeEpoch
 */
export const ChangeEpoch = new ChangeEpoch$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SystemPackage$Type extends MessageType<SystemPackage> {
	constructor() {
		super('sui.rpc.v2beta2.SystemPackage', [
			{
				no: 1,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'modules',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 3,
				name: 'dependencies',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<SystemPackage>): SystemPackage {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.modules = [];
		message.dependencies = [];
		if (value !== undefined) reflectionMergePartial<SystemPackage>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SystemPackage,
	): SystemPackage {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 version */ 1:
					message.version = reader.uint64().toBigInt();
					break;
				case /* repeated bytes modules */ 2:
					message.modules.push(reader.bytes());
					break;
				case /* repeated string dependencies */ 3:
					message.dependencies.push(reader.string());
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: SystemPackage,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 version = 1; */
		if (message.version !== undefined) writer.tag(1, WireType.Varint).uint64(message.version);
		/* repeated bytes modules = 2; */
		for (let i = 0; i < message.modules.length; i++)
			writer.tag(2, WireType.LengthDelimited).bytes(message.modules[i]);
		/* repeated string dependencies = 3; */
		for (let i = 0; i < message.dependencies.length; i++)
			writer.tag(3, WireType.LengthDelimited).string(message.dependencies[i]);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SystemPackage
 */
export const SystemPackage = new SystemPackage$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GenesisTransaction$Type extends MessageType<GenesisTransaction> {
	constructor() {
		super('sui.rpc.v2beta2.GenesisTransaction', [
			{
				no: 1,
				name: 'objects',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Object,
			},
		]);
	}
	create(value?: PartialMessage<GenesisTransaction>): GenesisTransaction {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.objects = [];
		if (value !== undefined) reflectionMergePartial<GenesisTransaction>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GenesisTransaction,
	): GenesisTransaction {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.Object objects */ 1:
					message.objects.push(Object.internalBinaryRead(reader, reader.uint32(), options));
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: GenesisTransaction,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.Object objects = 1; */
		for (let i = 0; i < message.objects.length; i++)
			Object.internalBinaryWrite(
				message.objects[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GenesisTransaction
 */
export const GenesisTransaction = new GenesisTransaction$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ConsensusCommitPrologue$Type extends MessageType<ConsensusCommitPrologue> {
	constructor() {
		super('sui.rpc.v2beta2.ConsensusCommitPrologue', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'round',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'commit_timestamp', kind: 'message', T: () => Timestamp },
			{
				no: 4,
				name: 'consensus_commit_digest',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 5,
				name: 'sub_dag_index',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 6,
				name: 'consensus_determined_version_assignments',
				kind: 'message',
				T: () => ConsensusDeterminedVersionAssignments,
			},
			{
				no: 7,
				name: 'additional_state_digest',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<ConsensusCommitPrologue>): ConsensusCommitPrologue {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ConsensusCommitPrologue>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ConsensusCommitPrologue,
	): ConsensusCommitPrologue {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 round */ 2:
					message.round = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.Timestamp commit_timestamp */ 3:
					message.commitTimestamp = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.commitTimestamp,
					);
					break;
				case /* optional string consensus_commit_digest */ 4:
					message.consensusCommitDigest = reader.string();
					break;
				case /* optional uint64 sub_dag_index */ 5:
					message.subDagIndex = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.ConsensusDeterminedVersionAssignments consensus_determined_version_assignments */ 6:
					message.consensusDeterminedVersionAssignments =
						ConsensusDeterminedVersionAssignments.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							message.consensusDeterminedVersionAssignments,
						);
					break;
				case /* optional string additional_state_digest */ 7:
					message.additionalStateDigest = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ConsensusCommitPrologue,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional uint64 round = 2; */
		if (message.round !== undefined) writer.tag(2, WireType.Varint).uint64(message.round);
		/* optional google.protobuf.Timestamp commit_timestamp = 3; */
		if (message.commitTimestamp)
			Timestamp.internalBinaryWrite(
				message.commitTimestamp,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string consensus_commit_digest = 4; */
		if (message.consensusCommitDigest !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.consensusCommitDigest);
		/* optional uint64 sub_dag_index = 5; */
		if (message.subDagIndex !== undefined)
			writer.tag(5, WireType.Varint).uint64(message.subDagIndex);
		/* optional sui.rpc.v2beta2.ConsensusDeterminedVersionAssignments consensus_determined_version_assignments = 6; */
		if (message.consensusDeterminedVersionAssignments)
			ConsensusDeterminedVersionAssignments.internalBinaryWrite(
				message.consensusDeterminedVersionAssignments,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string additional_state_digest = 7; */
		if (message.additionalStateDigest !== undefined)
			writer.tag(7, WireType.LengthDelimited).string(message.additionalStateDigest);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ConsensusCommitPrologue
 */
export const ConsensusCommitPrologue = new ConsensusCommitPrologue$Type();
// @generated message type with reflection information, may provide speed optimized methods
class VersionAssignment$Type extends MessageType<VersionAssignment> {
	constructor() {
		super('sui.rpc.v2beta2.VersionAssignment', [
			{ no: 1, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'start_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<VersionAssignment>): VersionAssignment {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<VersionAssignment>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: VersionAssignment,
	): VersionAssignment {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string object_id */ 1:
					message.objectId = reader.string();
					break;
				case /* optional uint64 start_version */ 2:
					message.startVersion = reader.uint64().toBigInt();
					break;
				case /* optional uint64 version */ 3:
					message.version = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: VersionAssignment,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string object_id = 1; */
		if (message.objectId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 start_version = 2; */
		if (message.startVersion !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.startVersion);
		/* optional uint64 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).uint64(message.version);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.VersionAssignment
 */
export const VersionAssignment = new VersionAssignment$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CanceledTransaction$Type extends MessageType<CanceledTransaction> {
	constructor() {
		super('sui.rpc.v2beta2.CanceledTransaction', [
			{ no: 1, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'version_assignments',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => VersionAssignment,
			},
		]);
	}
	create(value?: PartialMessage<CanceledTransaction>): CanceledTransaction {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.versionAssignments = [];
		if (value !== undefined) reflectionMergePartial<CanceledTransaction>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CanceledTransaction,
	): CanceledTransaction {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string digest */ 1:
					message.digest = reader.string();
					break;
				case /* repeated sui.rpc.v2beta2.VersionAssignment version_assignments */ 2:
					message.versionAssignments.push(
						VersionAssignment.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CanceledTransaction,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string digest = 1; */
		if (message.digest !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.digest);
		/* repeated sui.rpc.v2beta2.VersionAssignment version_assignments = 2; */
		for (let i = 0; i < message.versionAssignments.length; i++)
			VersionAssignment.internalBinaryWrite(
				message.versionAssignments[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CanceledTransaction
 */
export const CanceledTransaction = new CanceledTransaction$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ConsensusDeterminedVersionAssignments$Type extends MessageType<ConsensusDeterminedVersionAssignments> {
	constructor() {
		super('sui.rpc.v2beta2.ConsensusDeterminedVersionAssignments', [
			{ no: 1, name: 'version', kind: 'scalar', opt: true, T: 5 /*ScalarType.INT32*/ },
			{
				no: 3,
				name: 'canceled_transactions',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CanceledTransaction,
			},
		]);
	}
	create(
		value?: PartialMessage<ConsensusDeterminedVersionAssignments>,
	): ConsensusDeterminedVersionAssignments {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.canceledTransactions = [];
		if (value !== undefined)
			reflectionMergePartial<ConsensusDeterminedVersionAssignments>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ConsensusDeterminedVersionAssignments,
	): ConsensusDeterminedVersionAssignments {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional int32 version */ 1:
					message.version = reader.int32();
					break;
				case /* repeated sui.rpc.v2beta2.CanceledTransaction canceled_transactions */ 3:
					message.canceledTransactions.push(
						CanceledTransaction.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ConsensusDeterminedVersionAssignments,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional int32 version = 1; */
		if (message.version !== undefined) writer.tag(1, WireType.Varint).int32(message.version);
		/* repeated sui.rpc.v2beta2.CanceledTransaction canceled_transactions = 3; */
		for (let i = 0; i < message.canceledTransactions.length; i++)
			CanceledTransaction.internalBinaryWrite(
				message.canceledTransactions[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ConsensusDeterminedVersionAssignments
 */
export const ConsensusDeterminedVersionAssignments =
	new ConsensusDeterminedVersionAssignments$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AuthenticatorStateUpdate$Type extends MessageType<AuthenticatorStateUpdate> {
	constructor() {
		super('sui.rpc.v2beta2.AuthenticatorStateUpdate', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'round',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'new_active_jwks',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ActiveJwk,
			},
			{
				no: 4,
				name: 'authenticator_object_initial_shared_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<AuthenticatorStateUpdate>): AuthenticatorStateUpdate {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.newActiveJwks = [];
		if (value !== undefined) reflectionMergePartial<AuthenticatorStateUpdate>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: AuthenticatorStateUpdate,
	): AuthenticatorStateUpdate {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 round */ 2:
					message.round = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta2.ActiveJwk new_active_jwks */ 3:
					message.newActiveJwks.push(
						ActiveJwk.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional uint64 authenticator_object_initial_shared_version */ 4:
					message.authenticatorObjectInitialSharedVersion = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: AuthenticatorStateUpdate,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional uint64 round = 2; */
		if (message.round !== undefined) writer.tag(2, WireType.Varint).uint64(message.round);
		/* repeated sui.rpc.v2beta2.ActiveJwk new_active_jwks = 3; */
		for (let i = 0; i < message.newActiveJwks.length; i++)
			ActiveJwk.internalBinaryWrite(
				message.newActiveJwks[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 authenticator_object_initial_shared_version = 4; */
		if (message.authenticatorObjectInitialSharedVersion !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.authenticatorObjectInitialSharedVersion);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.AuthenticatorStateUpdate
 */
export const AuthenticatorStateUpdate = new AuthenticatorStateUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ActiveJwk$Type extends MessageType<ActiveJwk> {
	constructor() {
		super('sui.rpc.v2beta2.ActiveJwk', [
			{ no: 1, name: 'id', kind: 'message', T: () => JwkId },
			{ no: 2, name: 'jwk', kind: 'message', T: () => Jwk },
			{
				no: 3,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<ActiveJwk>): ActiveJwk {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ActiveJwk>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ActiveJwk,
	): ActiveJwk {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.JwkId id */ 1:
					message.id = JwkId.internalBinaryRead(reader, reader.uint32(), options, message.id);
					break;
				case /* optional sui.rpc.v2beta2.Jwk jwk */ 2:
					message.jwk = Jwk.internalBinaryRead(reader, reader.uint32(), options, message.jwk);
					break;
				case /* optional uint64 epoch */ 3:
					message.epoch = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ActiveJwk,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.JwkId id = 1; */
		if (message.id)
			JwkId.internalBinaryWrite(
				message.id,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.Jwk jwk = 2; */
		if (message.jwk)
			Jwk.internalBinaryWrite(
				message.jwk,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 epoch = 3; */
		if (message.epoch !== undefined) writer.tag(3, WireType.Varint).uint64(message.epoch);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ActiveJwk
 */
export const ActiveJwk = new ActiveJwk$Type();
// @generated message type with reflection information, may provide speed optimized methods
class JwkId$Type extends MessageType<JwkId> {
	constructor() {
		super('sui.rpc.v2beta2.JwkId', [
			{ no: 1, name: 'iss', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'kid', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<JwkId>): JwkId {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<JwkId>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: JwkId,
	): JwkId {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string iss */ 1:
					message.iss = reader.string();
					break;
				case /* optional string kid */ 2:
					message.kid = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: JwkId,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string iss = 1; */
		if (message.iss !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.iss);
		/* optional string kid = 2; */
		if (message.kid !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.kid);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.JwkId
 */
export const JwkId = new JwkId$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Jwk$Type extends MessageType<Jwk> {
	constructor() {
		super('sui.rpc.v2beta2.Jwk', [
			{ no: 1, name: 'kty', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'e', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'n', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'alg', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<Jwk>): Jwk {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Jwk>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Jwk,
	): Jwk {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string kty */ 1:
					message.kty = reader.string();
					break;
				case /* optional string e */ 2:
					message.e = reader.string();
					break;
				case /* optional string n */ 3:
					message.n = reader.string();
					break;
				case /* optional string alg */ 4:
					message.alg = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Jwk,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string kty = 1; */
		if (message.kty !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.kty);
		/* optional string e = 2; */
		if (message.e !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.e);
		/* optional string n = 3; */
		if (message.n !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.n);
		/* optional string alg = 4; */
		if (message.alg !== undefined) writer.tag(4, WireType.LengthDelimited).string(message.alg);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Jwk
 */
export const Jwk = new Jwk$Type();
// @generated message type with reflection information, may provide speed optimized methods
class EndOfEpochTransaction$Type extends MessageType<EndOfEpochTransaction> {
	constructor() {
		super('sui.rpc.v2beta2.EndOfEpochTransaction', [
			{
				no: 1,
				name: 'transactions',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => EndOfEpochTransactionKind,
			},
		]);
	}
	create(value?: PartialMessage<EndOfEpochTransaction>): EndOfEpochTransaction {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.transactions = [];
		if (value !== undefined) reflectionMergePartial<EndOfEpochTransaction>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: EndOfEpochTransaction,
	): EndOfEpochTransaction {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.EndOfEpochTransactionKind transactions */ 1:
					message.transactions.push(
						EndOfEpochTransactionKind.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: EndOfEpochTransaction,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.EndOfEpochTransactionKind transactions = 1; */
		for (let i = 0; i < message.transactions.length; i++)
			EndOfEpochTransactionKind.internalBinaryWrite(
				message.transactions[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.EndOfEpochTransaction
 */
export const EndOfEpochTransaction = new EndOfEpochTransaction$Type();
// @generated message type with reflection information, may provide speed optimized methods
class EndOfEpochTransactionKind$Type extends MessageType<EndOfEpochTransactionKind> {
	constructor() {
		super('sui.rpc.v2beta2.EndOfEpochTransactionKind', [
			{ no: 2, name: 'change_epoch', kind: 'message', oneof: 'kind', T: () => ChangeEpoch },
			{
				no: 3,
				name: 'authenticator_state_expire',
				kind: 'message',
				oneof: 'kind',
				T: () => AuthenticatorStateExpire,
			},
			{
				no: 4,
				name: 'execution_time_observations',
				kind: 'message',
				oneof: 'kind',
				T: () => ExecutionTimeObservations,
			},
			{
				no: 200,
				name: 'authenticator_state_create',
				kind: 'message',
				oneof: 'kind',
				T: () => Empty,
			},
			{ no: 201, name: 'randomness_state_create', kind: 'message', oneof: 'kind', T: () => Empty },
			{ no: 202, name: 'deny_list_state_create', kind: 'message', oneof: 'kind', T: () => Empty },
			{
				no: 203,
				name: 'bridge_state_create',
				kind: 'scalar',
				oneof: 'kind',
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 204,
				name: 'bridge_committee_init',
				kind: 'scalar',
				oneof: 'kind',
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 205, name: 'accumulator_root_create', kind: 'message', oneof: 'kind', T: () => Empty },
			{ no: 206, name: 'coin_registry_create', kind: 'message', oneof: 'kind', T: () => Empty },
		]);
	}
	create(value?: PartialMessage<EndOfEpochTransactionKind>): EndOfEpochTransactionKind {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.kind = { oneofKind: undefined };
		if (value !== undefined)
			reflectionMergePartial<EndOfEpochTransactionKind>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: EndOfEpochTransactionKind,
	): EndOfEpochTransactionKind {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* sui.rpc.v2beta2.ChangeEpoch change_epoch */ 2:
					message.kind = {
						oneofKind: 'changeEpoch',
						changeEpoch: ChangeEpoch.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).changeEpoch,
						),
					};
					break;
				case /* sui.rpc.v2beta2.AuthenticatorStateExpire authenticator_state_expire */ 3:
					message.kind = {
						oneofKind: 'authenticatorStateExpire',
						authenticatorStateExpire: AuthenticatorStateExpire.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).authenticatorStateExpire,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ExecutionTimeObservations execution_time_observations */ 4:
					message.kind = {
						oneofKind: 'executionTimeObservations',
						executionTimeObservations: ExecutionTimeObservations.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).executionTimeObservations,
						),
					};
					break;
				case /* google.protobuf.Empty authenticator_state_create */ 200:
					message.kind = {
						oneofKind: 'authenticatorStateCreate',
						authenticatorStateCreate: Empty.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).authenticatorStateCreate,
						),
					};
					break;
				case /* google.protobuf.Empty randomness_state_create */ 201:
					message.kind = {
						oneofKind: 'randomnessStateCreate',
						randomnessStateCreate: Empty.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).randomnessStateCreate,
						),
					};
					break;
				case /* google.protobuf.Empty deny_list_state_create */ 202:
					message.kind = {
						oneofKind: 'denyListStateCreate',
						denyListStateCreate: Empty.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).denyListStateCreate,
						),
					};
					break;
				case /* string bridge_state_create */ 203:
					message.kind = {
						oneofKind: 'bridgeStateCreate',
						bridgeStateCreate: reader.string(),
					};
					break;
				case /* uint64 bridge_committee_init */ 204:
					message.kind = {
						oneofKind: 'bridgeCommitteeInit',
						bridgeCommitteeInit: reader.uint64().toBigInt(),
					};
					break;
				case /* google.protobuf.Empty accumulator_root_create */ 205:
					message.kind = {
						oneofKind: 'accumulatorRootCreate',
						accumulatorRootCreate: Empty.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).accumulatorRootCreate,
						),
					};
					break;
				case /* google.protobuf.Empty coin_registry_create */ 206:
					message.kind = {
						oneofKind: 'coinRegistryCreate',
						coinRegistryCreate: Empty.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).coinRegistryCreate,
						),
					};
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: EndOfEpochTransactionKind,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* sui.rpc.v2beta2.ChangeEpoch change_epoch = 2; */
		if (message.kind.oneofKind === 'changeEpoch')
			ChangeEpoch.internalBinaryWrite(
				message.kind.changeEpoch,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.AuthenticatorStateExpire authenticator_state_expire = 3; */
		if (message.kind.oneofKind === 'authenticatorStateExpire')
			AuthenticatorStateExpire.internalBinaryWrite(
				message.kind.authenticatorStateExpire,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ExecutionTimeObservations execution_time_observations = 4; */
		if (message.kind.oneofKind === 'executionTimeObservations')
			ExecutionTimeObservations.internalBinaryWrite(
				message.kind.executionTimeObservations,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* google.protobuf.Empty authenticator_state_create = 200; */
		if (message.kind.oneofKind === 'authenticatorStateCreate')
			Empty.internalBinaryWrite(
				message.kind.authenticatorStateCreate,
				writer.tag(200, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* google.protobuf.Empty randomness_state_create = 201; */
		if (message.kind.oneofKind === 'randomnessStateCreate')
			Empty.internalBinaryWrite(
				message.kind.randomnessStateCreate,
				writer.tag(201, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* google.protobuf.Empty deny_list_state_create = 202; */
		if (message.kind.oneofKind === 'denyListStateCreate')
			Empty.internalBinaryWrite(
				message.kind.denyListStateCreate,
				writer.tag(202, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* string bridge_state_create = 203; */
		if (message.kind.oneofKind === 'bridgeStateCreate')
			writer.tag(203, WireType.LengthDelimited).string(message.kind.bridgeStateCreate);
		/* uint64 bridge_committee_init = 204; */
		if (message.kind.oneofKind === 'bridgeCommitteeInit')
			writer.tag(204, WireType.Varint).uint64(message.kind.bridgeCommitteeInit);
		/* google.protobuf.Empty accumulator_root_create = 205; */
		if (message.kind.oneofKind === 'accumulatorRootCreate')
			Empty.internalBinaryWrite(
				message.kind.accumulatorRootCreate,
				writer.tag(205, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* google.protobuf.Empty coin_registry_create = 206; */
		if (message.kind.oneofKind === 'coinRegistryCreate')
			Empty.internalBinaryWrite(
				message.kind.coinRegistryCreate,
				writer.tag(206, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.EndOfEpochTransactionKind
 */
export const EndOfEpochTransactionKind = new EndOfEpochTransactionKind$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AuthenticatorStateExpire$Type extends MessageType<AuthenticatorStateExpire> {
	constructor() {
		super('sui.rpc.v2beta2.AuthenticatorStateExpire', [
			{
				no: 1,
				name: 'min_epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'authenticator_object_initial_shared_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<AuthenticatorStateExpire>): AuthenticatorStateExpire {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<AuthenticatorStateExpire>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: AuthenticatorStateExpire,
	): AuthenticatorStateExpire {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 min_epoch */ 1:
					message.minEpoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 authenticator_object_initial_shared_version */ 2:
					message.authenticatorObjectInitialSharedVersion = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: AuthenticatorStateExpire,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 min_epoch = 1; */
		if (message.minEpoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.minEpoch);
		/* optional uint64 authenticator_object_initial_shared_version = 2; */
		if (message.authenticatorObjectInitialSharedVersion !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.authenticatorObjectInitialSharedVersion);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.AuthenticatorStateExpire
 */
export const AuthenticatorStateExpire = new AuthenticatorStateExpire$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ExecutionTimeObservations$Type extends MessageType<ExecutionTimeObservations> {
	constructor() {
		super('sui.rpc.v2beta2.ExecutionTimeObservations', [
			{ no: 1, name: 'version', kind: 'scalar', opt: true, T: 5 /*ScalarType.INT32*/ },
			{
				no: 2,
				name: 'observations',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ExecutionTimeObservation,
			},
		]);
	}
	create(value?: PartialMessage<ExecutionTimeObservations>): ExecutionTimeObservations {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.observations = [];
		if (value !== undefined)
			reflectionMergePartial<ExecutionTimeObservations>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecutionTimeObservations,
	): ExecutionTimeObservations {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional int32 version */ 1:
					message.version = reader.int32();
					break;
				case /* repeated sui.rpc.v2beta2.ExecutionTimeObservation observations */ 2:
					message.observations.push(
						ExecutionTimeObservation.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ExecutionTimeObservations,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional int32 version = 1; */
		if (message.version !== undefined) writer.tag(1, WireType.Varint).int32(message.version);
		/* repeated sui.rpc.v2beta2.ExecutionTimeObservation observations = 2; */
		for (let i = 0; i < message.observations.length; i++)
			ExecutionTimeObservation.internalBinaryWrite(
				message.observations[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ExecutionTimeObservations
 */
export const ExecutionTimeObservations = new ExecutionTimeObservations$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ExecutionTimeObservation$Type extends MessageType<ExecutionTimeObservation> {
	constructor() {
		super('sui.rpc.v2beta2.ExecutionTimeObservation', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta2.ExecutionTimeObservation.ExecutionTimeObservationKind',
					ExecutionTimeObservation_ExecutionTimeObservationKind,
				],
			},
			{ no: 2, name: 'move_entry_point', kind: 'message', T: () => MoveCall },
			{
				no: 3,
				name: 'validator_observations',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ValidatorExecutionTimeObservation,
			},
		]);
	}
	create(value?: PartialMessage<ExecutionTimeObservation>): ExecutionTimeObservation {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.validatorObservations = [];
		if (value !== undefined) reflectionMergePartial<ExecutionTimeObservation>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecutionTimeObservation,
	): ExecutionTimeObservation {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.ExecutionTimeObservation.ExecutionTimeObservationKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional sui.rpc.v2beta2.MoveCall move_entry_point */ 2:
					message.moveEntryPoint = MoveCall.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.moveEntryPoint,
					);
					break;
				case /* repeated sui.rpc.v2beta2.ValidatorExecutionTimeObservation validator_observations */ 3:
					message.validatorObservations.push(
						ValidatorExecutionTimeObservation.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ExecutionTimeObservation,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.ExecutionTimeObservation.ExecutionTimeObservationKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional sui.rpc.v2beta2.MoveCall move_entry_point = 2; */
		if (message.moveEntryPoint)
			MoveCall.internalBinaryWrite(
				message.moveEntryPoint,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.ValidatorExecutionTimeObservation validator_observations = 3; */
		for (let i = 0; i < message.validatorObservations.length; i++)
			ValidatorExecutionTimeObservation.internalBinaryWrite(
				message.validatorObservations[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ExecutionTimeObservation
 */
export const ExecutionTimeObservation = new ExecutionTimeObservation$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ValidatorExecutionTimeObservation$Type extends MessageType<ValidatorExecutionTimeObservation> {
	constructor() {
		super('sui.rpc.v2beta2.ValidatorExecutionTimeObservation', [
			{ no: 1, name: 'validator', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 2, name: 'duration', kind: 'message', T: () => Duration },
		]);
	}
	create(
		value?: PartialMessage<ValidatorExecutionTimeObservation>,
	): ValidatorExecutionTimeObservation {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<ValidatorExecutionTimeObservation>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ValidatorExecutionTimeObservation,
	): ValidatorExecutionTimeObservation {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional bytes validator */ 1:
					message.validator = reader.bytes();
					break;
				case /* optional google.protobuf.Duration duration */ 2:
					message.duration = Duration.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.duration,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ValidatorExecutionTimeObservation,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional bytes validator = 1; */
		if (message.validator !== undefined)
			writer.tag(1, WireType.LengthDelimited).bytes(message.validator);
		/* optional google.protobuf.Duration duration = 2; */
		if (message.duration)
			Duration.internalBinaryWrite(
				message.duration,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ValidatorExecutionTimeObservation
 */
export const ValidatorExecutionTimeObservation = new ValidatorExecutionTimeObservation$Type();
