// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/sui/bcs';
import { bcs } from '@mysten/sui/bcs';

export const PriceIdentifier = bcs.struct('PriceIdentifier', {
	bytes: bcs.byteVector(),
});

const UpgradeCap = bcs.struct('UpgradeCap', {
	id: bcs.Address,
	package: bcs.Address,
	version: bcs.u64(),
	policy: bcs.u8(),
});

const Table = bcs.struct('Table', {
	id: bcs.Address,
	size: bcs.u64(),
});

const ConsumedVAAs = bcs.struct('ConsumedVAAs', {
	hashes: Table,
});

const PythDataSource = bcs.struct('DataSource', {
	emitter_chain: bcs.u64(),
	emitter_address: bcs.byteVector(),
});

export const PythState = bcs.struct('State', {
	id: bcs.Address,
	governance_data_source: PythDataSource,
	stale_price_threshold: bcs.u64(),
	base_update_fee: bcs.u64(),
	fee_recipient_address: bcs.Address,
	last_executed_governance_sequence: bcs.u64(),
	consumed_vaas: ConsumedVAAs,
	upgrade_cap: UpgradeCap,
});

export function VecMap<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	...typeParameters: [T0, T1]
) {
	return bcs.struct('VecMap', {
		contents: bcs.vector(Entry(typeParameters[0], typeParameters[1])),
	});
}
export function Entry<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	...typeParameters: [T0, T1]
) {
	return bcs.struct('Entry', {
		key: typeParameters[0],
		value: typeParameters[1],
	});
}

export const Range = bcs.tuple([bcs.u64(), bcs.u64()]);

export const PricingConfig = bcs.struct('PricingConfig', {
	pricing: VecMap(Range, bcs.u64()),
});

export const RenewalConfig = bcs.struct('RenewalConfig', {
	config: PricingConfig,
});

export const CoinTypeData = bcs.struct('CoinTypeData', {
	decimals: bcs.u8(),
	discount_percentage: bcs.u8(),
	price_feed_id: bcs.byteVector(),
	type_name: bcs.string(),
});

export const PaymentsConfig = bcs.struct('PaymentsConfig', {
	currencies: VecMap(bcs.string(), CoinTypeData),
	base_currency: bcs.string(),
	max_age: bcs.u64(),
});

export const NameRecord = bcs.struct('NameRecord', {
	id: bcs.u64(),
	nft_id: bcs.Address,
	expiration_timestamp_ms: bcs.u64(),
	target_address: bcs.option(bcs.Address),
	data: VecMap(bcs.string(), bcs.string()),
});
