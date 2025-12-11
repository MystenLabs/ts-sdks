// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PaginationArguments } from '@mysten/sui/jsonRpc';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { isValidSuiAddress } from '@mysten/sui/utils';

import { Extension, ExtensionKey } from '../contracts/0x2/kiosk_extension.js';
import type {
	FetchKioskOptions,
	KioskExtension,
	KioskListing,
	OwnedKiosks,
	PagedKioskData,
} from '../types/index.js';
import { KIOSK_OWNER_CAP } from '../types/index.js';
import {
	attachListingsAndPrices,
	attachLockedItems,
	attachObjects,
	extractKioskData,
	getAllDynamicFields,
	getAllObjects,
	getKioskObject,
} from '../utils.js';
import { PersonalKioskCap } from '../contracts/kiosk/personal_kiosk.js';

export async function fetchKiosk(
	client: ClientWithCoreApi,
	kioskId: string,
	pagination: PaginationArguments<string>,
	options: FetchKioskOptions,
): Promise<PagedKioskData> {
	// TODO: Replace the `getAllDynamicFields` with a paginated
	// response, once we have better RPC support for
	// type filtering & batch fetching.
	// This can't work with pagination currently.
	const data = await getAllDynamicFields(client, kioskId, pagination);

	const listings: KioskListing[] = [];
	const lockedItemIds: string[] = [];

	// extracted kiosk data.
	const kioskData = extractKioskData(data, listings, lockedItemIds, kioskId);

	// split the fetching in two queries as we are most likely passing different options for each kind.
	// For items, we usually seek the Display.
	// For listings we usually seek the DF value (price) / exclusivity.
	const [kiosk, listingObjects, items] = await Promise.all([
		options.withKioskFields ? getKioskObject(client, kioskId) : Promise.resolve(undefined),
		options.withListingPrices ? getAllObjects(client, kioskData.listingIds) : Promise.resolve([]),
		options.withObjects ? getAllObjects(client, kioskData.itemIds) : Promise.resolve([]),
	]);

	if (options.withKioskFields) kioskData.kiosk = kiosk;
	// attach items listings. IF we have `options.withListingPrices === true`, it will also attach the prices.
	attachListingsAndPrices(kioskData, listings, listingObjects);
	// add `locked` status to items that are locked.
	attachLockedItems(kioskData, lockedItemIds);

	// Attach the objects for the queried items.
	attachObjects(kioskData, items);

	return {
		data: kioskData,
		nextCursor: null,
		hasNextPage: false,
	};
}

/**
 * A function to fetch all the user's kiosk Caps
 * And a list of the kiosk address ids.
 * Returns a list of `kioskOwnerCapIds` and `kioskIds`.
 * Extra options allow pagination.
 */

