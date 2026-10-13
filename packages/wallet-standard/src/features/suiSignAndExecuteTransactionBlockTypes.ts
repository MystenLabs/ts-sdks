// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The JSON-RPC transaction response types used by the deprecated
 * `sui:signAndExecuteTransactionBlock` feature, exported from this package as the `SuiJsonRpcTypes`
 * namespace. Every type here is deprecated; use `sui:signAndExecuteTransaction` instead.
 */

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface AccumulatorEvent {
	accumulatorObj: string;
	address: string;
	operation: AccumulatorOperation;
	ty: string;
	value: AccumulatorValue;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type AccumulatorOperation = 'merge' | 'split';

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type AccumulatorValue =
	| {
			integer: string;
	  }
	| {
			integerTuple: [string, string];
	  }
	| {
			eventDigest: [string, string][];
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface BalanceChange {
	/**
	 * The amount indicate the balance value changes, negative amount means spending coin value and
	 * positive means receiving coin value.
	 */
	amount: string;
	coinType: string;
	/** Owner of the balance change */
	owner: ObjectOwner;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type ConsensusDeterminedVersionAssignments =
	| {
			CancelledTransactions: [string, [string, string][]][];
	  }
	| {
			CancelledTransactionsV2: [string, [[string, string], string][]][];
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiEvent =
	| {
			/**
			 * Sequential event ID, ie (transaction seq number, event seq number). 1) Serves as a unique event ID
			 * for each fullnode 2) Also serves to sequence events for the purposes of pagination and querying. A
			 * higher id is an event seen later by that fullnode. This ID is the "cursor" for event querying.
			 */
			id: EventId;
			/** Move package where this event was emitted. */
			packageId: string;
			/** Parsed json value of the event */
			parsedJson: unknown;
			/** Sender's Sui address. */
			sender: string;
			/** UTC timestamp in milliseconds since epoch (1/1/1970) */
			timestampMs?: string | null;
			/** Move module where this event was emitted. */
			transactionModule: string;
			/** Move event type. */
			type: string;
			bcs: string;
			bcsEncoding: 'base64';
	  }
	| {
			/**
			 * Sequential event ID, ie (transaction seq number, event seq number). 1) Serves as a unique event ID
			 * for each fullnode 2) Also serves to sequence events for the purposes of pagination and querying. A
			 * higher id is an event seen later by that fullnode. This ID is the "cursor" for event querying.
			 */
			id: EventId;
			/** Move package where this event was emitted. */
			packageId: string;
			/** Parsed json value of the event */
			parsedJson: unknown;
			/** Sender's Sui address. */
			sender: string;
			/** UTC timestamp in milliseconds since epoch (1/1/1970) */
			timestampMs?: string | null;
			/** Move module where this event was emitted. */
			transactionModule: string;
			/** Move event type. */
			type: string;
			bcs: string;
			bcsEncoding: 'base58';
	  };

/**
 * Unique ID of a Sui Event, the ID is a combination of transaction digest and event seq number.
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export interface EventId {
	eventSeq: string;
	txDigest: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type ExecuteTransactionRequestType = 'WaitForEffectsCert' | 'WaitForLocalExecution';

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type ExecutionStatus = {
	status: 'success' | 'failure';
	error?: string;
};

/**
 * Summary of the charges in a transaction. Storage is charged independently of computation. There are
 * 3 parts to the storage charges: `storage_cost`: it is the charge of storage at the time the
 * transaction is executed. The cost of storage is the number of bytes of the objects being mutated
 * multiplied by a variable storage cost per byte `storage_rebate`: this is the amount a user gets back
 * when manipulating an object. The `storage_rebate` is the `storage_cost` for an object minus fees.
 * `non_refundable_storage_fee`: not all the value of the object storage cost is given back to user and
 * there is a small fraction that is kept by the system. This value tracks that charge.
 *
 * When looking at a gas cost summary the amount charged to the user is
 * `computation_cost + storage_cost - storage_rebate` and that is the amount that is deducted from the
 * gas coins. `non_refundable_storage_fee` is collected from the objects being mutated/deleted and it
 * is tracked by the system in storage funds.
 *
 * Objects deleted, including the older versions of objects mutated, have the storage field on the
 * objects added up to a pool of "potential rebate". This rebate then is reduced by the "nonrefundable
 * rate" such that:
 * `potential_rebate(storage cost of deleted/mutated objects) = storage_rebate + non_refundable_storage_fee`
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export interface GasCostSummary {
	/** Cost of computation/execution */
	computationCost: string;
	/** The fee for the rebate. The portion of the storage rebate kept by the system. */
	nonRefundableStorageFee: string;
	/** Storage cost, it's the sum of all storage cost for all objects created or mutated. */
	storageCost: string;
	/**
	 * The amount of storage cost refunded to the user for all objects deleted or mutated in the
	 * transaction.
	 */
	storageRebate: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiGasData {
	budget: string;
	owner: string;
	payment: SuiObjectRef[];
	price: string;
}

/**
 * ObjectChange are derived from the object mutations in the TransactionEffect to provide richer object
 * information.
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export type SuiObjectChange =
	/** Module published */
	| {
			digest: string;
			modules: string[];
			packageId: string;
			type: 'published';
			version: string;
	  } /** Transfer objects to new address / wrap in another object */
	| {
			digest: string;
			objectId: string;
			objectType: string;
			recipient: ObjectOwner;
			sender: string;
			type: 'transferred';
			version: string;
	  } /** Object mutated. */
	| {
			digest: string;
			objectId: string;
			objectType: string;
			owner: ObjectOwner;
			previousVersion: string;
			sender: string;
			type: 'mutated';
			version: string;
	  } /** Delete object */
	| {
			objectId: string;
			objectType: string;
			sender: string;
			type: 'deleted';
			version: string;
	  } /** Wrapped object */
	| {
			objectId: string;
			objectType: string;
			sender: string;
			type: 'wrapped';
			version: string;
	  } /** New object creation */
	| {
			digest: string;
			objectId: string;
			objectType: string;
			owner: ObjectOwner;
			sender: string;
			type: 'created';
			version: string;
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiObjectRef {
	/** Base64 string representing the object digest */
	digest: string;
	/** Hex code as string representing the object id */
	objectId: string;
	/** Object version. */
	version: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface OwnedObjectRef {
	owner: ObjectOwner;
	reference: SuiObjectRef;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type ObjectOwner =
	/** Object is exclusively owned by a single address, and is mutable. */
	| {
			AddressOwner: string;
	  } /**
	 * Object is exclusively owned by a single object, and is mutable. The object ID is converted to
	 * SuiAddress as SuiAddress is universal.
	 */
	| {
			ObjectOwner: string;
	  } /** Object is shared, can be used by any address, and is mutable. */
	| {
			Shared: {
				/** The version at which the object became shared */
				initial_shared_version: string;
			};
	  }
	| 'Immutable' /** Object is exclusively owned by a single address and sequenced via consensus. */
	| {
			ConsensusAddressOwner: {
				owner: string;
				/**
				 * The version at which the object most recently became a consensus object. This serves the same
				 * function as `initial_shared_version`, except it may change if the object's Owner type changes.
				 */
				start_version: string;
			};
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiActiveJwk {
	epoch: string;
	jwk: SuiJWK;
	jwk_id: SuiJwkId;
}

/**
 * An argument to a transaction in a programmable transaction block
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export type SuiArgument =
	| 'GasCoin' /** One of the input objects or primitive values (from `ProgrammableTransactionBlock` inputs) */
	| {
			Input: number;
	  } /** The result of another transaction (from `ProgrammableTransactionBlock` transactions) */
	| {
			Result: number;
	  } /**
	 * Like a `Result` but it accesses a nested result. Currently, the only usage of this is to access a
	 * value from a Move call with multiple return values.
	 */
	| {
			NestedResult: [number, number];
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiAuthenticatorStateExpire {
	min_epoch: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiCallArg =
	| {
			type: 'object';
			digest: string;
			objectId: string;
			objectType: 'immOrOwnedObject';
			version: string;
	  }
	| {
			type: 'object';
			initialSharedVersion: string;
			mutable: boolean;
			objectId: string;
			objectType: 'sharedObject';
	  }
	| {
			type: 'object';
			digest: string;
			objectId: string;
			objectType: 'receiving';
			version: string;
	  }
	| {
			type: 'pure';
			value: unknown;
			valueType?: string | null;
	  }
	| {
			reservation: SuiReservation;
			type: 'fundsWithdrawal';
			typeArg: SuiWithdrawalTypeArg;
			withdrawFrom: SuiWithdrawFrom;
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiChangeEpoch {
	computation_charge: string;
	epoch: string;
	epoch_start_timestamp_ms: string;
	storage_charge: string;
	storage_rebate: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiEndOfEpochTransactionKind =
	| 'AuthenticatorStateCreate'
	| 'RandomnessStateCreate'
	| 'CoinDenyListStateCreate'
	| 'StoreExecutionTimeObservations'
	| 'AccumulatorRootCreate'
	| 'CoinRegistryCreate'
	| 'DisplayRegistryCreate'
	| 'AddressAliasStateCreate'
	| 'WriteAccumulatorStorageCost'
	| {
			ChangeEpoch: SuiChangeEpoch;
	  }
	| {
			AuthenticatorStateExpire: SuiAuthenticatorStateExpire;
	  }
	| {
			BridgeStateCreate: string;
	  }
	| {
			BridgeCommitteeUpdate: string;
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiJWK {
	alg: string;
	e: string;
	kty: string;
	n: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiJwkId {
	iss: string;
	kid: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiMoveAbort {
	error_code?: string | null;
	function?: string | null;
	line?: number | null;
	module_id?: string | null;
}

/**
 * The transaction for calling a Move function, either an entry function or a public function (which
 * cannot return references).
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export interface MoveCallSuiTransaction {
	/** The arguments to the function. */
	arguments?: SuiArgument[];
	/** The function to be called. */
	function: string;
	/** The specific module in the package containing the function. */
	module: string;
	/** The package containing the module and function. */
	package: string;
	/** The type arguments to the function. */
	type_arguments?: string[];
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiReservation = {
	maxAmountU64: string;
};

/**
 * A single transaction in a programmable transaction block.
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export type SuiTransaction =
	/** A call to either an entry or a public Move function */
	| {
			MoveCall: MoveCallSuiTransaction;
	  } /**
	 * `(Vec<forall T:key+store. T>, address)` It sends n-objects to the specified address. These objects
	 * must have store (public transfer) and either the previous owner must be an address or the object
	 * must be newly created.
	 */
	| {
			TransferObjects: [SuiArgument[], SuiArgument];
	  } /**
	 * `(&mut Coin<T>, Vec<u64>)` -> `Vec<Coin<T>>` It splits off some amounts into a new coins with those
	 * amounts
	 */
	| {
			SplitCoins: [SuiArgument, SuiArgument[]];
	  } /** `(&mut Coin<T>, Vec<Coin<T>>)` It merges n-coins into the first coin */
	| {
			MergeCoins: [SuiArgument, SuiArgument[]];
	  } /**
	 * Publishes a Move package. It takes the package bytes and a list of the package's transitive
	 * dependencies to link against on-chain.
	 */
	| {
			Publish: string[];
	  } /** Upgrades a Move package */
	| {
			Upgrade: [string[], string, SuiArgument];
	  } /**
	 * `forall T: Vec<T> -> vector<T>` Given n-values of the same type, it constructs a vector. For non
	 * objects or an empty vector, the type tag must be specified.
	 */
	| {
			MakeMoveVec: [string | null, SuiArgument[]];
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiWithdrawFrom =
	'sender' | 'sponsor' | { senderAllowance: { funder: string; allowance: string } };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiWithdrawalTypeArg = {
	balance: string;
};

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiTransactionBlock {
	data: TransactionBlockData;
	txSignatures: string[];
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type TransactionBlockData = {
	gasData: SuiGasData;
	messageVersion: 'v1';
	sender: string;
	transaction: SuiTransactionBlockKind;
};

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type TransactionEffects =
	/** The response from processing a transaction or a certified transaction */
	{
		/** The abort error populated if the transaction failed with an abort code. */
		abortError?: SuiMoveAbort | null;
		accumulatorEvents?: AccumulatorEvent[];
		/** ObjectRef and owner of new objects created. */
		created?: OwnedObjectRef[];
		/** Object Refs of objects now deleted (the old refs). */
		deleted?: SuiObjectRef[];
		/** The set of transaction digests this transaction depends on. */
		dependencies?: string[];
		/**
		 * The digest of the events emitted during execution, can be None if the transaction does not emit any
		 * event.
		 */
		eventsDigest?: string | null;
		/** The epoch when this transaction was executed. */
		executedEpoch: string;
		/**
		 * The updated gas object reference. Have a dedicated field for convenient access. It's also included
		 * in mutated.
		 */
		gasObject: OwnedObjectRef;
		gasUsed: GasCostSummary;
		messageVersion: 'v1';
		/**
		 * The version that every modified (mutated or deleted) object had before it was modified by this
		 * transaction.
		 */
		modifiedAtVersions?: TransactionBlockEffectsModifiedAtVersions[];
		/** ObjectRef and owner of mutated objects, including gas object. */
		mutated?: OwnedObjectRef[];
		/**
		 * The object references of the shared objects used in this transaction. Empty if no shared objects
		 * were used.
		 */
		sharedObjects?: SuiObjectRef[];
		/** The status of the execution */
		status: ExecutionStatus;
		/** The transaction digest */
		transactionDigest: string;
		/**
		 * ObjectRef and owner of objects that are unwrapped in this transaction. Unwrapped objects are objects
		 * that were wrapped into other objects in the past, and just got extracted out.
		 */
		unwrapped?: OwnedObjectRef[];
		/** Object refs of objects previously wrapped in other objects but now deleted. */
		unwrappedThenDeleted?: SuiObjectRef[];
		/** Object refs of objects now wrapped in other objects. */
		wrapped?: SuiObjectRef[];
	};

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface TransactionBlockEffectsModifiedAtVersions {
	objectId: string;
	sequenceNumber: string;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiTransactionBlockKind =
	/** A system transaction that will update epoch information on-chain. */
	| {
			computation_charge: string;
			epoch: string;
			epoch_start_timestamp_ms: string;
			kind: 'ChangeEpoch';
			storage_charge: string;
			storage_rebate: string;
	  } /** A system transaction used for initializing the initial state of the chain. */
	| {
			kind: 'Genesis';
			objects: string[];
	  } /** A system transaction marking the start of a series of transactions scheduled as part of a checkpoint */
	| {
			commit_timestamp_ms: string;
			epoch: string;
			kind: 'ConsensusCommitPrologue';
			round: string;
	  } /** A series of transactions where the results of one transaction can be used in future transactions */
	| {
			/** Input objects or primitive values */
			inputs: SuiCallArg[];
			kind: 'ProgrammableTransaction';
			/**
			 * The transactions to be executed sequentially. A failure in any transaction will result in the
			 * failure of the entire programmable transaction block.
			 */
			transactions: SuiTransaction[];
	  } /** A transaction which updates global authenticator state */
	| {
			epoch: string;
			kind: 'AuthenticatorStateUpdate';
			new_active_jwks: SuiActiveJwk[];
			round: string;
	  } /** A transaction which updates global randomness state */
	| {
			epoch: string;
			kind: 'RandomnessStateUpdate';
			random_bytes: number[];
			randomness_round: string;
	  } /** The transaction which occurs only at the end of the epoch */
	| {
			kind: 'EndOfEpochTransaction';
			transactions: SuiEndOfEpochTransactionKind[];
	  }
	| {
			commit_timestamp_ms: string;
			consensus_commit_digest: string;
			epoch: string;
			kind: 'ConsensusCommitPrologueV2';
			round: string;
	  }
	| {
			commit_timestamp_ms: string;
			consensus_commit_digest: string;
			consensus_determined_version_assignments: ConsensusDeterminedVersionAssignments;
			epoch: string;
			kind: 'ConsensusCommitPrologueV3';
			round: string;
			sub_dag_index?: string | null;
	  }
	| {
			additional_state_digest: string;
			commit_timestamp_ms: string;
			consensus_commit_digest: string;
			consensus_determined_version_assignments: ConsensusDeterminedVersionAssignments;
			epoch: string;
			kind: 'ConsensusCommitPrologueV4';
			round: string;
			sub_dag_index?: string | null;
	  } /** A series of commands where the results of one command can be used in future commands */
	| {
			/** Input objects or primitive values */
			inputs: SuiCallArg[];
			kind: 'ProgrammableSystemTransaction';
			/**
			 * The transactions to be executed sequentially. A failure in any transaction will result in the
			 * failure of the entire programmable transaction block.
			 */
			transactions: SuiTransaction[];
	  };

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiTransactionBlockResponse {
	balanceChanges?: BalanceChange[] | null;
	/**
	 * The checkpoint number when this transaction was included and hence finalized. This is only returned
	 * in the read api, not in the transaction execution api.
	 */
	checkpoint?: string | null;
	confirmedLocalExecution?: boolean | null;
	digest: string;
	effects?: TransactionEffects | null;
	errors?: string[];
	events?: SuiEvent[] | null;
	objectChanges?: SuiObjectChange[] | null;
	rawEffects?: number[];
	/**
	 * BCS encoded [SenderSignedData] that includes input object references returns empty array if
	 * `show_raw_transaction` is false
	 */
	rawTransaction?: string;
	timestampMs?: string | null;
	/** Transaction input data */
	transaction?: SuiTransactionBlock | null;
}

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export interface SuiTransactionBlockResponseOptions {
	/** Whether to show balance_changes. Default to be False */
	showBalanceChanges?: boolean;
	/** Whether to show transaction effects. Default to be False */
	showEffects?: boolean;
	/** Whether to show transaction events. Default to be False */
	showEvents?: boolean;
	/** Whether to show transaction input data. Default to be False */
	showInput?: boolean;
	/** Whether to show object_changes. Default to be False */
	showObjectChanges?: boolean;
	/** Whether to show raw transaction effects. Default to be False */
	showRawEffects?: boolean;
	/** Whether to show bcs-encoded transaction input data */
	showRawInput?: boolean;
}
