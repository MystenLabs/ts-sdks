// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';
import type { AutoApprovalPolicy, AutoApprovalSettings } from './policy.js';
import { AutoApprovalPolicySchema, AutoApprovalSettingsSchema } from './policy.js';

export type CreatedObject = {
	objectId: string;
	version: string;
	digest: string;
	objectType: string;
};

export const CreatedObjectSchema: v.GenericSchema<CreatedObject, CreatedObject> = v.object({
	objectId: v.string(),
	version: v.string(),
	digest: v.string(),
	objectType: v.string(),
});

export type AutoApprovalState = {
	schemaVersion: '1.0.0';
	policy: AutoApprovalPolicy;
	settings: AutoApprovalSettings | null;
	pendingDigests: string[];
};

export const AutoApprovalStateSchema: v.GenericSchema<AutoApprovalState, AutoApprovalState> =
	v.object({
		schemaVersion: v.literal('1.0.0'),
		policy: AutoApprovalPolicySchema,
		settings: v.nullable(AutoApprovalSettingsSchema),
		pendingDigests: v.array(v.string()),
	}) as v.GenericSchema<AutoApprovalState, AutoApprovalState>;
