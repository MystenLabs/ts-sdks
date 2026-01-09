// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidSuiAddress } from '@mysten/sui/utils';
import type { ClientWithCoreApi } from '@mysten/sui/client';

import {
	TransferPolicyCap as TransferPolicyCapStruct,
	TransferPolicy as TransferPolicyStruct,
} from '../contracts/0x2/transfer_policy.js';
import type { TransferPolicy, TransferPolicyCap } from '../types/index.js';
import {
	TRANSFER_POLICY_CAP_TYPE,
	TRANSFER_POLICY_CREATED_EVENT,
	TRANSFER_POLICY_TYPE,
} from '../types/index.js';
import { queryEvents } from './client-utils.js';

/**
 * Searches the `TransferPolicy`-s for the given type. The search is performed via
 * the `TransferPolicyCreated` event. The policy can either be owned or shared,
 * and the caller needs to filter the results accordingly (ie single owner can not
 * be accessed by anyone but the owner).
 *
 * This method requires event querying support (JSON-RPC or GraphQL clients).
 * gRPC clients do not support event querying and will throw an error.
 *
 * @param client - The Sui client (must support event querying)
 * @param type - The type of the asset (e.g., "0x123::nft::NFT")
 * @throws Error if the client doesn't support event querying
 */
export async function queryTransferPolicy(
	client: ClientWithCoreApi,
	type: string,
): Promise<TransferPolicy[]> {
	const data = await queryEvents(client, `${TRANSFER_POLICY_CREATED_EVENT}<${type}>`);

	const search = data.map((event) => event.json as { id: string });

	const { objects } = await client.core.getObjects({
		objectIds: search.map((policy: { id: string }) => policy.id),
		include: { content: true },
	});

	return objects
		.filter((obj) => !(obj instanceof Error) && obj.content)
		.map((obj) => {
			if (obj instanceof Error) {
				throw obj;
			}

			if (!obj.content) {
				throw new Error(`Invalid policy: ${obj.objectId}, expected object with content`);
			}

			const parsed = TransferPolicyStruct.parse(obj.content);

			return {
				id: obj.objectId,
				type: `${TRANSFER_POLICY_TYPE}<${type}>`,
				owner: obj.owner,
				rules: parsed.rules.contents.map((rule) => rule.name),
				balance: parsed.balance.value.toString(),
			} as TransferPolicy;
		});
}

/**
 * Fetches all TransferPolicyCap objects owned by an address for a specific type.
 *
 * @param client - The Sui client
 * @param address - The owner address
 * @param type - The type of the asset
 * @returns Array of TransferPolicyCap objects
 */
export async function queryTransferPolicyCapsByType(
	client: ClientWithCoreApi,
	address: string,
	type: string,
): Promise<TransferPolicyCap[]> {
	if (!isValidSuiAddress(address)) return [];

	const policies = [];
	let hasNextPage = true;
	let cursor: string | null = null;

	while (hasNextPage) {
		const result: Awaited<ReturnType<typeof client.core.listOwnedObjects>> =
			await client.core.listOwnedObjects({
				owner: address,
				type: `${TRANSFER_POLICY_CAP_TYPE}<${type}>`,
				cursor,
				limit: 50,
				include: {
					content: true,
				},
			});

		for (const obj of result.objects) {
			if (obj.content) {
				policies.push({
					policyId: TransferPolicyCapStruct.parse(obj.content).policy_id,
					policyCapId: obj.objectId,
					type,
				});
			}
		}

		hasNextPage = result.hasNextPage;
		cursor = result.cursor;
	}

	return policies;
}

/**
 * Fetches all TransferPolicyCap objects owned by an address (all types).
 *
 * Uses struct-level filtering (without type parameters) to efficiently query
 * only TransferPolicyCap objects. This matches all generic instantiations
 * (e.g., TransferPolicyCap<T> for any T) and is supported natively by all clients.
 *
 * @param client - The Sui client
 * @param address - The owner address
 * @returns Array of TransferPolicyCap objects or undefined if address is invalid
 */
export async function queryOwnedTransferPolicies(
	client: ClientWithCoreApi,
	address: string,
): Promise<TransferPolicyCap[] | undefined> {
	if (!isValidSuiAddress(address)) return;

	let hasNextPage = true;
	let cursor: string | null = null;
	const policies: TransferPolicyCap[] = [];

	while (hasNextPage) {
		const result: Awaited<ReturnType<typeof client.core.listOwnedObjects>> =
			await client.core.listOwnedObjects({
				owner: address,
				type: TRANSFER_POLICY_CAP_TYPE,
				cursor,
				limit: 50,
				include: {
					content: true,
				},
			});

		// All results are TransferPolicyCap objects, extract the type parameter
		for (const obj of result.objects) {
			if (obj.content) {
				// Extract the type parameter T from "0x2::transfer_policy::TransferPolicyCap<T>"
				const objectType = obj.type!.replace(`${TRANSFER_POLICY_CAP_TYPE}<`, '').slice(0, -1);

				policies.push({
					policyId: TransferPolicyCapStruct.parse(obj.content).policy_id,
					policyCapId: obj.objectId,
					type: objectType,
				});
			}
		}

		hasNextPage = result.hasNextPage;
		cursor = result.cursor;
	}

	return policies;
}
