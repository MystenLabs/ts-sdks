// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectButton } from '@mysten/dapp-kit-react';

function App() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '40px' }}>
			<div>
				<h3 style={{ marginBottom: '8px' }}>Default</h3>
				<ConnectButton />
			</div>
			<div>
				<h3 style={{ marginBottom: '8px' }}>Custom ::part(trigger)</h3>
				<ConnectButton className="custom-trigger" />
			</div>
		</div>
	);
}

export default App;
