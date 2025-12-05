// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';
import { pureBcsSchemaFromTypeName } from '@mysten/sui/bcs';
import type { PureTypeName, ShapeFromPureTypeName } from '@mysten/sui/bcs';
import type { SuiObjectData } from '@mysten/sui/jsonRpc';
import type { BaseClient, SuiClientTypes } from '@mysten/sui/client';
import { deriveDynamicFieldID } from '@mysten/sui/utils';
import DataLoader from 'dataloader';
import { Field } from './bcs.js';

export class SuiObjectDataLoader extends DataLoader<
	string,
	SuiClientTypes.ObjectResponse<{ content: true }>
> {
	#dynamicFieldCache = new Map<
		string,
		Map<string, SuiClientTypes.ObjectResponse<{ content: true }>>
	>();
	constructor(suiClient: BaseClient) {
		super(async (ids: readonly string[]) => {
			const { objects } = await suiClient.core.getObjects({
				objectIds: ids as string[],
				include: { content: true },
			});

			return objects;
		});
	}

	override async load<T = SuiObjectData>(id: string, schema?: BcsType<T, any>): Promise<T> {
		const data = await super.load(id);

		if (schema) {
			return schema.parse(data.content);
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

		return data.map((d) => {
			if (d instanceof Error) {
				return d;
			}

			return schema.parse(d.content);
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
