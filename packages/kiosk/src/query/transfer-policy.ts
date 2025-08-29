// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidSuiAddress } from '@mysten/sui/utils';

import '../bcs.js';

import { TransferPolicyType } from '../bcs.js';
import type { TransferPolicy, TransferPolicyCap } from '../types/index.js';
import {
	TRANSFER_POLICY_CAP_TYPE,
	TRANSFER_POLICY_CREATED_EVENT,
	TRANSFER_POLICY_TYPE,
} from '../types/index.js';
import { getAllOwnedObjects, parseTransferPolicyCapObject } from '../utils.js';
import type { ClientWithCoreApi, Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { SuiClient } from '@mysten/sui/client';

/**
 * Searches the `TransferPolicy`-s for the given type. The search is performed via
 * the `TransferPolicyCreated` event. The policy can either be owned or shared,
 * and the caller needs to filter the results accordingly (ie single owner can not
 * be accessed by anyone but the owner).
 *
 * @param provider
 * @param type
 */
export async function queryTransferPolicy(
	client: ClientWithCoreApi,
	type: string,
): Promise<TransferPolicy[]> {
	// console.log('event type: %s', `${TRANSFER_POLICY_CREATED_EVENT}<${type}>`);
	// TOD0: implement queryEvents
	const { data } = await (client as SuiClient).queryEvents({
		query: {
			MoveEventType: `${TRANSFER_POLICY_CREATED_EVENT}<${type}>`,
		},
	});

	const search = data.map((event) => event.parsedJson as { id: string });
	const policies = await client.core.getObjects({
		objectIds: search.map((policy) => policy.id),
	});

	return policies.objects
		.filter(
			(result): result is Experimental_SuiClientTypes.ObjectResponse => !(result instanceof Error),
		)
		.map((policy) => {
			const parsed = TransferPolicyType.parse(policy.content);

			return {
				id: policy?.id,
				type: `${TRANSFER_POLICY_TYPE}<${type}>`,
				owner: policy?.owner!,
				rules: parsed.rules,
				balance: parsed.balance,
			} as TransferPolicy;
		});
}

/**
 * A function to fetch all the user's kiosk Caps
 * And a list of the kiosk address ids.
 * Returns a list of `kioskOwnerCapIds` and `kioskIds`.
 * Extra options allow pagination.
 * @returns TransferPolicyCap Object ID | undefined if not found.
 */
export async function queryTransferPolicyCapsByType(
	client: ClientWithCoreApi,
	address: string,
	type: string,
): Promise<TransferPolicyCap[]> {
	if (!isValidSuiAddress(address)) return [];

	// fetch owned kiosk caps, paginated.
	const data = await getAllOwnedObjects({
		client,
		type: `${TRANSFER_POLICY_CAP_TYPE}<${type}>`,
		owner: address,
	});

	return data
		.map((item) => parseTransferPolicyCapObject(item))
		.filter((item) => !!item) as TransferPolicyCap[];
}

/**
 * A function to fetch all the user's kiosk Caps
 * And a list of the kiosk address ids.
 * Returns a list of `kioskOwnerCapIds` and `kioskIds`.
 * Extra options allow pagination.
 * @returns TransferPolicyCap Object ID | undefined if not found.
 */
export async function queryOwnedTransferPolicies(
	client: ClientWithCoreApi,
	address: string,
): Promise<TransferPolicyCap[] | undefined> {
	if (!isValidSuiAddress(address)) return;

	// fetch all owned kiosk caps, paginated.
	const data = await getAllOwnedObjects({
		client,
		owner: address,
		// TODO: ensure this works across APIs without a fully resolved type?
		type: '0x2::transfer_policy',
	});

	const policies: TransferPolicyCap[] = [];

	for (const item of data) {
		const data = parseTransferPolicyCapObject(item);
		if (data) policies.push(data);
	}

	return policies;
}
