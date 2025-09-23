// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import type { ClientWithCoreApi } from '@mysten/sui/experimental';
import type { TransactionAnalysis, CoinOutflow, UsedObject } from './types/analysis.js';
import type { AutoApprovalPolicy, AutoApprovalObjectTypeRule } from './types/index.js';
import { extractCoinFlows } from '../transaction-linter.js';
import { normalizeStructTag } from '@mysten/sui/utils';
import type { SuiClient } from '@mysten/sui/dist/cjs/client/client.js';

export interface TransactionAnalyzerOptions {
	client: ClientWithCoreApi;
	getCoinPrices?: (coinTypes: string[]) => Promise<Record<string, string>>;
	approveObjects?: (objects: UsedObject[]) => Promise<boolean[]>;
}

export class TransactionAnalyzer {
	#client: ClientWithCoreApi;
	#getCoinPrices: (coinTypes: string[]) => Promise<Record<string, string>>;
	#approveObjects: (objects: UsedObject[]) => Promise<boolean[]>;

	constructor(options: TransactionAnalyzerOptions) {
		this.#client = options.client;
		this.#getCoinPrices = options.getCoinPrices ?? (async () => ({}));
		this.#approveObjects = options.approveObjects ?? (async () => []);
	}

	/**
	 * Analyze a transaction to extract coin outflows and used objects
	 */
	async analyzeTransaction(
		tx: Transaction,
		policy?: AutoApprovalPolicy | null,
	): Promise<TransactionAnalysis> {
		try {
			// First, register intent resolver BEFORE any calls to tx.getData()
			let extractedRuleSetId: string | null = null;
			try {
				tx.addIntentResolver('AutoApproval', async (transactionData, _options, next) => {
					// Extract ruleSetId before removing intents if we haven't already
					if (!extractedRuleSetId) {
						for (const command of transactionData.commands) {
							if (command.$kind === '$Intent' && command.$Intent?.name === 'AutoApproval') {
								extractedRuleSetId = (command.$Intent.data?.ruleSetId as string) || null;
								break;
							}
						}
					}

					// Find AutoApproval intents and remove them by replacing with empty array
					for (let index = transactionData.commands.length - 1; index >= 0; index--) {
						const command = transactionData.commands[index];
						if (command.$kind === '$Intent' && command.$Intent.name === 'AutoApproval') {
							transactionData.replaceCommand(index, []);
						}
					}
					await next();
				});
			} catch (error) {
				// Resolver already exists, that's okay - it was added by the autoApproval() call
			}

			// Build the transaction to resolve all intents
			await tx.build({ client: this.#client });
			const digest = await tx.getDigest();

			// Extract coin flows using the existing linter (now with resolved intents)
			const coinFlows = await extractCoinFlows(tx, this.#client as any);
			const coinOutflows: CoinOutflow[] = coinFlows.outflows.map((flow) => ({
				coinType: normalizeStructTag(flow.coinType),
				balance: flow.amount,
			}));

			// Extract used objects
			const usedObjects = await this.#extractUsedObjects(tx);

			// Extract transaction structure for UI display (now with resolved intents)
			const transactionData = tx.getData();
			const inputs = transactionData.inputs || [];
			const commands = transactionData.commands || [];

			// Check if transaction matches policy rules (if policy provided)
			const matchesPolicy =
				policy && extractedRuleSetId
					? await this.#checkRuleMatching(coinOutflows, usedObjects, policy, extractedRuleSetId)
					: false;

			// Calculate expected balance changes
			const expectedBalanceChanges = this.#calculateExpectedBalanceChanges(coinOutflows);

			// Calculate estimated USD cost
			const estimatedUsdCost = await this.#calculateUsdCost(coinOutflows);

			return {
				digest,
				autoApproved: matchesPolicy,
				ruleSetId: extractedRuleSetId || null,
				coinOutflows,
				usedObjects,
				expectedBalanceChanges,
				estimatedUsdCost,
				inputs,
				commands,
			};
		} catch (error) {
			console.error('Error analyzing transaction:', error);
			// Try to get digest, fallback to error placeholder
			let digest = 'error-no-digest';
			try {
				digest = await tx.getDigest();
			} catch {
				// Keep fallback value
			}

			return {
				digest,
				autoApproved: false,
				ruleSetId: null,
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				estimatedUsdCost: 0,
				inputs: [],
				commands: [],
			};
		}
	}

	/**
	 * Extract used objects from transaction commands
	 */
	async #extractUsedObjects(tx: Transaction): Promise<UsedObject[]> {
		const data = tx.getData();
		const objectIds = new Set<string>();
		const objectPermissions = new Map<string, 'read' | 'mutate' | 'transfer'>();

		// Extract object IDs from inputs - only work with resolved objects
		for (const [_index, input] of data.inputs.entries()) {
			// Handle both owned and shared objects
			if (input.$kind === 'Object') {
				let objectId: string;
				if (input.Object.$kind === 'ImmOrOwnedObject') {
					objectId = input.Object.ImmOrOwnedObject.objectId;
				} else if (input.Object.$kind === 'SharedObject') {
					objectId = input.Object.SharedObject.objectId;
				} else {
					continue;
				}

				objectIds.add(objectId);
				// Initialize with read permission
				objectPermissions.set(objectId, 'read');
			}
		}

		// Analyze commands to determine required permissions
		for (const command of data.commands) {
			switch (command.$kind) {
				case 'TransferObjects': {
					// Objects being transferred require transfer permission
					for (const object of command.TransferObjects.objects) {
						if (object.$kind === 'Input') {
							const input = data.inputs[object.Input];
							if (input.$kind === 'Object') {
								const objectId = this.#getObjectIdFromInput(input);
								if (objectId) {
									this.#upgradePermission(objectPermissions, objectId, 'transfer');
								}
							}
						}
					}
					break;
				}

				case 'MoveCall': {
					// For move calls, we need the function signature to determine actual permissions
					// For now, we'll use a conservative approach and assume mutable access
					await this.#analyzeMoveCallPermissions(command, data.inputs, objectPermissions);
					break;
				}

				case 'SplitCoins':
				case 'MergeCoins': {
					// Coin operations require mutable access to coins
					const coinArgs: any[] = [];

					if (command.$kind === 'SplitCoins') {
						coinArgs.push(command.SplitCoins.coin);
					} else {
						coinArgs.push(command.MergeCoins.destination);
						coinArgs.push(...command.MergeCoins.sources);
					}

					for (const coinArg of coinArgs) {
						if (coinArg.$kind === 'Input') {
							const input = data.inputs[coinArg.Input];
							if (input.$kind === 'Object') {
								const objectId = this.#getObjectIdFromInput(input);
								if (objectId) {
									this.#upgradePermission(objectPermissions, objectId, 'mutate');
								}
							}
						}
					}
					break;
				}
			}
		}

		if (objectIds.size === 0) {
			return [];
		}

		// Fetch object details
		try {
			const response = await this.#client.core.getObjects({
				objectIds: Array.from(objectIds),
			});
			const objectResponses = response.objects;

			const usedObjects: UsedObject[] = [];

			for (const response of objectResponses) {
				if (!(response instanceof Error)) {
					const objectId = response.id;
					const accessType = objectPermissions.get(objectId) || 'read';

					usedObjects.push({
						id: objectId,
						version: response.version,
						digest: response.digest,
						objectType: response.type || 'unknown',
						owner: response.owner,
						accessType,
					});
				}
			}

			return usedObjects;
		} catch (error) {
			console.error('Error fetching object details:', error);
			return [];
		}
	}

