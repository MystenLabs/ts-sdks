/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Container for the package's governance proposals, hung off `Hashi`. Active and
 * executed proposals live in two separate object bags so that each set can be
 * enumerated directly, and executed proposals are archived indefinitely to keep
 * historical governance actions inspectable.
 */

import { MoveStruct } from '../utils/index.js';
import * as object_bag from './deps/sui/object_bag.js';
const $moduleName = '@local-pkg/hashi::proposals';
export const Proposals = new MoveStruct({
	name: `${$moduleName}::Proposals`,
	fields: {
		/** Proposals that have been created but not yet executed. */
		active: object_bag.ObjectBag,
		/**
		 * Proposals that have executed successfully. Kept indefinitely so historical
		 * governance actions remain inspectable.
		 */
		executed: object_bag.ObjectBag,
	},
});
