// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { parse, safeParse } from 'valibot';
import type { AutoApprovalState } from './schemas/state.js';
import { AutoApprovalStateSchema } from './schemas/state.js';
import type { AutoApprovalSettings } from './schemas/policy.js';
import { AutoApprovalPolicySchema, AutoApprovalSettingsSchema } from './schemas/policy.js';
import { parseStructTag } from '@mysten/sui/utils';
import type { AutoApprovalResult } from './analyzer.js';

export interface AutoApprovalManagerOptions {
	policy: string;
	state: string | null;
}

export interface AutoApprovalIssue {
	message: string;
}

export interface AutoApprovalCheck {
	matchesPolicy: boolean;
	canAutoApprove: boolean;
	policyIssues: AutoApprovalIssue[];
	settingsIssues: AutoApprovalIssue[];
	analysisIssues: AutoApprovalIssue[];
}

export class AutoApprovalManager {
	#state: AutoApprovalState;

	constructor(options: AutoApprovalManagerOptions) {
		let state: AutoApprovalState | null = null;

		if (options.state) {
			const parseResult = safeParse(AutoApprovalStateSchema, JSON.parse(options.state));
			// TODO: how do we want to handle failures
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
				policy: parse(AutoApprovalPolicySchema, JSON.parse(options.policy)),
				settings: null,
				pendingDigests: [],
			} satisfies AutoApprovalState);
	}

	checkTransaction(analysis: AutoApprovalResult): AutoApprovalCheck {
		const results: AutoApprovalCheck = {
			matchesPolicy: false,
			canAutoApprove: false,
			analysisIssues: [...(analysis.issues ?? [])],
			policyIssues: [],
			settingsIssues: [],
		};

		if (results.analysisIssues.length > 0) {
			return results;
		}

		const policyIssues = this.#matchesPolicy(analysis);

		if (policyIssues.length > 0) {
			results.policyIssues = policyIssues;
			return results;
		} else {
			results.matchesPolicy = true;
		}

		const settingsIssues = this.#canAutoApprove(analysis);

		if (settingsIssues.length > 0) {
			results.settingsIssues = settingsIssues;
			return results;
		} else {
			results.canAutoApprove = true;
		}

		return results;
	}

	#matchesPolicy(analysis: AutoApprovalResult): AutoApprovalIssue[] {
		const issues: AutoApprovalIssue[] = [];

		if (analysis.issues) {
			issues.push({ message: 'Transaction analysis failed' });
			return issues;
		}

		if (!analysis.result.operationType) {
			issues.push({ message: 'Operation type not found in Transaction' });

			return issues;
		}

		const operation = this.#state.policy.operations.find(
			(op) => op.id === analysis.result.operationType,
		);

		if (!operation) {
			issues.push({ message: 'Operation not found in policy' });
			return issues;
		}

		if (!operation.permissions.anyBalance) {
			for (const flow of analysis.result.coinFlows.outflows) {
				if (!operation.permissions.balances?.find((b) => b.coinType === flow.coinType)) {
					issues.push({
						message: `Operation does not have permission to use coin type ${flow.coinType}`,
					});
				}
			}
		}

		for (const obj of analysis.result.ownedObjects) {
			if (isCoinType(obj.type)) {
				continue;
			}

			const accessLevel = analysis.result.accessLevel[obj.id];

			if (!accessLevel) {
				issues.push({ message: `Access level could not be determined for object ${obj.id}` });
			}

			const ownedObjectsPermission = operation.permissions.ownedObjects?.find(
				(p) => p.objectType === obj.type,
			);

			if (!ownedObjectsPermission) {
				issues.push({ message: `No permission found for object ${obj.id}` });
			} else if (!compareAccessLevel(ownedObjectsPermission.accessLevel, accessLevel)) {
				issues.push({
					message: `Insufficient access level for object ${obj.id}: required ${ownedObjectsPermission.accessLevel}, got ${accessLevel}`,
				});
			}
		}

		return issues;

		function compareAccessLevel(
			required: 'read' | 'mutate' | 'transfer',
			actual: 'read' | 'mutate' | 'transfer',
		): boolean {
			if (required === 'read') {
				return true;
			}
			if (required === 'mutate') {
				return actual === 'mutate' || actual === 'transfer';
			}
			return actual === 'transfer';
		}
	}

	#canAutoApprove(analysis: AutoApprovalResult): AutoApprovalIssue[] {
		const issues: AutoApprovalIssue[] = [];

		if (!this.#state.settings) {
			issues.push({ message: 'No auto-approval settings configured' });
			return issues;
		}

		if (analysis.issues) {
			issues.push({ message: 'Transaction analysis failed' });
			return issues;
		}

		if (new Date() > new Date(this.#state.settings.expiration)) {
			issues.push({ message: 'Auto-approval settings have expired' });
		}

		if (
			this.#state.settings.remainingTransactions !== null &&
			this.#state.settings.remainingTransactions <= 0
		) {
			issues.push({ message: 'No remaining auto-approved transactions' });
		}

		if (
			!analysis.result.operationType ||
			!this.#state.settings.approvedOperations.includes(analysis.result.operationType)
		) {
			issues.push({ message: 'Operation type not approved for auto-approval' });
		}

		for (const outflow of analysis.result.coinFlows.outflows) {
			if (outflow.amount <= 0n) {
				continue;
			}

			if (this.#state.settings.coinBudgets[outflow.coinType] !== undefined) {
				const coinBudget = this.#state.settings.coinBudgets[outflow.coinType];

				if (coinBudget) {
					if (BigInt(coinBudget) < outflow.amount) {
						issues.push({
							message: `Insufficient budget for coin type ${outflow.coinType}`,
						});
					}
				}
			} else {
				const coinAmount = analysis.result.coinValues.coinTypes.find(
					(ct) => ct.coinType === outflow.coinType,
				);

				if (!coinAmount) {
					issues.push({
						message: `No budget configured for coin type ${outflow.coinType}`,
					});
				} else if ((this.#state.settings.sharedBudget ?? 0) < coinAmount.convertedAmount) {
					issues.push({
						message: `Insufficient budget for coin type ${outflow.coinType}`,
					});
				}
			}
		}

		return issues;
	}

	// TODO: we should ensure that only 1 tx is pending at a time, and pending txs can't increase budgets
	commitTransaction(analysis: AutoApprovalResult): void {
		if (!this.#state.settings) {
			throw new Error('No auto-approval settings configured');
		}

		if (!analysis.result) {
			throw new Error('Transaction analysis failed');
		}

		if (this.#state.settings.remainingTransactions !== null && this.#state.settings) {
			this.#state.settings.remainingTransactions = Math.max(
				0,
				this.#state.settings.remainingTransactions - 1,
			);
		}

		for (const outflow of analysis.result.coinFlows.outflows) {
			if (this.#state.settings.coinBudgets[outflow.coinType] !== undefined) {
				const currentBudget = BigInt(this.#state.settings?.coinBudgets[outflow.coinType] ?? '0');
				const newBalance = currentBudget - outflow.amount;
				this.#state.settings.coinBudgets[outflow.coinType] = newBalance.toString();
			} else {
				if (this.#state.settings.sharedBudget === null) {
					throw new Error('No budget available for coin type ' + outflow.coinType);
				}

				const coinValue = analysis.result.coinValues.coinTypes.find(
					(ct) => ct.coinType === outflow.coinType,
				);

				if (!coinValue) {
					throw new Error('No value available for coin type ' + outflow.coinType);
				}

				this.#state.settings.sharedBudget -= coinValue.convertedAmount;
			}
		}

		this.#state.pendingDigests.push(analysis.result.digest);
	}

	revertTransaction(analysis: AutoApprovalResult): void {
		if (analysis.result?.digest) {
			this.#removePendingDigest(analysis.result?.digest);
		}

		if (this.#state.settings?.remainingTransactions !== null && this.#state.settings) {
			this.#state.settings.remainingTransactions += 1;
		}

		this.#revertCoinFlows(analysis);
	}

	#revertCoinFlows(analysis: AutoApprovalResult): void {
		if (!this.#state.settings) {
			throw new Error('No auto-approval settings configured');
		}

		if (!analysis.result) {
			throw new Error('Transaction analysis failed');
		}

		for (const outflow of analysis.result.coinFlows.outflows) {
			if (this.#state.settings?.coinBudgets[outflow.coinType] !== undefined) {
				const currentBudget = BigInt(this.#state.settings?.coinBudgets[outflow.coinType] ?? '0');
				const newBalance = currentBudget + outflow.amount;
				this.#state.settings.coinBudgets[outflow.coinType] = newBalance.toString();
			} else {
				if (this.#state.settings.sharedBudget === null) {
					throw new Error('No budget available for coin type ' + outflow.coinType);
				}

				const coinValue = analysis.result.coinValues.coinTypes.find(
					(ct) => ct.coinType === outflow.coinType,
				);

				if (!coinValue) {
					throw new Error('No value available for coin type ' + outflow.coinType);
				}

				this.#state.settings.sharedBudget += coinValue.convertedAmount;
			}
		}
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
		analysis: AutoApprovalResult,
		result: Experimental_SuiClientTypes.TransactionResponse,
	): void {
		this.#removePendingDigest(result.digest);

		if (!this.#state.settings) {
			throw new Error('No auto-approval settings configured');
		}

		if (!analysis.result) {
			throw new Error('Transaction analysis failed');
		}

		// Revert coin flows and use real balance changes instead
		this.#revertCoinFlows(analysis);

		for (const change of result.balanceChanges) {
			if (this.#state.settings.coinBudgets[change.coinType] !== undefined) {
				const currentBudget = BigInt(this.#state.settings?.coinBudgets[change.coinType] ?? '0');
				const newBalance = currentBudget + BigInt(change.amount);
				if (this.#state.settings) {
					this.#state.settings.coinBudgets[change.coinType] = newBalance.toString();
				}
			} else {
				if (this.#state.settings.sharedBudget === null) {
					throw new Error('No budget available for coin type ' + change.coinType);
				}

				const coinValue = analysis.result.coinValues.coinTypes.find(
					(ct) => ct.coinType === change.coinType,
				);

				if (!coinValue) {
					throw new Error('No value available for coin type ' + change.coinType);
				}

				const convertedChange =
					(Number(change.amount) / 10 ** coinValue.decimals) * coinValue.price;

				this.#state.settings.sharedBudget += convertedChange;
			}
		}
	}

	reset() {
		this.#state = {
			schemaVersion: '1.0.0',
			policy: this.#state.policy,
			settings: null,
			pendingDigests: [],
		};
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

const parsedCoinType = parseStructTag('0x2::coin::Coin');

function isCoinType(type: string): boolean {
	const parsedType = parseStructTag(type);
	return (
		parsedType.address === parsedCoinType.address &&
		parsedType.module === parsedCoinType.module &&
		parsedType.name === parsedCoinType.name &&
		parsedType.typeParams.length === 1
	);
}
