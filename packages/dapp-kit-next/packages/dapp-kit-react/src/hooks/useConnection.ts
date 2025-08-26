// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit } from '@mysten/dapp-kit-core';
import { useStore } from '@nanostores/react';
import { useDAppKit } from './useDAppKit.js';

export type UseConnectionOptions<TDAppKit extends DAppKit<any>> = {
	dAppKit?: TDAppKit;
};

export function useConnection<TDAppKit extends DAppKit = RegisteredDAppKit>({
	dAppKit,
}: UseConnectionOptions<TDAppKit> = {}) {
	const instance = useDAppKit(dAppKit);
	return useStore(instance.stores.$connection);
}
