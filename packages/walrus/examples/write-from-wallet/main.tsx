// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@mysten/dapp-kit/dist/index.css';
import { createRoot } from 'react-dom/client';
import { SuiClientProvider, WalletProvider, ConnectButton } from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { FileUpload } from './upload.js';

const queryClient = new QueryClient();
const networks = {
	testnet: getFullnodeUrl('testnet'),
};

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider
				networks={{ testnet: { url: networks.testnet } }}
				createClient={(network, options) =>
					new SuiClient({
						...options,
						network,
					})
				}
				defaultNetwork="testnet"
			>
				<WalletProvider autoConnect>
					<div>
						<h1>Walrus Write from Wallet Example</h1>
						<div style={{ marginBottom: '20px' }}>
							<ConnectButton />
						</div>
						<FileUpload
							onComplete={(ids) => {
								console.log('Upload completed! File IDs:', ids);
								alert(`Upload completed! File IDs: ${ids.join(', ')}`);
							}}
						/>
					</div>
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	);
}

createRoot(document.getElementById('root')!).render(<App />);
