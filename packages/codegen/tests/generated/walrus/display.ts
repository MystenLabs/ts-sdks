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

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, MoveTuple } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as object_bag from './deps/sui/object_bag.js';
const $moduleName = '@local-pkg/walrus::display';
export const ObjectDisplay = new MoveStruct(`${$moduleName}::ObjectDisplay`, {
	id: object.UID,
	inner: object_bag.ObjectBag,
});
export const PublisherKey = new MoveTuple(`${$moduleName}::PublisherKey`, [bcs.bool()]);
