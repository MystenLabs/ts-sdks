// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';
import { AutoApprovalPolicySchema, AutoApprovalSettingsSchema } from './policy.js';

export const CreatedObjectSchema = v.object({
	objectId: v.string(),
	version: v.string(),
	digest: v.string(),
	objectType: v.string(),
});

export const AutoApprovalStateSchema = v.object({
	schemaVersion: v.literal('1.0.0'),
	policy: AutoApprovalPolicySchema,
	settings: v.nullable(AutoApprovalSettingsSchema),
	pendingDigests: v.array(v.string()),
});

export type AutoApprovalState = v.InferOutput<typeof AutoApprovalStateSchema>;
