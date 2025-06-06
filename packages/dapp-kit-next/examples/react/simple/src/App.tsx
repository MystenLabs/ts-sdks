// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedRegister } from '@mysten/dapp-kit-react';
import { ConnectButton, useCurrentNetwork, useWallets } from '@mysten/dapp-kit-react';
import { dAppKit } from './dApp-kit.js';

function App() {
	// dAppKit.switchNetwork({ network: 'mainnet' });
	const wallets = useWallets(dAppKit);
	console.log(wallets);

	// Correct
	const currentNetwork2 = useCurrentNetwork({ dAppKit });
	console.log(currentNetwork2);

	// Correct
	const currentNetwork = useCurrentNetwork();
	console.log(currentNetwork);

	// correct
	const _correct = dAppKit.stores.$currentNetwork.get();
	type _alsoCorrect = ResolvedRegister['dAppKit']['stores']['$currentNetwork'];

	return (
		<div>
			<ConnectButton store={dAppKit} />
		</div>
	);
}

export default App;
