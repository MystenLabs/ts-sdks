// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';

const AccessLevelSchema = v.union([v.literal('read'), v.literal('mutate'), v.literal('transfer')]);

const BasePermissionSchema = v.object({
	description: v.string(),
});

const ObjectTypePermissionSchema = v.object({
	...BasePermissionSchema.entries,
	$kind: v.literal('ObjectType'),
	objectType: v.string(),
	accessLevel: AccessLevelSchema,
});

const CoinBalancePermissionSchema = v.object({
	...BasePermissionSchema.entries,
	$kind: v.literal('CoinBalance'),
	coinType: v.string(),
});

const AnyBalancesPermissionSchema = v.object({
	...BasePermissionSchema.entries,
	$kind: v.literal('AnyBalance'),
});

export type PolicyPermission = v.InferOutput<
	| typeof CoinBalancePermissionSchema
	| typeof AnyBalancesPermissionSchema
	| typeof ObjectTypePermissionSchema
>;

const AutoApprovalOperationSchema = v.object({
	id: v.string(),
	description: v.string(),
	permissions: v.object({
		ownedObjects: v.optional(v.array(ObjectTypePermissionSchema)),
		balances: v.optional(v.array(CoinBalancePermissionSchema)),
		anyBalance: v.optional(AnyBalancesPermissionSchema),
	}),
});

export const AutoApprovalSettingsSchema = v.looseObject({
	approvedOperations: v.array(v.string()),
	expiration: v.number(),
	remainingTransactions: v.nullable(v.number()),
	sharedBudget: v.nullable(v.number()),
	// TODO: normalize coin types
	coinBudgets: v.record(v.string(), v.string()),
});

export const AutoApprovalPolicySchema = v.object({
	schemaVersion: v.literal('1.0.0'),
	operations: v.array(AutoApprovalOperationSchema),
	suggestedSettings: v.optional(v.partial(AutoApprovalSettingsSchema)),
});

export type AutoApprovalSettings = v.InferOutput<typeof AutoApprovalSettingsSchema>;
export type AutoApprovalPolicy = v.InferOutput<typeof AutoApprovalPolicySchema>;
export type AutoApprovalOperation = v.InferOutput<typeof AutoApprovalOperationSchema>;
