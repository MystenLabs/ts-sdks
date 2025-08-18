// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit } from '@mysten/dapp-kit-core';
import { useConnection } from './useConnection.js';

export type UseCurrentAccountOptions<TDAppKit extends DAppKit> = {
	dAppKit?: TDAppKit;
};

export function useCurrentAccount<TDAppKit extends DAppKit<any> = RegisteredDAppKit>({
	dAppKit,
}: UseCurrentAccountOptions<TDAppKit> = {}) {
	const connection = useConnection({ dAppKit });
	return connection.account;
}
