// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PaginationArguments } from '@mysten/sui/client';
import { normalizeStructTag, normalizeSuiAddress, parseStructTag } from '@mysten/sui/utils';

import {
	Field,
	KioskType,
	Listing,
	Lock,
	TransferPolicyCap as TransferPolicyCapType,
} from './bcs.js';
import type { Kiosk, KioskData, KioskListing, TransferPolicyCap } from './types/index.js';
import { TRANSFER_POLICY_CAP_TYPE } from './types/index.js';
import type { ClientWithCoreApi, Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { bcs } from '@mysten/sui/bcs';

const DEFAULT_QUERY_LIMIT = 50;

export async function getKioskObject(client: ClientWithCoreApi, id: string): Promise<Kiosk> {
	const queryRes = await client.core.getObjects({ objectIds: [id] });

	const object = queryRes.objects[0];

	if (!object || object instanceof Error) {
		throw new Error(`Kiosk ${id} not found`);
	}

	return KioskType.parse(object.content);
}

// helper to extract kiosk data from dynamic fields.
export function extractKioskData(
	data: Experimental_SuiClientTypes.GetDynamicFieldsResponse['dynamicFields'],
	listings: KioskListing[],
	lockedItemIds: string[],
	kioskId: string,
): KioskData {
	return data.reduce<KioskData>(
		(acc, val) => {
			const type = val.name.type;

			if (type.startsWith('0x2::kiosk::Item')) {
				acc.itemIds.push(val.id);
				acc.items.push({
					objectId: val.id,
					type: val.type,
					isLocked: false,
					kioskId,
				});
			}
			if (type.startsWith('0x2::kiosk::Listing')) {
				// TODO parse bcs
				acc.listingIds.push(val.id);

				const listing = Listing.parse(val.name.bcs);
				listings.push({
					objectId: listing.id,
					listingId: val.id,
					isExclusive: listing.isExclusive,
				});
			}
			if (type.startsWith('0x2::kiosk::Lock')) {
				lockedItemIds?.push(Lock.parse(val.name.bcs).id);
			}

			if (type.startsWith('0x2::kiosk_extension::ExtensionKey')) {
				acc.extensions.push({
					objectId: val.id,
					type: normalizeStructTag(parseStructTag(val.type).typeParams[0]),
				});
			}

			return acc;
		},
		{ items: [], itemIds: [], listingIds: [], extensions: [] },
	);
}

/**
 * A helper that attaches the listing prices to kiosk listings.
 */
export function attachListingsAndPrices(
	kioskData: KioskData,
	listings: KioskListing[],
	listingObjects: Experimental_SuiClientTypes.GetObjectsResponse['objects'],
) {
	// map item listings as {item_id: KioskListing}
	// for easier mapping on the nex
	const itemListings = listings.reduce<Record<string, KioskListing>>(
		(acc: Record<string, KioskListing>, item, idx) => {
			acc[item.objectId] = { ...item };

			// return in case we don't have any listing objects.
			// that's the case when we don't have the `listingPrices` included.
			if (listingObjects.length === 0) return acc;

			const object = listingObjects[idx];
			const content = object instanceof Error ? null : object.content;

			if (!content) return acc;

			const parsed = Field(Listing, bcs.u64()).parse(content);

			acc[item.objectId].price = parsed.value;
			return acc;
		},
		{},
	);

	kioskData.items.forEach((item) => {
		item.listing = itemListings[item.objectId] || undefined;
	});
}

/**
 * A helper that attaches the listing prices to kiosk listings.
 */
export function attachObjects(
	kioskData: KioskData,
	objects: Experimental_SuiClientTypes.ObjectResponse[],
) {
	const mapping = objects.reduce<Record<string, Experimental_SuiClientTypes.ObjectResponse>>(
		(acc, obj) => {
			acc[obj.id] = obj;
			return acc;
		},
		{},
	);

	kioskData.items.forEach((item) => {
		item.data = mapping[item.objectId] || undefined;
	});
}

/**
 * A Helper to attach locked state to items in Kiosk Data.
 */
export function attachLockedItems(kioskData: KioskData, lockedItemIds: string[]) {
	// map lock status in an array of type { item_id: true }
	const lockedStatuses = lockedItemIds.reduce<Record<string, boolean>>(
		(acc: Record<string, boolean>, item: string) => {
			acc[item] = true;
			return acc;
		},
		{},
	);

	// parse lockedItemIds and attach their locked status.
	kioskData.items.forEach((item) => {
		item.isLocked = lockedStatuses[item.objectId] || false;
	});
}

/**
 * A helper to fetch all DF pages.
 * We need that to fetch the kiosk DFs consistently, until we have
 * RPC calls that allow filtering of Type / batch fetching of spec
 */
export async function getAllDynamicFields(
	client: ClientWithCoreApi,
	parentId: string,
	pagination: PaginationArguments<string>,
) {
	let hasNextPage = true;
	let cursor = undefined;
	const data: Experimental_SuiClientTypes.GetDynamicFieldsResponse['dynamicFields'] = [];

	while (hasNextPage) {
		const result = await client.core.getDynamicFields({
			parentId,
			limit: pagination.limit || undefined,
			cursor,
		});
		data.push(...result.dynamicFields);
		hasNextPage = result.hasNextPage;
		cursor = result.cursor;
	}

	return data;
}

/**
 * A helper to return all owned objects, with an optional filter.
 * It parses all the pages and returns the data.
 */
export async function getAllOwnedObjects({
	client,
	owner,
	type,
	limit = DEFAULT_QUERY_LIMIT,
}: {
	client: ClientWithCoreApi;
	owner: string;
	type?: string;
	limit?: number;
}) {
	let hasNextPage = true;
	let cursor = undefined;
	const data: Experimental_SuiClientTypes.ObjectResponse[] = [];

	while (hasNextPage) {
		const result = await client.core.getOwnedObjects({
			address: owner,
			type,
			limit,
			cursor,
		});
		data.push(...result.objects);
		hasNextPage = result.hasNextPage;
		cursor = result.cursor;
	}

	return data;
}

/**
 * Converts a number to basis points.
 * Supports up to 2 decimal points.
 * E.g 9.95 -> 995
 * @param percentage A percentage amount in the range [0, 100] including decimals.
 */
export function percentageToBasisPoints(percentage: number) {
	if (percentage < 0 || percentage > 100)
		throw new Error('Percentage needs to be in the [0,100] range.');
	return Math.ceil(percentage * 100);
}

/**
 * A helper to parse a transfer policy Cap into a usable object.
 */
export function parseTransferPolicyCapObject(
	item: Experimental_SuiClientTypes.ObjectResponse,
): TransferPolicyCap | undefined {
	if (!item.type.includes(TRANSFER_POLICY_CAP_TYPE)) return undefined;

	const { policyId } = TransferPolicyCapType.parse(item.content);

	// Transform 0x2::transfer_policy::TransferPolicyCap<itemType> -> itemType
	const objectType = item.type.replace(TRANSFER_POLICY_CAP_TYPE + '<', '').slice(0, -1);

	return {
		policyId,
		policyCapId: item.id,
		type: objectType,
	};
}

// Normalizes the packageId part of a rule's type.
export function getNormalizedRuleType(rule: string) {
	const normalizedRuleAddress = rule.split('::');
	normalizedRuleAddress[0] = normalizeSuiAddress(normalizedRuleAddress[0]);
	return normalizedRuleAddress.join('::');
}
