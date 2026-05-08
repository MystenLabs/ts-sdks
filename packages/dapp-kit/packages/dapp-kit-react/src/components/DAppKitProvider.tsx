// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DefaultExpectedDppKit } from '@mysten/dapp-kit-core';
import { createContext } from 'react';
import type { PropsWithChildren } from 'react';

export const DAppKitContext = createContext<DefaultExpectedDppKit | null>(null);

export type DAppKitProviderProps = PropsWithChildren<{
	dAppKit: DefaultExpectedDppKit;
}>;

export function DAppKitProvider({ dAppKit, children }: DAppKitProviderProps) {
	return <DAppKitContext.Provider value={dAppKit}>{children}</DAppKitContext.Provider>;
}
