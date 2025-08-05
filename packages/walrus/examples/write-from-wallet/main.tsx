// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRoot } from 'react-dom/client';
import { DAppKitProvider, ConnectButton } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { dAppKit } from './dapp-kit.js';
import { FileUpload } from './upload.js';
import { BenchmarkPage } from './benchmark.js';

const queryClient = new QueryClient();

function App() {
	const [activeTab, setActiveTab] = useState<'upload' | 'benchmark'>('upload');

	return (
		<QueryClientProvider client={queryClient}>
			<DAppKitProvider dAppKit={dAppKit}>
				<div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
					<h1>Walrus Examples</h1>
					<div style={{ marginBottom: '20px' }}>
						<ConnectButton />
					</div>

					<div style={{ marginBottom: '20px' }}>
						<button
							onClick={() => setActiveTab('upload')}
							style={{
								padding: '10px 20px',
								marginRight: '10px',
								backgroundColor: activeTab === 'upload' ? '#0070f3' : '#f0f0f0',
								color: activeTab === 'upload' ? 'white' : 'black',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
							}}
						>
							File Upload
						</button>
						<button
							onClick={() => setActiveTab('benchmark')}
							style={{
								padding: '10px 20px',
								backgroundColor: activeTab === 'benchmark' ? '#0070f3' : '#f0f0f0',
								color: activeTab === 'benchmark' ? 'white' : 'black',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
							}}
						>
							Benchmark
						</button>
					</div>

					{activeTab === 'upload' ? (
						<FileUpload
							onComplete={(ids) => {
								console.log('Upload completed! File IDs:', ids);
								alert(`Upload completed! File IDs: ${ids.join(', ')}`);
							}}
						/>
					) : (
						<BenchmarkPage />
					)}
				</div>
			</DAppKitProvider>
		</QueryClientProvider>
	);
}

createRoot(document.getElementById('root')!).render(<App />);
