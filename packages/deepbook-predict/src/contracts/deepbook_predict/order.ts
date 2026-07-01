/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Immutable contract terms encoded in a Predict order ID.
 *
 * An `Order` represents the durable contract terms needed after mint: the lower
 * and higher strike ticks, quantity, the static floor amount (`floor_shares = F`),
 * and the expiry-local sequence. Mint-only inputs such as entry probability,
 * leverage, net premium, and fee policy intentionally live outside this module.
 * The packed ID is the single source of truth at protocol boundaries; raw strike
 * conversion (through the owning market's `tick_size`) is interpreted by
 * `StrikeExposure`.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::order';
export const Order = new MoveStruct({
	name: `${$moduleName}::Order`,
	fields: {
		id: bcs.u256(),
	},
});
