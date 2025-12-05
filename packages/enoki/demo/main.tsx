// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import '@mysten/dapp-kit/dist/index.css';

import { App } from './App.tsx';
import { RegisterEnokiWallets } from './RegisterEnokiWallets.tsx';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider
				networks={{
					testnet: {
						network: 'testnet',
						url: getJsonRpcFullnodeUrl('testnet'),
					},
					localnet: {
						network: 'localnet',
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
