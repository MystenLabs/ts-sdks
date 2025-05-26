// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PaginationArguments, SuiObjectData } from '@mysten/sui/client';
import { isValidSuiAddress } from '@mysten/sui/utils';

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
	getKioskObject,
} from '../utils.js';
import type { ClientWithCoreApi, Experimental_SuiClientTypes } from '@mysten/sui/experimental';

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
		options.withListingPrices
			? client.core
					.getObjects({
						objectIds: kioskData.listingIds,
					})
					.then((res) => res.objects)
			: Promise.resolve([]),
		options.withObjects
			? client.core
					.getObjects({
						objectIds: kioskData.itemIds,
					})
					.then((res) => res.objects)
			: Promise.resolve([]),
	]);

	if (options.withKioskFields) kioskData.kiosk = kiosk;
	// attach items listings. IF we have `options.withListingPrices === true`, it will also attach the prices.
	attachListingsAndPrices(kioskData, listings, listingObjects);
	// add `locked` status to items that are locked.
	attachLockedItems(kioskData, lockedItemIds);

	// Attach the objects for the queried items.
	attachObjects(
		kioskData,
		items.filter((x): x is Experimental_SuiClientTypes.ObjectResponse => !(x instanceof Error)),
	);

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
		const personalKioskResponse = formatOwnedKioskResponse(
			await client.core.getOwnedObjects({
				address,
				type: options.personalKioskType,
				cursor,
				limit,
			}),
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

		const ownedKiosksResponse = formatOwnedKioskResponse(
			await client.core.getOwnedObjects({
				address,
				type: KIOSK_OWNER_CAP,
				cursor: PERSON_KIOSK_CURSOR,
				limit: remainingLimit,
			}),
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

	return formatOwnedKioskResponse(
		await client.core.getOwnedObjects({
			address,
			type: KIOSK_OWNER_CAP,
			cursor: cursor ? cursor : null,
			limit,
		}),
		OWNED_KIOSKS_CURSOR,
	);
}

function formatOwnedKioskResponse(
	response: Experimental_SuiClientTypes.GetOwnedObjectsResponse,
	cursorType: string,
): OwnedKiosks {
	const { objects, hasNextPage, cursor } = response;
	// get kioskIds from the OwnerCaps.
	const kioskIdList = objects?.map((x) => {
		// TODO fix parsing
		const fields = x.data.content.fields as unknown as
			| {
					cap: { fields: { for: string } };
					for?: never;
			  }
			| {
					cap?: never;
					for: string;
			  };

		return fields?.cap ? fields?.cap?.fields?.for : (fields?.for as string);
	});

	// clean up data that might have an error in them.
	// only return valid objects.
	const filteredData = objects.filter((x) => 'data' in x).map((x) => x.data) as SuiObjectData[];

	return {
		nextCursor: cursor ? `${cursorType}:${cursor}` : cursor,
		hasNextPage,
		kioskOwnerCaps: filteredData.map((x, idx) => ({
			isPersonal: x.type !== KIOSK_OWNER_CAP,
			digest: x.digest,
			version: x.version,
			objectId: x.objectId,
			kioskId: kioskIdList[idx],
		})),
		kioskIds: kioskIdList,
	};
}

// Get a kiosk extension data for a given kioskId and extensionType.
export async function fetchKioskExtension(
	client: ClientWithCoreApi,
	kioskId: string,
	extensionType: string,
): Promise<KioskExtension | null> {
	const extension = await client.core.getDynamicField({
		parentId: kioskId,
		name: {
			type: `0x2::kiosk_extension::ExtensionKey<${extensionType}>`,
			bcs: new Uint8Array(),
		},
	});

	// TODO: can this be missing?
	if (!extension.dynamicField) return null;

	// TODO: parse data
	const fields = (extension?.data?.content as { fields: { [k: string]: any } })?.fields?.value
		?.fields;

	return {
		objectId: extension.data.objectId,
		type: extensionType,
		isEnabled: fields?.is_enabled,
		permissions: fields?.permissions,
		storageId: fields?.storage?.fields?.id?.id,
		storageSize: fields?.storage?.fields?.size,
	};
}
