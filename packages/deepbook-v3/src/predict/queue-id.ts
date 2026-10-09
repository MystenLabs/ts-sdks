// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// A leaf module with no SDK imports, so `/sessions` can derive queue IDs without pulling the
// `/predict` module graph in.
import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID } from '@mysten/sui/utils';

/**
 * The ID of `expiryMarketId`'s `MarketQueue` under the queue registry `registryId`, whether or not
 * the queue exists yet: Sui's `derived_object::derive_address(registry_id, expiry_market_id)`, as
 * `queue::queue_id` computes it on chain. The parent is the order-flow package's `QueueRegistry`,
 * not its `OrderDesk`. The key is the market's `0x2::object::ID`, whose BCS is the bare 32-byte
 * address. Each market has exactly one queue, created once by the permissionless
 * `queue::create_and_share`.
 */
export function deriveQueueId(registryId: string, expiryMarketId: string): string {
	return deriveObjectID(
		registryId,
		'0x2::object::ID',
		bcs.Address.serialize(expiryMarketId).toBytes(),
	);
}
