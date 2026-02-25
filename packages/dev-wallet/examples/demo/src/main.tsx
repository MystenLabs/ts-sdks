// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import './index.css';

import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { dAppKit } from './dApp-kit.ts';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<DAppKitProvider dAppKit={dAppKit}>
			<App />
		</DAppKitProvider>
	</StrictMode>,
);