const DEFAULT_PAGE_SIZE = 50;
const PERSON_KIOSK_CURSOR = 'personal';
const OWNED_KIOSKS_CURSOR = 'owned';
export async function getOwnedKiosks(
	client: ClientWithCoreApi,
	address: string,
	options?: {
		pagination?: PaginationArguments<string>;
		personalKioskType: string;
	},
): Promise<OwnedKiosks> {
	// TODO: this should throw an error, but I am not going to change it right now incase it breaks existing code.
	if (!isValidSuiAddress(address)) {
		return {
			nextCursor: null,
			hasNextPage: false,
			kioskOwnerCaps: [],
			kioskIds: [],
		};
	}

	const limit = options?.pagination?.limit ?? DEFAULT_PAGE_SIZE;
	const [cursorType, cursor] = options?.pagination?.cursor?.split(':') ?? [
		PERSON_KIOSK_CURSOR,
		null,
	];

	if (options?.personalKioskType && cursorType === PERSON_KIOSK_CURSOR) {
		const personalResult = await client.core.listOwnedObjects({
			owner: address,
			type: options.personalKioskType,
			cursor,
			limit,
			include: {
				content: true,
			},
		});

		const personalKioskData = personalResult.objects
			.filter((obj) => !(obj instanceof Error))
			.map((obj) => {
				return { obj, kioskId: PersonalKioskCap.parse(obj.content).cap?.for };
			})
			.filter(
				(
					item,
				): item is {
					obj: SuiClientTypes.Object<{ content: true }>;
					kioskId: string;
				} => item.kioskId !== undefined,
			);

		const personalKioskResponse = formatOwnedKioskResponse(
			{
				data: personalKioskData,
				hasNextPage: personalResult.hasNextPage,
				nextCursor: personalResult.cursor,
			},
			PERSON_KIOSK_CURSOR,
		);

		if (personalKioskResponse.hasNextPage) {
			return personalKioskResponse;
		}

		const remainingLimit = limit - personalKioskResponse.kioskOwnerCaps.length;

		// If we have all personal kiosks, but don't have space for the owned kiosks
		// we need to start loading owned kiosks for the next page, but don't have a real cursor
		if (remainingLimit < 1) {
			return {
				nextCursor: `${OWNED_KIOSKS_CURSOR}:`,
				hasNextPage: true,
				kioskOwnerCaps: personalKioskResponse.kioskOwnerCaps,
				kioskIds: personalKioskResponse.kioskIds,
			};
		}

		const ownedResult = await client.core.listOwnedObjects({
			owner: address,
			type: KIOSK_OWNER_CAP,
			cursor: null,
			limit: remainingLimit,
			include: {
				content: true,
			},
		});

		const { KioskOwnerCap: KioskOwnerCapParser } = await import('../contracts/0x2/kiosk.js');

		const ownedKioskData = ownedResult.objects
			.filter((obj) => !(obj instanceof Error))
			.map((obj) => {
				return { obj, kioskId: KioskOwnerCapParser.parse(obj.content).for };
			})
			.filter(
				(
					item,
				): item is {
					obj: SuiClientTypes.Object<{ content: true }>;
					kioskId: string;
				} => item.kioskId !== undefined,
			);

		const ownedKiosksResponse = formatOwnedKioskResponse(
			{
				data: ownedKioskData,
				hasNextPage: ownedResult.hasNextPage,
				nextCursor: ownedResult.cursor,
			},
			OWNED_KIOSKS_CURSOR,
		);

		return {
			nextCursor: ownedKiosksResponse.nextCursor,
			hasNextPage: ownedKiosksResponse.hasNextPage,
			kioskOwnerCaps: [
				...personalKioskResponse.kioskOwnerCaps,
				...ownedKiosksResponse.kioskOwnerCaps,
			],
			kioskIds: [...personalKioskResponse.kioskIds, ...ownedKiosksResponse.kioskIds],
		};
	}

	const result = await client.core.listOwnedObjects({
		owner: address,
		type: KIOSK_OWNER_CAP,
		cursor: cursor || null,
		limit,
		include: {
			content: true,
		},
	});

	const { KioskOwnerCap: KioskOwnerCapParser } = await import('../contracts/0x2/kiosk.js');

	const ownedKioskData = result.objects
		.filter((obj) => !(obj instanceof Error))
		.map((obj) => {
			return { obj, kioskId: KioskOwnerCapParser.parse(obj.content).for };
		})
		.filter(
			(
				item,
			): item is {
				obj: SuiClientTypes.Object<{ content: true }>;
				kioskId: string;
			} => item.kioskId !== undefined,
		);

	return formatOwnedKioskResponse(
		{
			data: ownedKioskData,
			hasNextPage: result.hasNextPage,
			nextCursor: result.cursor,
		},
		OWNED_KIOSKS_CURSOR,
	);
}

function formatOwnedKioskResponse(
	response: {
		data: {
			obj: SuiClientTypes.Object<{ content: true }>;
			kioskId: string;
		}[];
		hasNextPage: boolean;
		nextCursor: string | null;
	},
	cursorType: string,
): OwnedKiosks {
	const { data, hasNextPage, nextCursor } = response;

	return {
		nextCursor: nextCursor ? `${cursorType}:${nextCursor}` : nextCursor,
		hasNextPage,
		kioskOwnerCaps: data.map((item) => {
			const isPersonal = item.obj.type?.includes('PersonalKioskCap') || false;
			return {
				isPersonal,
				digest: item.obj.digest,
				version: item.obj.version,
				objectId: item.obj.objectId,
				kioskId: item.kioskId,
			};
		}),
		kioskIds: data.map((item) => item.kioskId),
	};
}

// Get a kiosk extension data for a given kioskId and extensionType.
export async function fetchKioskExtension(
	client: ClientWithCoreApi,
	kioskId: string,
	extensionType: string,
): Promise<KioskExtension | null> {
	try {
		const { dynamicField } = await client.core.getDynamicField({
			parentId: kioskId,
			name: {
				type: `0x2::kiosk_extension::ExtensionKey<${extensionType}>`,
				bcs: ExtensionKey.serialize({ dummy_field: false }).toBytes(),
			},
		});

		// Parse BCS to get the Extension struct from the dynamic field value
		const extension = Extension.parse(dynamicField.value.bcs);

		return {
			objectId: dynamicField.fieldId,
			type: extensionType,
			isEnabled: extension.is_enabled,
			permissions: extension.permissions.toString(),
			storageId: extension.storage.id.id,
			storageSize: Number(extension.storage.size),
		};
	} catch {
		return null;
	}
}
