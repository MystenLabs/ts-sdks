/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Handles creation of the `SuinsRegistration`s. Separates the logic of creating a
 * `SuinsRegistration`. New `SuinsRegistration`s can be created only by the
 * `registry` and this module is tightly coupled with it.
 *
 * When reviewing the module, make sure that:
 *
 * - mutable functions can't be called directly by the owner
 * - all getters are public and take an immutable reference
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as domain from './domain.js';
const $moduleName = 'suins::suins_registration';
export const SuinsRegistration = new MoveStruct({
	name: `${$moduleName}::SuinsRegistration`,
	fields: {
		id: bcs.Address,
		/** The parsed domain. */
		domain: domain.Domain,
		/** The domain name that the NFT is for. */
		domain_name: bcs.string(),
		/** Timestamp in milliseconds when this NFT expires. */
		expiration_timestamp_ms: bcs.u64(),
		/** Short IPFS hash of the image to be displayed for the NFT. */
		image_url: bcs.string(),
	},
});
