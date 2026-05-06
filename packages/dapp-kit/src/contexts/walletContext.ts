// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Context } from 'react';
import { createContext } from 'react';

import type { WalletStore } from '../walletStore.js';

export const WalletContext: Context<WalletStore | null> = createContext<WalletStore | null>(null);
