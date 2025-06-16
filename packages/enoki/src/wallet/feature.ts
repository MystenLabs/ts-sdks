// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AuthProvider } from '../EnokiClient/type.js';

/** Name of the feature. */
export const EnokiGetMetadata = 'enoki:getMetadata';

/** The latest API version of the getEnokiMetadata API. */
export type EnokiGetMetadataVersion = '1.0.0';

/**
 * A Wallet Standard feature for retreiving Enoki-specific metadata about the wallet.
 */
export type EnokiGetMetadataFeature = {
	/** Namespace for the feature. */
	[EnokiGetMetadata]: {
		/** Version of the feature API. */
		version: '1.0.0';
		getMetadata: EnokiGetMetadataMethod;
	};
};

export type EnokiGetMetadataMethod = (input?: EnokiGetMetadataInput) => EnokiGetMetadataOutput;

/** Input for retrieving metadata about the wallet. */
export interface EnokiGetMetadataInput {}

/** Output of retrieving metadata about the wallet. */
export interface EnokiGetMetadataOutput {
	provider: AuthProvider;
}
