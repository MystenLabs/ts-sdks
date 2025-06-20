// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';
import { pureBcsSchemaFromTypeName } from '@mysten/sui/bcs';
import type { PureTypeName, ShapeFromPureTypeName } from '@mysten/sui/bcs';
import type { SuiObjectData } from '@mysten/sui/client';
import type {
	Experimental_BaseClient,
	Experimental_SuiClientTypes,
} from '@mysten/sui/experimental';
import { deriveDynamicFieldID } from '@mysten/sui/utils';
import DataLoader from 'dataloader';
import { Field } from './bcs.js';

export class SuiObjectDataLoader extends DataLoader<
	string,
	Experimental_SuiClientTypes.ObjectResponse
> {
	#dynamicFieldCache = new Map<string, Map<string, Experimental_SuiClientTypes.ObjectResponse>>();
	constructor(suiClient: Experimental_BaseClient) {
		super(async (ids: readonly string[]) => {
			const { objects } = await suiClient.core.getObjects({
				objectIds: ids as string[],
			});

			return objects;
		});
	}

	override async load<T = SuiObjectData>(id: string, schema?: BcsType<T, any>): Promise<T> {
		const data = await super.load(id);

		if (schema) {
			return schema.parse(await data.content);
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

		return Promise.all(
			data.map(async (d) => {
				if (d instanceof Error) {
					return d;
				}

				return schema.parse(await d.content);
			}),
		);
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
