// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import type {
	AutoApprovalPolicy,
	AutoApprovalPolicySettings,
	AutoApprovalState,
} from './types/index.js';
import type { TransactionAnalysis } from './types/analysis.js';
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { parse, safeParse } from 'valibot';
import {
	AutoApprovalStateSchema,
	AutoApprovalPolicySchema,
	AutoApprovalPolicySettingsSchema,
} from './schemas.js';
import { AUTO_APPROVAL_INTENT } from '../intents/AutoApproval.js';

export interface AutoApprovalManagerOptions {
	state: string | null;
	network: string;
	origin: string;
}

export class AutoApprovalManager {
	#state: AutoApprovalState;

	constructor(options: AutoApprovalManagerOptions) {
		// Initialize or parse existing state with validation
		if (options.state) {
			const parseResult = safeParse(AutoApprovalStateSchema, JSON.parse(options.state));
			if (!parseResult.success) {
				throw new Error(
					`Invalid state: ${parseResult.issues.map((i: any) => i.message).join(', ')}`,
				);
			}
			this.#state = parseResult.output;
		} else {
			this.#state = parse(AutoApprovalStateSchema, {
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
			});
		}

		if (this.#state.network !== options.network) {
			throw new Error(`Network mismatch: expected ${options.network}, got ${this.#state.network}`);
		}

		if (this.#state.origin !== options.origin) {
			throw new Error(`Origin mismatch: expected ${options.origin}, got ${this.#state.origin}`);
		}
	}

	/**
	 * Check if a transaction analysis can be auto-approved based on policy settings
	 * This is a fast synchronous operation
	 *
	 * @param analysis - The transaction analysis result
	 * @param policy - Policy to check against (defaults to current state)
	 * @param settings - Settings to check against (defaults to current state)
	 * @param ruleSetId - Specific ruleset to check (extracted from analysis if not provided)
	 */
	canAutoApprove(
		analysis: TransactionAnalysis,
		policy?: AutoApprovalPolicy | null,
		settings?: AutoApprovalPolicySettings | null,
		ruleSetId?: string | null,
	): boolean {
		const effectivePolicy = policy ?? this.#state.policy;
		const effectiveSettings = settings ?? this.#state.settings;
		const effectiveRuleSetId = ruleSetId ?? analysis.ruleSetId;

		// Must have a policy and settings
		if (!effectivePolicy || !effectiveSettings) {
			return false;
		}

		// Must have policy enabled (approved)
		if (!this.#state.approvedAt && !settings) {
			return false;
		}

		// Must not be expired
		if (new Date() > new Date(effectiveSettings.expiration)) {
			return false;
		}

		// Must have remaining transactions
		if (
			effectiveSettings.remainingTransactions !== null &&
			effectiveSettings.remainingTransactions <= 0
		) {
			return false;
		}

		// Must have a ruleSetId and it must be approved
		if (!effectiveRuleSetId || !effectiveSettings.approvedRuleSets.includes(effectiveRuleSetId)) {
			return false;
		}

		// Transaction must match policy rules (this comes from the analysis)
		if (!analysis.autoApproved) {
			return false;
		}

		// All checks passed
		return true;
	}

	/**
	 * Extract ruleSetId from AutoApproval intent in transaction
	 */
	extractRuleSetId(tx: Transaction): string | null {
		try {
			const transactionData = tx.getData();

			const autoApprovalCommand = transactionData.commands.find(
				(command: any) =>
					command.$kind === '$Intent' && command.$Intent?.name === AUTO_APPROVAL_INTENT,
			);

			if (autoApprovalCommand) {
				const ruleSetId = autoApprovalCommand.$Intent?.data?.ruleSetId;
				return typeof ruleSetId === 'string' ? ruleSetId : null;
			}

			return null;
		} catch (error) {
			console.error('Failed to extract ruleSetId:', error);
			return null;
		}
	}

	commitTransaction(analysis: TransactionAnalysis): void {
		if (!analysis.autoApproved) {
			return;
		}

		// Update remaining transactions
		if (this.#state.settings?.remainingTransactions !== null && this.#state.settings) {
			this.#state.settings.remainingTransactions = Math.max(
				0,
				this.#state.settings.remainingTransactions - 1,
			);
		}

		// Track balance changes
		for (const outflow of analysis.coinOutflows) {
			const existing = this.#state.balanceChanges[outflow.coinType];
			const currentBalance = existing ? BigInt(existing.balanceChange) : 0n;
			const newBalance = currentBalance - BigInt(outflow.balance);

			this.#state.balanceChanges[outflow.coinType] = {
				balanceChange: newBalance.toString(),
				lastUpdated: new Date().toISOString(),
			};
		}

		// Add to pending digests
		if (analysis.digest) {
			this.#state.pendingDigests.push(analysis.digest);
		}
	}

	applyTransactionEffects(effects: Experimental_SuiClientTypes.TransactionEffects): void {
		const digest = effects.transactionDigest;

		// Move from pending to approved
		const pendingIndex = this.#state.pendingDigests.indexOf(digest);
		if (pendingIndex >= 0) {
			this.#state.pendingDigests.splice(pendingIndex, 1);
			this.#state.approvedDigests.push(digest);
		}

		// Track created objects from changed objects
		for (const changed of effects.changedObjects) {
			if (changed.idOperation === 'Created' && changed.outputState === 'ObjectWrite') {
				this.#state.createdObjects[changed.id] = {
					objectId: changed.id,
					version: changed.outputVersion!,
					digest: changed.outputDigest!,
					objectType: 'unknown', // Would need object type lookup
				};
			}
		}
	}

	detectChange(newPolicy: AutoApprovalPolicy): boolean {
		if (!this.#state.policy) {
			return true;
		}

		// Normalize both policies through validation to ensure consistent comparison
		try {
			const normalizedCurrent = parse(AutoApprovalPolicySchema, this.#state.policy);
			const normalizedNew = parse(AutoApprovalPolicySchema, newPolicy);

			const currentHash = JSON.stringify(normalizedCurrent);
			const newHash = JSON.stringify(normalizedNew);
			return currentHash !== newHash;
		} catch (error) {
			// If validation fails, assume change is needed
			return true;
		}
	}

	update(policy: AutoApprovalPolicy, settings: AutoApprovalPolicySettings) {
		// Validate policy and settings
		const validatedPolicy = parse(AutoApprovalPolicySchema, policy);
		const validatedSettings = parse(AutoApprovalPolicySettingsSchema, settings);

		this.reset();
		this.#state.policy = validatedPolicy;
		this.#state.settings = validatedSettings;
	}

	approve() {
		if (!this.#state.policy) {
			throw new Error('No policy to approve');
		}

		if (!this.#state.settings) {
			throw new Error('Policy settings have not been set');
		}
		const timestamp = new Date().toISOString();
		this.#state.approvedAt = timestamp;
	}

	reset() {
		this.#state.approvedAt = null;
		this.#state.balanceChanges = {};
		this.#state.createdObjects = {};
		this.#state.approvedDigests = [];
		this.#state.pendingDigests = [];
	}

	applySettings(settings: AutoApprovalPolicySettings) {
		const validatedSettings = parse(AutoApprovalPolicySettingsSchema, settings);
		this.#state.settings = validatedSettings;
	}

	export(): string {
		// Validate state before exporting
		const validatedState = parse(AutoApprovalStateSchema, this.#state);
		return JSON.stringify(validatedState);
	}

	serialize(): string {
		return this.export();
	}

	hasPolicy(): boolean {
		return this.#state.policy !== null;
	}

	isPolicyEnabled(): boolean {
		return this.#state.approvedAt !== null;
	}

	getCurrentSettings(): AutoApprovalPolicySettings | null {
		return this.#state.settings;
	}

	createPolicy(policy: AutoApprovalPolicy, settings: AutoApprovalPolicySettings): void {
		this.update(policy, settings);
	}

	updateSettings(settings: AutoApprovalPolicySettings): void {
		this.applySettings(settings);
	}

	clearPolicy(): void {
		this.#state.policy = null;
		this.#state.settings = null;
		this.reset();
	}
}
