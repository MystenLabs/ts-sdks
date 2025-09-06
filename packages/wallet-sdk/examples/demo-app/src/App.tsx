// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { dAppKit } from './dApp-kit.js';
import { DemoWallet } from './wallet/index.js';
import { DemoApp } from './DemoApp.js';

function App() {
	return (
		<DAppKitProvider dAppKit={dAppKit}>
			<Theme>
				<div
					style={{
						minHeight: '100vh',
						backgroundColor: '#f5f5f5',
						position: 'relative',
					}}
				>
					{/* Main App Content */}
					<div
						style={{
							marginRight: '380px', // Make space for the fixed sidebar
							minHeight: '100vh',
						}}
					>
						<DemoApp />
					</div>

					{/* Demo Wallet */}
					<DemoWallet />
				</div>
			</Theme>
		</DAppKitProvider>
	);
}

export default App;
