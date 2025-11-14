// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export const SuiGetCapabilities = 'sui:getCapabilities';

/** The latest API version of the getCapabilities API. */
export type SuiGetCapabilitiesVersion = '1.0.0';

/**
 * A Wallet Standard feature for reporting intents supported by the wallet.
 */
export type SuiGetCapabilitiesFeature = {
	[SuiGetCapabilities]: {
		version: SuiGetCapabilitiesVersion;
		getCapabilities: SuiGetCapabilitiesMethod;
	};
};

export type SuiGetCapabilitiesMethod = () => Promise<{
	supportedIntents?: string[];
}>;
