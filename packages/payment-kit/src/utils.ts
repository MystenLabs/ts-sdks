// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID } from '@mysten/sui/utils';
import type { RegistryParam } from './types.js';
import { DEFAULT_REGISTRY_NAME } from './constants.js';

export const getRegistryIdFromName = (registryName: string, namespaceId: string) => {
	return deriveObjectID(
		namespaceId,
		'0x1::ascii::String',
		bcs.String.serialize(registryName).toBytes(),
	);
};

export const getRegistryIdFromParams = (namespaceId: string, registry?: RegistryParam): string => {
	// If a registry is not provided, fallback to the default one.
	return registry
		? registry.registryName
			? getRegistryIdFromName(registry.registryName, namespaceId)
			: registry.registryId!
		: getRegistryIdFromName(DEFAULT_REGISTRY_NAME, namespaceId);
};
