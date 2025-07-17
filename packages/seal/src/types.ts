// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	ClientWithExtensions,
	Experimental_CoreClient,
	Experimental_SuiClientTypes,
} from '@mysten/sui/experimental';

export type KeyCacheKey = `${string}:${string}`;
export type SealCompatibleClient = ClientWithExtensions<{
	core: Experimental_CoreClient & {
		verifyZkLoginSignature: NonNullable<
			Experimental_SuiClientTypes.TransportMethods['verifyZkLoginSignature']
		>;
	};
}>;
