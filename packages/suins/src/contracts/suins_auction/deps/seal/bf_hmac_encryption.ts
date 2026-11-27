/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Implementation of decryption for Seal using Boneh-Franklin over BLS12-381 as KEM
 * and Hmac256Ctr as DEM. Refer usage at docs
 * https://seal-docs.wal.app/UsingSeal/#on-chain-decryption
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as group_ops from '../sui/group_ops.js';
const $moduleName = 'seal::bf_hmac_encryption';
export const EncryptedObject = new MoveStruct({
	name: `${$moduleName}::EncryptedObject`,
	fields: {
		package_id: bcs.Address,
		id: bcs.vector(bcs.u8()),
		indices: bcs.vector(bcs.u8()),
		services: bcs.vector(bcs.Address),
		threshold: bcs.u8(),
		nonce: group_ops.Element,
		encrypted_shares: bcs.vector(bcs.vector(bcs.u8())),
		encrypted_randomness: bcs.vector(bcs.u8()),
		blob: bcs.vector(bcs.u8()),
		aad: bcs.option(bcs.vector(bcs.u8())),
		mac: bcs.vector(bcs.u8()),
	},
});
