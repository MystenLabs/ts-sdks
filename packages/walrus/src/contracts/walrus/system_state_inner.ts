// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../utils/index.js';
import * as bls_aggregate from './bls_aggregate.js';
import * as storage_accounting from './storage_accounting.js';
import * as event_blob from './event_blob.js';
import * as extended_field from './extended_field.js';
const $moduleName = '@local-pkg/walrus::system_state_inner';
export const SystemStateInnerV1 = new MoveStruct(`${$moduleName}::SystemStateInnerV1`, {
	/** The current committee, with the current epoch. */
	committee: bls_aggregate.BlsCommittee,
	/**
	 * Maximum capacity size for the current and future epochs. Changed by voting on
	 * the epoch parameters.
	 */
	total_capacity_size: bcs.u64(),
	/** Contains the used capacity size for the current epoch. */
	used_capacity_size: bcs.u64(),
	/** The price per unit size of storage. */
	storage_price_per_unit_size: bcs.u64(),
	/** The write price per unit size. */
	write_price_per_unit_size: bcs.u64(),
	/** Accounting ring buffer for future epochs. */
	future_accounting: storage_accounting.FutureAccountingRingBuffer,
	/** Event blob certification state */
	event_blob_certification_state: event_blob.EventBlobCertificationState,
	/**
	 * Sizes of deny lists for storage nodes. Only current committee members can
	 * register their updates in this map. Hence, we don't expect it to bloat.
	 *
	 * Max number of stored entries is ~6500. If there's any concern about the
	 * performance of the map, it can be cleaned up as a side effect of the updates /
	 * registrations.
	 */
	deny_list_sizes: extended_field.ExtendedField,
});