	/**
	 * Extract object ID from various input types
	 */
	#getObjectIdFromInput(input: any): string | null {
		if (input.$kind === 'Object') {
			if (input.Object.$kind === 'ImmOrOwnedObject') {
				return input.Object.ImmOrOwnedObject.objectId;
			} else if (input.Object.$kind === 'SharedObject') {
				return input.Object.SharedObject.objectId;
			}
		}
		return null;
	}

	/**
	 * Upgrade permission level for an object (read < mutate < transfer)
	 */
	#upgradePermission(
		objectPermissions: Map<string, 'read' | 'mutate' | 'transfer'>,
		objectId: string,
		newPermission: 'read' | 'mutate' | 'transfer',
	): void {
		const currentPermission = objectPermissions.get(objectId) || 'read';

		// Permission hierarchy: read < mutate < transfer
		const permissionLevels = { read: 0, mutate: 1, transfer: 2 };

		if (permissionLevels[newPermission] > permissionLevels[currentPermission]) {
			objectPermissions.set(objectId, newPermission);
		}
	}

	/**
	 * Analyze move call permissions based on function signature
	 */
	async #analyzeMoveCallPermissions(
		command: any,
		inputs: any[],
		objectPermissions: Map<string, 'read' | 'mutate' | 'transfer'>,
	): Promise<void> {
		try {
			// Fetch the move module definition and parse function signature
			const moduleId = `${command.MoveCall.package}::${command.MoveCall.module}`;
			const functionDef = await this.#getFunctionDefinition(moduleId, command.MoveCall.function);

			if (!functionDef) {
				// Fall back to conservative approach if we can't get the function definition
				this.#applyConservativePermissions(command, inputs, objectPermissions);
				return;
			}

			// Map each argument to its parameter type for precise permission analysis
			for (const [index, arg] of command.MoveCall.arguments.entries()) {
				if (arg.$kind === 'Input' && inputs[arg.Input].$kind === 'Object') {
					const objectId = this.#getObjectIdFromInput(inputs[arg.Input]);
					if (objectId && index < functionDef.parameters.length) {
						const paramType = functionDef.parameters[index].type;
						const permission = this.#getPermissionFromMoveType(paramType);
						this.#upgradePermission(objectPermissions, objectId, permission);
					}
				}
			}
		} catch (error) {
			// Fall back to conservative approach if function signature analysis fails
			console.warn('Failed to analyze Move call permissions, using conservative approach:', error);
			this.#applyConservativePermissions(command, inputs, objectPermissions);
		}
	}

	/**
	 * Get function definition from Move module
	 */
	async #getFunctionDefinition(moduleId: string, functionName: string): Promise<any> {
		try {
			// Cast to SuiClient to access getNormalizedMoveFunction since it's not available in the core API yet
			const suiClient = this.#client as SuiClient;
			if (!suiClient.getNormalizedMoveFunction) {
				return null;
			}

			const [packageId, moduleName] = moduleId.split('::').slice(0, 2);
			const functionDef = await suiClient.getNormalizedMoveFunction({
				package: packageId,
				module: moduleName,
				function: functionName,
			});

			return functionDef;
		} catch (error) {
			console.warn(`Failed to fetch function definition for ${moduleId}::${functionName}:`, error);
			return null;
		}
	}

	/**
	 * Get permission level from Move type
	 */
	#getPermissionFromMoveType(paramType: string): 'read' | 'mutate' | 'transfer' {
		// Handle reference types
		if (paramType.startsWith('&mut ')) {
			return 'mutate';
		} else if (paramType.startsWith('&')) {
			return 'read';
		} else {
			return 'transfer'; // by value - object is consumed/transferred
		}
	}

	/**
	 * Apply conservative permissions when function signature analysis fails
	 */
	#applyConservativePermissions(
		command: any,
		inputs: any[],
		objectPermissions: Map<string, 'read' | 'mutate' | 'transfer'>,
	): void {
		for (const arg of command.MoveCall.arguments) {
			if (arg.$kind === 'Input') {
				const input = inputs[arg.Input];
				if (input.$kind === 'Object') {
					const objectId = this.#getObjectIdFromInput(input);
					if (objectId) {
						// Conservative approach: assume mutable access
						this.#upgradePermission(objectPermissions, objectId, 'mutate');
					}
				}
			}
		}
	}

	/**
	 * Check if transaction matches policy rules (verifies policy coverage, not balances)
	 */
	async #checkRuleMatching(
		coinOutflows: CoinOutflow[],
		usedObjects: UsedObject[],
		policy: AutoApprovalPolicy,
		ruleSetId: string,
	): Promise<boolean> {
		// Find the specific rule set
		const ruleSet = policy.ruleSets.find((rs) => rs.id === ruleSetId);
		if (!ruleSet) {
			return false;
		}

		// Check if policy covers all coin types being spent
		for (const outflow of coinOutflows) {
			const hasCoinRule =
				ruleSet.rules.balances?.some(
					(rule) => rule.$kind === 'CoinBalanceRule' && rule.coinType === outflow.coinType,
				) || ruleSet.rules.allBalances?.$kind === 'AllBalancesRule';

			if (!hasCoinRule) {
				return false;
			}
		}

		// Check if policy covers all objects being used with proper access levels
		for (const usedObject of usedObjects) {
			let hasMatchingRule = false;

			// Check owned object rules
			if (ruleSet.rules.ownedObjects) {
				for (const rule of ruleSet.rules.ownedObjects) {
					if (this.#matchesObjectRule(rule, usedObject, false)) {
						hasMatchingRule = true;
						break;
					}
				}
			}

			// Check session created object rules
			if (!hasMatchingRule && ruleSet.rules.sessionCreatedObjects) {
				for (const rule of ruleSet.rules.sessionCreatedObjects) {
					if (this.#matchesObjectRule(rule, usedObject, true)) {
						hasMatchingRule = true;
						break;
					}
				}
			}

			if (!hasMatchingRule) {
				return false;
			}
		}

		// Check object approvals through callback
		if (usedObjects.length > 0) {
			const approvals = await this.#approveObjects(usedObjects);
			if (approvals.some((approved) => !approved)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if an object matches a specific object rule
	 */
	#matchesObjectRule(
		rule: AutoApprovalObjectTypeRule,
		usedObject: UsedObject,
		_isSessionCreated: boolean,
	): boolean {
		// Check object type match
		const normalizedRuleType = normalizeStructTag(rule.objectType);
		const normalizedObjectType = normalizeStructTag(usedObject.objectType);

		if (normalizedRuleType !== normalizedObjectType) {
			return false;
		}

		// Check access level
		switch (rule.accessLevel) {
			case 'read':
				return true; // Read access allows any operation
			case 'mutate':
				return usedObject.accessType === 'read' || usedObject.accessType === 'mutate';
			case 'transfer':
				return usedObject.accessType === 'transfer';
			default:
				return false;
		}
	}

	/**
	 * Calculate expected balance changes from coin outflows
	 */
	#calculateExpectedBalanceChanges(coinOutflows: CoinOutflow[]): Record<string, CoinOutflow[]> {
		const changes: Record<string, CoinOutflow[]> = {};

		for (const outflow of coinOutflows) {
			if (!changes[outflow.coinType]) {
				changes[outflow.coinType] = [];
			}
			changes[outflow.coinType].push(outflow);
		}

		return changes;
	}

	/**
	 * Calculate USD cost of coin outflows
	 */
	async #calculateUsdCost(coinOutflows: CoinOutflow[]): Promise<number> {
		if (coinOutflows.length === 0) return 0;

		const coinTypes = [...new Set(coinOutflows.map((c) => c.coinType))];
		const prices = await this.#getCoinPrices(coinTypes);

		let totalCost = 0;
		for (const outflow of coinOutflows) {
			const price = parseFloat(prices[outflow.coinType] || '0');
			const amount = parseFloat(outflow.balance) / 1e9; // Assume 9 decimals for now
			totalCost += price * amount;
		}

		return totalCost;
	}
}
