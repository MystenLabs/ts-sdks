// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useSuiClient } from '@mysten/dapp-kit-react';
import { useEffect, useState } from 'react';
import type { SuiObjectResponse } from '@mysten/sui/client';

export interface OwnedObject {
	objectId: string;
	type: string;
	version: string;
	digest: string;
	display?: {
		name?: string;
		description?: string;
		image_url?: string;
	};
}

export function useOwnedObjects(address?: string) {
	const suiClient = useSuiClient();
	const [objects, setObjects] = useState<OwnedObject[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchOwnedObjects() {
			if (!address) {
				setObjects([]);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				// Get all owned objects
				const response = await suiClient.getOwnedObjects({
					owner: address,
					options: {
						showType: true,
						showContent: true,
						showDisplay: true,
					},
				});

				const ownedObjects: OwnedObject[] = response.data
					.filter(
						(obj): obj is SuiObjectResponse & { data: NonNullable<SuiObjectResponse['data']> } =>
							obj.data !== null,
					)
					.filter((obj) => {
						// Filter out coins by checking if the type contains "coin::Coin"
						const type = obj.data.type!;
						return !type.includes('::coin::Coin');
					})
					.map((obj) => ({
						objectId: obj.data.objectId,
						type: obj.data.type!,
						version: obj.data.version,
						digest: obj.data.digest,
						display: obj.data.display?.data as OwnedObject['display'],
					}));

				setObjects(ownedObjects);
			} catch (err) {
				console.error('Error fetching owned objects:', err);
				setError(err instanceof Error ? err.message : 'Failed to fetch objects');
			} finally {
				setLoading(false);
			}
		}

		fetchOwnedObjects();
	}, [address, suiClient]);

	return { objects, loading, error };
}
