// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalPolicy, AutoApprovalPolicySettings } from './policy.js';

export interface AutoApprovalState {
	version: '1.0.0';
	network: string;
	origin: string;
	approvedAt: string | null;
	policy: AutoApprovalPolicy | null;
	settings: AutoApprovalPolicySettings | null;
	balanceChanges: Record<
		string,
		{
			balanceChange: string;
			lastUpdated: string;
		}
	>;
	pendingDigests: string[];
	approvedDigests: string[];
	createdObjects: Record<
		string,
		{
			objectId: string;
			version: string;
			digest: string;
			objectType: string;
		}
	>;
}
