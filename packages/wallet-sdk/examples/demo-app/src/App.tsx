// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { dAppKit } from './dApp-kit.js';
import { DemoWallet } from './wallet/components/core/DemoWallet.js';
import { DemoApp } from './DemoApp.js';

function App() {
	return (
		<DAppKitProvider dAppKit={dAppKit}>
			<Theme>
				<div className="relative">
					{/* Main App Content */}
					<div className="mr-[380px] min-h-screen">
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
