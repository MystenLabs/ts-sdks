// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';

// Object Permissions Schema
export const ObjectPermissionsSchema = v.union([
	v.literal('read'),
	v.literal('mutate'),
	v.literal('transfer'),
]);

// Base Rule Schema
export const BaseRuleSchema = v.object({
	description: v.string(),
});

// Auto Approval Object Type Rule Schema
export const AutoApprovalObjectTypeRuleSchema = v.object({
	...BaseRuleSchema.entries,
	$kind: v.literal('ObjectTypeRule'),
	objectType: v.string(),
	accessLevel: ObjectPermissionsSchema,
});

// Coin Balance Rule Schema
export const CoinBalanceRuleSchema = v.object({
	...BaseRuleSchema.entries,
	$kind: v.literal('CoinBalanceRule'),
	coinType: v.string(),
});

// All Balances Rule Schema
export const AllBalancesRuleSchema = v.object({
	...BaseRuleSchema.entries,
	$kind: v.literal('AllBalancesRule'),
});

// Auto Approval Rule Set Schema
export const AutoApprovalRuleSetSchema = v.object({
	id: v.string(),
	description: v.string(),
	network: v.string(),
	rules: v.object({
		ownedObjects: v.optional(v.array(AutoApprovalObjectTypeRuleSchema)),
		sessionCreatedObjects: v.optional(v.array(AutoApprovalObjectTypeRuleSchema)),
		balances: v.optional(v.array(CoinBalanceRuleSchema)),
		allBalances: v.optional(AllBalancesRuleSchema),
	}),
});

// Auto Approval Policy Settings Schema
export const AutoApprovalPolicySettingsSchema = v.object({
	remainingTransactions: v.nullable(v.number()),
	expiration: v.string(),
	usdBudget: v.nullable(v.number()),
	approvedRuleSets: v.array(v.string()),
	coinBudgets: v.record(v.string(), v.string()),
});

// Auto Approval Policy Schema
export const AutoApprovalPolicySchema = v.object({
	version: v.literal('1.0.0'),
	origin: v.string(),
	ruleSets: v.array(AutoApprovalRuleSetSchema),
	suggestedSettings: v.record(v.string(), v.partial(AutoApprovalPolicySettingsSchema)),
	defaultRuleSet: v.nullable(v.record(v.string(), v.string())),
});

// Balance Change Schema
export const BalanceChangeSchema = v.object({
	balanceChange: v.string(),
	lastUpdated: v.string(),
});

// Created Object Schema
export const CreatedObjectSchema = v.object({
	objectId: v.string(),
	version: v.string(),
	digest: v.string(),
	objectType: v.string(),
});

// Auto Approval State Schema
export const AutoApprovalStateSchema = v.object({
	version: v.literal('1.0.0'),
	network: v.string(),
	origin: v.string(),
	approvedAt: v.nullable(v.string()),
	policy: v.nullable(AutoApprovalPolicySchema),
	settings: v.nullable(AutoApprovalPolicySettingsSchema),
	balanceChanges: v.record(v.string(), BalanceChangeSchema),
	pendingDigests: v.array(v.string()),
	approvedDigests: v.array(v.string()),
	createdObjects: v.record(v.string(), CreatedObjectSchema),
});

// Transaction Analysis Schema (from analysis.ts)
export const CoinOutflowSchema = v.object({
	coinType: v.string(),
	balance: v.string(),
});

export const UsedObjectSchema = v.object({
	id: v.string(),
	version: v.string(),
	digest: v.string(),
	objectType: v.string(),
	owner: v.any(), // Experimental_SuiClientTypes.ObjectOwner
	accessType: v.union([v.literal('read'), v.literal('mutate'), v.literal('transfer')]),
});

export const TransactionAnalysisSchema = v.object({
	digest: v.string(),
	autoApproved: v.boolean(),
	coinOutflows: v.array(CoinOutflowSchema),
	usedObjects: v.array(UsedObjectSchema),
	expectedBalanceChanges: v.record(v.string(), v.array(CoinOutflowSchema)),
});
