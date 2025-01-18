// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';
import { pureBcsSchemaFromTypeName } from '@mysten/sui/bcs';
import type { PureTypeName, ShapeFromPureTypeName } from '@mysten/sui/bcs';
import type { SuiClient, SuiObjectData, SuiObjectResponse } from '@mysten/sui/client';
import { deriveDynamicFieldID } from '@mysten/sui/utils';
import DataLoader from 'dataloader';

import { Field } from '../contracts/deps/0x0000000000000000000000000000000000000000000000000000000000000002/dynamic_field.js';

export class SuiObjectDataLoader extends DataLoader<string, SuiObjectData> {
	#suiClient: SuiClient;
	#dynamicFieldCache = new Map<string, Map<string, SuiObjectData>>();
	constructor(suiClient: SuiClient) {
		super(
			async (ids: readonly string[]) => {
				const objects = await suiClient.multiGetObjects({
					ids: ids as string[],
					options: {
						showBcs: true,
						showContent: true,
					},
				});

				return objects.map((object, i) => {
					return this.#getObjectFromResponse(ids[i], object);
				});
			},
			{
				maxBatchSize: 50,
			},
		);
		this.#suiClient = suiClient;
	}

	override async load<T = SuiObjectData>(id: string, schema?: BcsType<T, any>): Promise<T> {
		const data = await super.load(id);

		if (schema) {
			if (data.bcs?.dataType !== 'moveObject') {
				throw new Error(`Object ${id} is not a move object`);
			}

			return schema.fromBase64(data.bcs.bcsBytes);
		}

		return data as T;
	}

	override async loadMany<T = SuiObjectData>(
		ids: string[],
		schema?: BcsType<T, any>,
	): Promise<(T | Error)[]> {
		const data = await super.loadMany(ids);

		if (!schema) {
			return data as (T | Error)[];
		}

		return data.map((d, i) => {
			if (d instanceof Error) {
				return d;
			}

			if (d.bcs?.dataType !== 'moveObject') {
				return new Error(`Object ${ids[i]} is not a move object`);
			}

			return schema.fromBase64(d.bcs.bcsBytes);
		});
	}

	async loadManyOrThrow<T>(ids: string[], schema: BcsType<T, any>): Promise<T[]> {
		const data = await this.loadMany(ids, schema);

		for (const d of data) {
			if (d instanceof Error) {
				throw d;
			}
		}

		return data as T[];
	}

	override clearAll() {
		this.#dynamicFieldCache.clear();
		return super.clearAll();
	}

	override clear(key: string) {
		this.#dynamicFieldCache.delete(key);
		return super.clear(key);
	}

	#getObjectFromResponse(id: string, response: SuiObjectResponse) {
		if (response.error || !response.data) {
			throw new Error(`Failed to fetch object ${id}: ${response.error}`);
		}

		return response.data;
	}

	async loadFieldObject<K extends PureTypeName, T>(
		parent: string,
		name: {
			type: K;
			value: ShapeFromPureTypeName<K>;
		},
		type: BcsType<T, any>,
	): Promise<T> {
		const schema = pureBcsSchemaFromTypeName<K>(name.type as never);
		const id = deriveDynamicFieldID(parent, 'u64', schema.serialize(name.value).toBytes());

		return (await this.load(id, Field(schema, type))).value;
	}
}
