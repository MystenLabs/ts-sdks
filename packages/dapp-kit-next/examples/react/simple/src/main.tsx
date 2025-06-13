// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { dAppKit } from './dApp-kit.ts';
import App from './App.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<DAppKitProvider dAppKit={dAppKit}>
			<App />
		</DAppKitProvider>
	</StrictMode>,
);
