// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';

/**
 * Configuration for the PAS package on a specific network
 */
export interface PASPackageConfig {
	/** The package ID of the PAS package */
	packageId: string;
	/** The namespace ID of the PAS package */
	namespaceId: string;
}

/**
 * Configuration for the PAS client
 */
export interface PASClientConfig {
	/** The Sui client to use */
	suiClient: ClientWithCoreApi;
	/** The package configuration (if network is not provided or supported) */
	packageConfig?: PASPackageConfig;
}

/**
 * Options for creating a PAS client plugin
 */
export interface PASOptions<Name extends string = 'pas'> {
	/** The name of the plugin */
	name?: Name;
	/** The package configuration */
	packageConfig?: PASPackageConfig;
}
