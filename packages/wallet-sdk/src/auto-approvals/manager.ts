// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { parse, safeParse } from 'valibot';
import type { BaseAnalysis } from '../transaction-analyzer/base.js';
import type { CoinValueAnalysis, TransactionAnalysisIssue } from '../transaction-analyzer/index.js';
import type { AutoApprovalState } from './schemas/state.js';
import { AutoApprovalStateSchema } from './schemas/state.js';
import type { AutoApprovalSettings } from './schemas/policy.js';
import { AutoApprovalPolicySchema, AutoApprovalSettingsSchema } from './schemas/policy.js';

export interface AutoApprovalManagerOptions {
	policy: string;
	state: string | null;
	network: string;
	origin: string;
}

export interface AutoApprovalAnalysis {
	results: BaseAnalysis & {
		usdValue: CoinValueAnalysis;
		operationType: string | null;
	};
	issues: TransactionAnalysisIssue[];
}

export class AutoApprovalManager {
	#state: AutoApprovalState;

	constructor(options: AutoApprovalManagerOptions) {
		let state: AutoApprovalState | null = null;

		if (options.state) {
			const parseResult = safeParse(AutoApprovalStateSchema, JSON.parse(options.state));
			if (parseResult.success) {
				const providedPolicy = parse(AutoApprovalPolicySchema, JSON.parse(options.policy));
				const currentPolicy = parseResult.output.policy;

				if (JSON.stringify(currentPolicy) === JSON.stringify(providedPolicy)) {
					state = parseResult.output;
				}
			}
		}

		this.#state =
			state ??
			parse(AutoApprovalStateSchema, {
				schemaVersion: '1.0.0',
				origin: options.origin,
				network: options.network,
				policy: parse(AutoApprovalPolicySchema, JSON.parse(options.policy)),
				settings: null,
				createdObjects: {},
				pendingDigests: [],
			} satisfies AutoApprovalState);

		if (this.#state.network !== options.network) {
			throw new Error(`Network mismatch: expected ${options.network}, got ${this.#state.network}`);
		}

		if (this.#state.origin !== options.origin) {
			throw new Error(`Origin mismatch: expected ${options.origin}, got ${this.#state.origin}`);
		}
	}

	canAutoApprove(analysis: AutoApprovalAnalysis): boolean {
		if (!this.#state.policy || !this.#state.settings) {
			return false;
		}

		if (analysis.issues.length > 0) {
			return false;
		}

		if (new Date() > new Date(this.#state.settings.expiration)) {
			return false;
		}

		if (
			this.#state.settings.remainingTransactions !== null &&
			this.#state.settings.remainingTransactions <= 0
		) {
			return false;
		}

		if (
			!analysis.results.operationType ||
			!this.#state.settings.approvedOperations.includes(analysis.results.operationType)
		) {
			return false;
		}

		if (!analysis.results.operationType) {
			return false;
		}

		// TODO: analyze balances and budgets

		return true;
	}

	commitTransaction(analysis: AutoApprovalAnalysis): void {
		if (this.#state.settings?.remainingTransactions !== null && this.#state.settings) {
			this.#state.settings.remainingTransactions = Math.max(
				0,
				this.#state.settings.remainingTransactions - 1,
			);
		}

		for (const outflow of analysis.results.coinFlows) {
			const currentBudget = BigInt(this.#state.settings?.coinBudgets[outflow.coinType] ?? '0');
			const newBalance = currentBudget - outflow.amount;

			if (this.#state.settings) {
				this.#state.settings.coinBudgets[outflow.coinType] = newBalance.toString();
			}
		}

		// TODO: track USD budget

		this.#state.pendingDigests.push(analysis.results.digest);
	}

	revertTransaction(analysis: AutoApprovalAnalysis): void {
		this.#removePendingDigest(analysis.results.digest);

		if (this.#state.settings?.remainingTransactions !== null && this.#state.settings) {
			this.#state.settings.remainingTransactions += 1;
		}

		this.#revertCoinFlows(analysis.results);
	}

	#revertCoinFlows(analysis: BaseAnalysis): void {
		for (const outflow of analysis.coinFlows) {
			const currentBudget = BigInt(this.#state.settings?.coinBudgets[outflow.coinType] ?? '0');
			const newBalance = currentBudget + outflow.amount;

			if (this.#state.settings) {
				this.#state.settings.coinBudgets[outflow.coinType] = newBalance.toString();
			}
		}

		// TODO: revert USD budget
	}

	#removePendingDigest(digest: string): void {
		const pendingIndex = this.#state.pendingDigests.indexOf(digest);
		if (pendingIndex >= 0) {
			this.#state.pendingDigests.splice(pendingIndex, 1);
		} else {
			throw new Error(`Transaction with digest ${digest} not found in pending digests`);
		}
	}

	applyTransactionEffects(
		analysis: AutoApprovalAnalysis,
		result: Experimental_SuiClientTypes.TransactionResponse,
	): void {
		this.#removePendingDigest(result.digest);

		for (const changed of result.effects.changedObjects) {
			if (changed.idOperation === 'Created' && changed.outputState === 'ObjectWrite') {
				this.#state.createdObjects[changed.id] = {
					objectId: changed.id,
					version: changed.outputVersion!,
					digest: changed.outputDigest!,
					objectType: analysis.results.objectsById.get(changed.id)?.type || 'unknown',
				};
			}
		}

		// Revert coin flows and use real balance changes instead
		this.#revertCoinFlows(analysis.results);
		for (const change of result.balanceChanges) {
			const currentBudget = BigInt(this.#state.settings?.coinBudgets[change.coinType] ?? '0');
			const newBalance = currentBudget + BigInt(change.amount);
			if (this.#state.settings) {
				this.#state.settings.coinBudgets[change.coinType] = newBalance.toString();
			}
		}

		// TODO: track USD budget
	}

	reset() {
		this.#state.settings = null;
		this.#state.createdObjects = {};
		this.#state.pendingDigests = [];
	}

	export(): string {
		return JSON.stringify(parse(AutoApprovalStateSchema, this.#state));
	}

	getState(): AutoApprovalState {
		return parse(AutoApprovalStateSchema, this.#state);
	}

	getSettings(): AutoApprovalSettings | null {
		return this.#state.settings;
	}

	updateSettings(settings: AutoApprovalSettings): void {
		const validatedSettings = parse(AutoApprovalSettingsSchema, settings);
		this.#state.settings = validatedSettings;
	}
}
