// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import '@mysten/dapp-kit/dist/index.css';

import { getFullnodeUrl } from '../../sui/src/client/network.ts';
import { App } from './App.tsx';
import { RegisterEnokiWallets } from './RegisterEnokiWallets.tsx';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider
				networks={{
					testnet: {
						url: getFullnodeUrl('testnet'),
					},
					localnet: {
						url: 'http://localhost:8000',
					},
				}}
			>
				<RegisterEnokiWallets />
				<WalletProvider autoConnect>
					<App />
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	</React.StrictMode>,
);
