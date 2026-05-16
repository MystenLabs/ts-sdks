// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import type { ClientWithCoreApi } from '@mysten/sui/client';

export const getInputObjects = async (transaction: Transaction, client: ClientWithCoreApi) => {
	const data = transaction.getData();

	const gasObjectIds = data.gasData.payment?.map((object) => object.objectId) ?? [];
	const inputObjectIds = data.inputs
		.map((input) => {
			return input.$kind === 'Object' && input.Object.$kind === 'ImmOrOwnedObject'
				? input.Object.ImmOrOwnedObject.objectId
				: null;
		})
		.filter((objectId): objectId is string => !!objectId);

	const response = await client.core.getObjects({
		objectIds: [...gasObjectIds, ...inputObjectIds],
		include: {
			objectBcs: true,
		},
	});

	const bcsObjects = response.objects
		.filter((obj): obj is Exclude<typeof obj, Error> => !(obj instanceof Error))
		.map((object) => object.objectBcs)
		.filter((bytes): bytes is Uint8Array<ArrayBuffer> => !!bytes);

	return { bcsObjects };
};
