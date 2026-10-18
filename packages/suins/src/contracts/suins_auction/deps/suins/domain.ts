/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `Domain` type and helper functions.
 *
 * Domains are structured similar to their web2 counterpart and the rules
 * determining what a valid domain is can be found here:
 * https://en.wikipedia.org/wiki/Domain_name#Domain_name_syntax
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = 'suins::domain';
export const Domain = new MoveStruct({
	name: `${$moduleName}::Domain`,
	fields: {
		/**
		 * Vector of labels that make up a domain.
		 *
		 * Labels are stored in reverse order such that the TLD is always in position `0`.
		 * e.g. domain "pay.name.sui" will be stored in the vector as ["sui", "name",
		 * "pay"].
		 */
		labels: bcs.vector(bcs.string()),
	},
});
