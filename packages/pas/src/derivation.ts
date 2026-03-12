// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { deriveDynamicFieldID, deriveObjectID, normalizeSuiAddress } from '@mysten/sui/utils';

import type { PASPackageConfig } from './types.js';

/**
 * Derives the account address for a given owner address.
 *
 * Accounts are derived using the namespace UID and a AccountKey(owner).
 * The key structure in Move is: `AccountKey(address)`
 *
 * @param owner - The owner address (can be a user address or object address)
 * @param packageConfig - PAS package configuration
 * @returns The derived account object ID
 */
export function deriveAccountAddress(owner: string, packageConfig: PASPackageConfig): string {
	const { packageId, namespaceId } = packageConfig;

	// Serialize the AccountKey(address) as the key
	// AccountKey is a struct with a single field: address
	const accountKeyBcs = bcs.struct('AccountKey', {
		owner: bcs.Address,
	});

	const key = accountKeyBcs.serialize({ owner: normalizeSuiAddress(owner) }).toBytes();

	// The type tag is the AccountKey type from the PAS package
	const typeTag = `${packageId}::keys::AccountKey`;

	return deriveObjectID(namespaceId, typeTag, key);
}

const DEFAULT_WRAP_TYPE = (t: string) => `0x2::balance::Balance<${t}>`;

export interface DerivePolicyOptions {
	/** Transform the asset type before using it in the PolicyKey type tag.
	 *  Defaults to wrapping with `0x2::balance::Balance<T>`.
	 *  Pass `(t) => t` to use the raw type. */
	wrapType?: (assetType: string) => string;
}

/**
 * Derives the policy address for a given asset type T.
 *
 * Policies are derived using the namespace UID and a PolicyKey<T>().
 * The key structure in Move is: `PolicyKey<phantom T>()`
 *
 * By default the asset type is wrapped as `Balance<T>` to match the current
 * on-chain convention. Pass `options.wrapType` to override.
 *
 * @param assetType - The full type of the asset (e.g., "0x2::sui::SUI")
 * @param packageConfig - PAS package configuration
 * @param options - Optional derivation options
 * @returns The derived policy object ID
 */
export function derivePolicyAddress(
	assetType: string,
	packageConfig: PASPackageConfig,
	options?: DerivePolicyOptions,
): string {
	const { packageId, namespaceId } = packageConfig;

	const policyKeyBcs = new Uint8Array([0]);

	const wrap = options?.wrapType ?? DEFAULT_WRAP_TYPE;
	const typeTag = `${packageId}::keys::PolicyKey<${wrap(assetType)}>`;
	return deriveObjectID(namespaceId, typeTag, policyKeyBcs);
}

/**
 * Derives the templates object address for a given package configuration.
 *
 * Templates are derived using the namespace UID and a TemplateKey().
 * The key structure in Move is: `TemplateKey()`
 *
 * @param packageConfig - PAS package configuration
 * @returns The derived templates object ID
 */
export function deriveTemplateRegistryAddress(packageConfig: PASPackageConfig): string {
	const { packageId, namespaceId } = packageConfig;

	// The type tag is the TemplateKey type from the PAS package
	const typeTag = `${packageId}::keys::TemplateKey`;

	return deriveObjectID(namespaceId, typeTag, new Uint8Array([0]));
}

/**
 * Derives the dynamic field address for a template command on the Templates object.
 *
 * Templates store Commands as dynamic fields keyed by `TypeName` (the approval type's
 * `type_name::with_defining_ids` value). The DF key type is `std::type_name::TypeName`
 * which is a struct with a single `name: String` field.
 *
 * @param templatesId - The Templates object ID
 * @param approvalTypeName - The fully qualified approval type name (e.g., "0x123::demo_usd::TransferApproval")
 * @returns The derived dynamic field object ID
 */
export function deriveTemplateAddress(templatesId: string, approvalTypeName: string): string {
	// TypeName is a struct { name: String }, serialized as BCS string
	const key = bcs.string().serialize(approvalTypeName).toBytes();

	return deriveDynamicFieldID(templatesId, '0x1::type_name::TypeName', key);
}
