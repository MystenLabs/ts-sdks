// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';

type AccessLevel = 'read' | 'mutate' | 'transfer';

const AccessLevelSchema = v.union([v.literal('read'), v.literal('mutate'), v.literal('transfer')]);

type BasePermission = {
	description: string;
};

const BasePermissionSchema = v.object({
	description: v.string(),
});

type ObjectTypePermission = BasePermission & {
	$kind: 'ObjectType';
	objectType: string;
	accessLevel: AccessLevel;
};

const ObjectTypePermissionSchema = v.object({
	...BasePermissionSchema.entries,
	$kind: v.literal('ObjectType'),
	objectType: v.string(),
	accessLevel: AccessLevelSchema,
});

type CoinBalancePermission = BasePermission & {
	$kind: 'CoinBalance';
	coinType: string;
};

const CoinBalancePermissionSchema = v.object({
	...BasePermissionSchema.entries,
	$kind: v.literal('CoinBalance'),
	coinType: v.string(),
});

type AnyBalancesPermission = BasePermission & {
	$kind: 'AnyBalance';
};

const AnyBalancesPermissionSchema = v.object({
	...BasePermissionSchema.entries,
	$kind: v.literal('AnyBalance'),
});

export type PolicyPermission = CoinBalancePermission | AnyBalancesPermission | ObjectTypePermission;

export type AutoApprovalOperation = {
	id: string;
	description: string;
	permissions: {
		ownedObjects?: ObjectTypePermission[];
		balances?: CoinBalancePermission[];
		anyBalance?: AnyBalancesPermission;
	};
};

const AutoApprovalOperationSchema = v.object({
	id: v.string(),
	description: v.string(),
	permissions: v.object({
		ownedObjects: v.optional(v.array(ObjectTypePermissionSchema)),
		balances: v.optional(v.array(CoinBalancePermissionSchema)),
		anyBalance: v.optional(AnyBalancesPermissionSchema),
	}),
});

export type AutoApprovalSettings = {
	approvedOperations: string[];
	expiration: number;
	remainingTransactions: number | null;
	sharedBudget: number | null;
	coinBudgets: Record<string, string>;
};

// TODO: do we want to support custom settings
const AutoApprovalSettingsSchemaInternal = v.looseObject({
	approvedOperations: v.array(v.string()),
	expiration: v.number(),
	// TODO: figure out a better name
	remainingTransactions: v.nullable(v.number()),
	sharedBudget: v.nullable(v.number()),
	// TODO: normalize coin types
	coinBudgets: v.record(v.string(), v.string()),
});

export const AutoApprovalSettingsSchema: v.GenericSchema<
	AutoApprovalSettings,
	AutoApprovalSettings
> = AutoApprovalSettingsSchemaInternal as v.GenericSchema<
	AutoApprovalSettings,
	AutoApprovalSettings
>;

export type AutoApprovalPolicy = {
	schemaVersion: '1.0.0';
	operations: AutoApprovalOperation[];
	suggestedSettings?: Partial<AutoApprovalSettings>;
};

const AutoApprovalPolicySchemaInternal = v.object({
	schemaVersion: v.literal('1.0.0'),
	operations: v.array(AutoApprovalOperationSchema),
	// TODO: do we want to split suggested settings into a different type (not everything makes sense as a suggestion)
	suggestedSettings: v.optional(v.partial(AutoApprovalSettingsSchemaInternal)),
});

export const AutoApprovalPolicySchema: v.GenericSchema<AutoApprovalPolicy, AutoApprovalPolicy> =
	AutoApprovalPolicySchemaInternal as v.GenericSchema<AutoApprovalPolicy, AutoApprovalPolicy>;
