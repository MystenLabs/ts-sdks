// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { PaginationArguments } from '@mysten/sui/jsonRpc';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag, normalizeSuiAddress, parseStructTag } from '@mysten/sui/utils';

import { Item, Listing, Lock, Kiosk as KioskStruct } from './contracts/0x2/kiosk.js';
import type { Kiosk, KioskData, KioskListing, ObjectWithDisplay } from './types/index.js';

export type DynamicFieldInfo = SuiClientTypes.ListDynamicFieldsResponse['dynamicFields'][number];

export async function getKioskObject(client: ClientWithCoreApi, id: string): Promise<Kiosk> {
	const { object } = await client.core.getObject({
		objectId: id,
		include: { content: true },
	});

	if (!object.content) {
		throw new Error(`Kiosk ${id} not found or has no content`);
	}

	const parsed = KioskStruct.parse(object.content);

	return {
		id: parsed.id,
		profits: parsed.profits.value.toString(),
		owner: parsed.owner,
		itemCount: parsed.item_count,
		allowExtensions: parsed.allow_extensions,
	};
}

// helper to extract kiosk data from dynamic fields.
export function extractKioskData(
	data: DynamicFieldInfo[],
	listings: KioskListing[],
	lockedItemIds: string[],
	kioskId: string,
): KioskData {
	return data.reduce<KioskData>(
		(acc: KioskData, val: DynamicFieldInfo) => {
			const type = val.name.type;

			const parsedType = parseStructTag(type);
			const baseType = `${normalizeSuiAddress(parsedType.address)}::${parsedType.module}::${parsedType.name}`;

			if (
				baseType ===
				'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Item'
			) {
				const parsed = Item.parse(val.name.bcs);
				acc.itemIds.push(parsed.id);
				acc.items.push({
					objectId: parsed.id,
					type: val.valueType,
					isLocked: false,
					kioskId,
				});
			}

			if (
				baseType ===
				'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Listing'
			) {
				const parsed = Listing.parse(val.name.bcs);

				acc.listingIds.push(val.fieldId);
				listings.push({
					objectId: parsed.id,
					listingId: val.fieldId,
					isExclusive: parsed.is_exclusive,
				});
			}

			if (
				baseType ===
				'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Lock'
			) {
				lockedItemIds?.push(Lock.parse(val.name.bcs).id);
			}

			// Check for ExtensionKey type
			if (
				baseType ===
				'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk_extension::ExtensionKey'
			) {
				acc.extensions.push({
					objectId: val.fieldId,
					type: normalizeStructTag(parsedType.typeParams[0]),
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
	listingObjects: SuiClientTypes.Object[],
) {
	const itemListings = listings.reduce<Record<string, KioskListing>>(
		(acc: Record<string, KioskListing>, item, idx) => {
			acc[item.objectId] = { ...item };

			// return in case we don't have any listing objects.
			// that's the case when we don't have the `listingPrices` included.
			if (listingObjects.length === 0) return acc;

			const obj = listingObjects[idx];

			// Parse BCS content to extract the price (u64 value)
			if (obj.content) {
				acc[item.objectId].price = bcs.u64().parse(obj.content).toString();
			}

			return acc;
		},
		{},
	);

	kioskData.items.forEach((item) => {
		item.listing = itemListings[item.objectId] || undefined;
	});
}

/**
 * A helper that attaches object data to kiosk items.
 * Works with core API objects that contain BCS content.
 */
export function attachObjects(kioskData: KioskData, objects: ObjectWithDisplay[]) {
	const mapping = objects.reduce<Record<string, ObjectWithDisplay>>(
		(acc: Record<string, ObjectWithDisplay>, obj) => {
			acc[obj.objectId] = obj;
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
 * A helper to fetch all dynamic field pages.
 * We need that to fetch the kiosk DFs consistently, until we have
 * RPC calls that allow filtering of Type / batch fetching of spec
 */
export async function getAllDynamicFields(
	client: ClientWithCoreApi,
	parentId: string,
	pagination: PaginationArguments<string>,
): Promise<DynamicFieldInfo[]> {
	let hasNextPage = true;
	let cursor: string | null = null;
	const data: DynamicFieldInfo[] = [];

	while (hasNextPage) {
		const result = await client.core.listDynamicFields({
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

// Normalizes the packageId part of a rule's type.
export function getNormalizedRuleType(rule: string) {
	const normalizedRuleAddress = rule.split('::');
	normalizedRuleAddress[0] = normalizeSuiAddress(normalizedRuleAddress[0]);
	return normalizedRuleAddress.join('::');
}
