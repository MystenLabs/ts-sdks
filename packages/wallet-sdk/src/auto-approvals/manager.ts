// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import type {
	AutoApprovalPolicy,
	AutoApprovalPolicySettings,
	AutoApprovalState,
} from './types/index.js';
import type { TransactionAnalysis } from '../policy/types.js';
import type {
	Experimental_SuiClientTypes,
	Experimental_CoreClient,
} from '@mysten/sui/experimental';
import type { UsedObject } from './types/analysis.js';

export interface AutoApprovalManagerOptions {
	client: Experimental_CoreClient;
	state: string | null;
	network: string;
	origin: string;
	getCoinPrices?: (coinTypes: string[]) => Promise<Record<string, string>>;
	approveObjects?: (objects: UsedObject[]) => Promise<boolean[]>;
}

export class AutoApprovalManager {
	#state: AutoApprovalState;
	#client: Experimental_CoreClient;
	#getCoinPrices: (coinTypes: string[]) => Promise<Record<string, string>>;
	#approveObjects: (objects: UsedObject[]) => Promise<boolean[]>;

	constructor(options: AutoApprovalManagerOptions) {
		this.#client = {} as Experimental_CoreClient;
		this.#getCoinPrices = async () => ({});
		this.#approveObjects = async () => [];
		this.#state = options.state
			? JSON.parse(options.state)
			: {
					version: '1.0.0',
					origin: options.origin,
					network: options.network,
					approvedAt: null,
					policy: null,
					settings: null,
					balanceChanges: {},
					createdObjects: {},
					approvedDigests: [],
					pendingDigests: [],
				};

		if (this.#state.network !== options.network) {
			throw new Error(`Network mismatch: expected ${options.network}, got ${this.#state.network}`);
		}

		if (this.#state.origin !== origin) {
			throw new Error(`Origin mismatch: expected ${origin}, got ${this.#state.origin}`);
		}
	}

	analyzeTransaction(_tx: Transaction): Promise<TransactionAnalysis> {
		void [this.#client, this.#getCoinPrices, this.#approveObjects];
		throw new Error('Not implemented');
	}

	commitTransaction(_analysis: TransactionAnalysis): void {}

	applyTransactionEffects(_effects: Experimental_SuiClientTypes.TransactionEffects): void {}

	detectChange(_newPolicy: AutoApprovalPolicy): boolean {
		throw new Error('Not implemented');
	}

	update(policy: AutoApprovalPolicy, settings: AutoApprovalPolicySettings) {
		this.reset();
		this.#state.policy = policy;
		this.#state.settings = settings;
	}

	approve() {
		if (!this.#state.policy) {
			throw new Error('No policy to approve');
		}

		if (!this.#state.settings) {
			throw new Error('Policy settings have not been set');
		}
		this.#state.approvedAt = new Date().toISOString();
	}

	reset() {
		this.#state.approvedAt = null;
		this.#state.balanceChanges = {};
		this.#state.createdObjects = {};
		this.#state.approvedDigests = [];
		this.#state.pendingDigests = [];
	}

	applySettings(settings: AutoApprovalPolicySettings) {
		this.#state.settings = settings;
	}

	export(): string {
		return JSON.stringify(this.#state);
	}
}
