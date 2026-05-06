// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DefaultExpectedDppKit } from '@mysten/dapp-kit-core';
import type { Context, JSX } from 'react';
import { createContext } from 'react';
import type { PropsWithChildren } from 'react';

export const DAppKitContext: Context<DefaultExpectedDppKit | null> =
	createContext<DefaultExpectedDppKit | null>(null);

export type DAppKitProviderProps = PropsWithChildren<{
	dAppKit: DefaultExpectedDppKit;
}>;

export function DAppKitProvider({ dAppKit, children }: DAppKitProviderProps): JSX.Element {
	return <DAppKitContext.Provider value={dAppKit}>{children}</DAppKitContext.Provider>;
}
