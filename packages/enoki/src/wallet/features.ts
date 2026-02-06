// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AuthProvider, EnokiNetwork } from '../EnokiClient/type.js';
import type { ZkLoginSession } from './types.js';

/** Name of the feature for retrieving basic wallet metadata. */
export const EnokiGetMetadata = 'enoki:getMetadata';

/** The latest API version of the getMetadata API. */
export type EnokiGetMetadataVersion = '1.0.0';

/**
 * A Wallet Standard feature for retrieving Enoki-specific metadata about the wallet.
 */
export type EnokiGetMetadataFeature = {
	/** Namespace for the feature. */
	[EnokiGetMetadata]: {
		/** Version of the feature API. */
		version: EnokiGetMetadataVersion;
		getMetadata: EnokiGetMetadataMethod;
	};
};

export type EnokiGetMetadataMethod = (input?: EnokiGetMetadataInput) => EnokiGetMetadataOutput;

/** Input for retrieving metadata about the wallet. */
export type EnokiGetMetadataInput = void;

/** Output of retrieving metadata about the wallet. */
export type EnokiGetMetadataOutput = {
	/** The social provider for the wallet. */
	provider: AuthProvider;
};

/** Name of the feature for retrieving the Enoki session. */
export const EnokiGetSession = 'enoki:getSession';

/** The latest API version of the getSession API. */
export type EnokiGetSessionVersion = '1.0.0';

/**
 * A Wallet Standard feature for retrieving the zkLogin session from the wallet.
 */
export type EnokiGetSessionFeature = {
	/** Namespace for the feature. */
	[EnokiGetSession]: {
		/** Version of the feature API. */
		version: EnokiGetSessionVersion;
		getSession: EnokiGetSessionMethod;
	};
};

export type EnokiGetSessionMethod = (
	input?: EnokiGetSessionInput,
) => Promise<EnokiGetSessionOutput>;

/** Input for retrieving the session from the wallet. */
export type EnokiGetSessionInput = {
	/**
	 * The network to retrieve session data for. Defaults to the active network.
	 **/
	network?: EnokiNetwork;
};

/** Output of retrieving the Enoki session. */
export type EnokiGetSessionOutput = ZkLoginSession | null;
