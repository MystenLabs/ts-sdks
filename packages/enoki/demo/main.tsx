// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DAppKitProvider } from '@mysten/dapp-kit-react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App.js';
import { RegisterEnokiWallets } from './RegisterEnokiWallets.js';
import { dAppKit } from './dapp-kit.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<DAppKitProvider dAppKit={dAppKit}>
			<RegisterEnokiWallets />
			<App />
		</DAppKitProvider>
	</React.StrictMode>,
);
