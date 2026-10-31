// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../client/types.js';
import type { EventFilter, TransactionFilter } from './proto/sui/rpc/v2/filter.js';

type Frames = SuiClientTypes.StreamFrameOptions;

/** `grpcFilter` streams only checkpoints containing a matching transaction. */
export type GrpcStreamCheckpointsOptions<
	Include extends SuiClientTypes.StreamCheckpointInclude = {},
	F extends Frames = {},
> = SuiClientTypes.StreamCheckpointsOptions<Include, F> & { grpcFilter?: TransactionFilter };

/** `grpcFilter` is a native gRPC filter, used instead of the shared `filter`. */
export type GrpcStreamTransactionsOptions<
	Include extends SuiClientTypes.TransactionInclude = {},
	F extends Frames = {},
> = Omit<SuiClientTypes.StreamTransactionsOptions<Include, F>, 'filter'> &
	(
		| { filter?: SuiClientTypes.TransactionFilter; grpcFilter?: never }
		| { filter?: never; grpcFilter: TransactionFilter }
	);

/** `grpcFilter` is a native gRPC filter, used instead of the shared `filter`. */
export type GrpcStreamEventsOptions<F extends Frames = {}> = Omit<
	SuiClientTypes.StreamEventsOptions<F>,
	'filter'
> &
	(
		| { filter?: SuiClientTypes.EventFilter; grpcFilter?: never }
		| { filter?: never; grpcFilter: EventFilter }
	);
