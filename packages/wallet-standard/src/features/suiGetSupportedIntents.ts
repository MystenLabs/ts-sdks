// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Name of the feature. */
export const SuiGetSupportedIntents = 'sui:getSupportedIntents';

/** The latest API version of the getSupportedIntents API. */
export type SuiGetSupportedIntentsVersion = '1.0.0';

/**
 * A Wallet Standard feature for getting the current list of supported intents.
 * This allows dApps to dynamically query what intents the wallet currently supports,
 * avoiding caching issues with the supportedIntents from connect().
 */
export type SuiGetSupportedIntentsFeature = {
	/** Namespace for the feature. */
	[SuiGetSupportedIntents]: {
		/** Version of the feature API. */
		version: SuiGetSupportedIntentsVersion;
		getSupportedIntents: SuiGetSupportedIntentsMethod;
	};
};

export type SuiGetSupportedIntentsMethod = (
	input?: SuiGetSupportedIntentsInput,
) => Promise<SuiGetSupportedIntentsOutput>;

/** Input for getting supported intents (currently no input needed). */
export interface SuiGetSupportedIntentsInput {
	signal?: AbortSignal;
}

/** Output of getting supported intents. */
export interface SuiGetSupportedIntentsOutput {
	/** Array of supported intent names */
	supportedIntents: string[];
}