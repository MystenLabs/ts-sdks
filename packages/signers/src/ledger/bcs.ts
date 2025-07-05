// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, TypeTagSerializer } from '@mysten/sui/bcs';
import type { ObjectOwner } from '@mysten/sui/client';
import {
	fromBase64,
	normalizeStructTag,
	normalizeSuiAddress,
	parseStructTag,
} from '@mysten/sui/utils';

const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2');
const SUI_SYSTEM_ADDRESS = normalizeSuiAddress('0x3');

const MoveObjectType = bcs.enum('MoveObjectType', {
	Other: bcs.StructTag,
	GasCoin: null,
	StakedSui: null,
	Coin: bcs.TypeTag,
});

export const SuiMoveObject = bcs.struct('SuiMoveObject', {
	data: bcs.enum('Data', {
		MoveObject: bcs.struct('MoveObject', {
			type: MoveObjectType.transform({
				input: (objectType: string): typeof MoveObjectType.$inferType => {
					const structTag = parseStructTag(objectType);

					if (
						structTag.address === SUI_FRAMEWORK_ADDRESS &&
						structTag.module === 'coin' &&
						structTag.name === 'Coin' &&
						typeof structTag.typeParams[0] === 'object'
					) {
						const innerStructTag = structTag.typeParams[0];
						if (
							innerStructTag.address === SUI_FRAMEWORK_ADDRESS &&
							innerStructTag.module === 'sui' &&
							innerStructTag.name === 'SUI'
						) {
							return { GasCoin: true, $kind: 'GasCoin' };
						}
						return { Coin: normalizeStructTag(innerStructTag), $kind: 'Coin' };
					} else if (
						structTag.address === SUI_SYSTEM_ADDRESS &&
						structTag.module === 'staking_pool' &&
						structTag.name === 'StakedSui'
					) {
						return { StakedSui: true, $kind: 'StakedSui' };
					}
					return {
						Other: {
							...structTag,
							typeParams: structTag.typeParams.map((typeParam) => {
								return TypeTagSerializer.parseFromStr(normalizeStructTag(typeParam));
							}),
						},
						$kind: 'Other',
					};
				},
			}),
			hasPublicTransfer: bcs.bool(),
			version: bcs.u64(),
			contents: bcs.byteVector().transform({ input: fromBase64 }),
		}),
	}),
	owner: bcs.Owner.transform({
		input: (objectOwner: ObjectOwner) => {
			if (objectOwner === 'Immutable') {
				return { Immutable: null };
			} else if ('Shared' in objectOwner) {
				return { Shared: { initialSharedVersion: objectOwner.Shared.initial_shared_version } };
			} else if ('ConsensusAddressOwner' in objectOwner) {
				return {
					ConsensusAddressOwner: {
						owner: objectOwner.ConsensusAddressOwner.owner,
						startVersion: objectOwner.ConsensusAddressOwner.start_version,
					},
				};
			}
			return objectOwner;
		},
	}),
	previousTransaction: bcs.ObjectDigest,
	storageRebate: bcs.u64(),
});
