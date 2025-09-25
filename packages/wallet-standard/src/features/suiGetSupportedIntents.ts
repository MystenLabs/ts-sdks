// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export const SuiGetSupportedIntents = 'sui:getSupportedIntents';

/** The latest API version of the getSupportedIntents API. */
export type SuiGetSupportedIntentsVersion = '1.0.0';

/**
 * A Wallet Standard feature for reporting intents supported by the wallet.
 */
export type SuiGetSupportedIntentsFeature = {
	[SuiGetSupportedIntents]: {
		version: SuiGetSupportedIntentsVersion;
		getSupportedIntents: SuiGetSupportedIntentsMethod;
	};
};

export type SuiGetSupportedIntentsMethod = () => Promise<{
	supportedIntents: string[];
}>;
