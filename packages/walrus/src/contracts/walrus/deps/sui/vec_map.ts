// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
/**
 * A map data structure backed by a vector. The map is guaranteed not to contain
 * duplicate keys, but entries are _not_ sorted by key--entries are included in
 * insertion order. All operations are O(N) in the size of the map--the intention
 * of this data structure is only to provide the convenience of programming against
 * a map API. Large maps should use handwritten parent/child relationships instead.
 * Maps that need sorted iteration rather than insertion order iteration should
 * also be handwritten.
 */
export function VecMap<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return bcs.struct('VecMap', {
		contents: bcs.vector(Entry(typeParameters[0], typeParameters[1])),
	});
}
/** An entry in the map */
export function Entry<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return bcs.struct('Entry', {
		key: typeParameters[0],
		value: typeParameters[1],
	});
}
