// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line import/no-cycle
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import {
	resolveFloorPriceRule,
	resolveKioskLockRule,
	resolvePersonalKioskRule,
	resolveRoyaltyRule,
} from './tx/rules//resolve.js';
import type { ObjectArgument, RuleResolvingParams } from './types/index.js';

/**
 * The base rule package ids that can be extended
 */
export type BaseRulePackageIds = {
	royaltyRulePackageId?: string;
	kioskLockRulePackageId?: string;
	personalKioskRulePackageId?: string;
	floorPriceRulePackageId?: string;
};

/**
 * The Transfer Policy rule.
 */
export type TransferPolicyRule = {
	rule: string;
	packageId: string;
	resolveRuleFunction: (
		rule: RuleResolvingParams,
	) => ObjectArgument | void | Promise<ObjectArgument | void>;
	hasLockingRule?: boolean;
};

export const ROYALTY_RULE_ADDRESS: Partial<Record<Experimental_SuiClientTypes.Network, string>> = {
	testnet: 'bd8fc1947cf119350184107a3087e2dc27efefa0dd82e25a1f699069fe81a585',
	mainnet: '0x434b5bd8f6a7b05fede0ff46c6e511d71ea326ed38056e3bcd681d2d7c2a7879',
};

export const KIOSK_LOCK_RULE_ADDRESS: Partial<Record<Experimental_SuiClientTypes.Network, string>> =
	{
		testnet: 'bd8fc1947cf119350184107a3087e2dc27efefa0dd82e25a1f699069fe81a585',
		mainnet: '0x434b5bd8f6a7b05fede0ff46c6e511d71ea326ed38056e3bcd681d2d7c2a7879',
	};

export const FLOOR_PRICE_RULE_ADDRESS: Partial<
	Record<Experimental_SuiClientTypes.Network, string>
> = {
	testnet: '0x06f6bdd3f2e2e759d8a4b9c252f379f7a05e72dfe4c0b9311cdac27b8eb791b1',
	mainnet: '0x34cc6762780f4f6f153c924c0680cfe2a1fb4601e7d33cc28a92297b62de1e0e',
};

export const PERSONAL_KIOSK_RULE_ADDRESS: Partial<
	Record<Experimental_SuiClientTypes.Network, string>
> = {
	testnet: '0x06f6bdd3f2e2e759d8a4b9c252f379f7a05e72dfe4c0b9311cdac27b8eb791b1',
	mainnet: '0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802',
};

/**
 * Constructs a list of rule resolvers based on the params.
 */
export function getBaseRules({
	royaltyRulePackageId,
	kioskLockRulePackageId,
	personalKioskRulePackageId,
	floorPriceRulePackageId,
}: BaseRulePackageIds): TransferPolicyRule[] {
	const rules: TransferPolicyRule[] = [];

	if (royaltyRulePackageId) {
		rules.push({
			rule: `${royaltyRulePackageId}::royalty_rule::Rule`,
			packageId: royaltyRulePackageId,
			resolveRuleFunction: resolveRoyaltyRule,
		});
	}

	if (kioskLockRulePackageId) {
		rules.push({
			rule: `${kioskLockRulePackageId}::kiosk_lock_rule::Rule`,
			packageId: kioskLockRulePackageId,
			resolveRuleFunction: resolveKioskLockRule,
			hasLockingRule: true,
		});
	}

	if (personalKioskRulePackageId) {
		rules.push({
			rule: `${personalKioskRulePackageId}::personal_kiosk_rule::Rule`,
			packageId: personalKioskRulePackageId,
			resolveRuleFunction: resolvePersonalKioskRule,
		});
	}

	if (floorPriceRulePackageId) {
		rules.push({
			rule: `${floorPriceRulePackageId}::floor_price_rule::Rule`,
			packageId: floorPriceRulePackageId,
			resolveRuleFunction: resolveFloorPriceRule,
		});
	}

	return rules;
}

// TODO: Do we need these?
// A list of testnet's base rules.
export const testnetRules: TransferPolicyRule[] = getBaseRules({
	royaltyRulePackageId: ROYALTY_RULE_ADDRESS.testnet,
	kioskLockRulePackageId: KIOSK_LOCK_RULE_ADDRESS.testnet,
	personalKioskRulePackageId: PERSONAL_KIOSK_RULE_ADDRESS.testnet,
	floorPriceRulePackageId: FLOOR_PRICE_RULE_ADDRESS.testnet,
});

// TODO: Why are we not adding all the rules defined above?
// A list of mainnet's base rules.
export const mainnetRules: TransferPolicyRule[] = getBaseRules({
	royaltyRulePackageId: ROYALTY_RULE_ADDRESS.mainnet,
	kioskLockRulePackageId: KIOSK_LOCK_RULE_ADDRESS.mainnet,
});

export const rules: TransferPolicyRule[] = [...testnetRules, ...mainnetRules];
