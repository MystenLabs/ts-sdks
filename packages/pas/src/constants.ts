// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PASPackageConfig } from './types.js';

export const TESTNET_PAS_PACKAGE_CONFIG: PASPackageConfig = {
	packageId: '0x7e77592474ea9759b46ca5c6515ed4840952cd80d60ee54a1614382811d46730',
	namespaceId: '0xf7c77ac8bbbdf47f7b1cf8ac8aa489cfc4dff25847f3e2e1db53bde5c454be2b',
};

export const MAINNET_PAS_PACKAGE_CONFIG: PASPackageConfig = {
	packageId: '0x0', // TODO: Replace with actual mainnet package ID
	namespaceId: '0x0', // TODO: Replace with actual mainnet namespace ID
};
