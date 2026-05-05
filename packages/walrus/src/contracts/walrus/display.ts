/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Implements Sui Object Display for user-owned objects.
 *
 * The default fields for Display are:
 *
 * - name
 * - description
 * - image_url
 * - link
 * - project_url
 *
 * Optionally:
 *
 * - thumbnail_url
 * - creator
 */

import { MoveStruct, MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object_bag from './deps/sui/object_bag.js';
const $moduleName = '@local-pkg/walrus::display';
export const ObjectDisplay: MoveStruct<{
	id: typeof bcs.Address;
	inner: typeof object_bag.ObjectBag;
}> = new MoveStruct({
	name: `${$moduleName}::ObjectDisplay`,
	fields: {
		id: bcs.Address,
		inner: object_bag.ObjectBag,
	},
});
export const PublisherKey: MoveTuple<[ReturnType<typeof bcs.bool>]> = new MoveTuple({
	name: `${$moduleName}::PublisherKey`,
	fields: [bcs.bool()],
});
