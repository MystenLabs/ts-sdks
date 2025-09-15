// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DAppKitProvider, ConnectButton } from '@mysten/dapp-kit-react';
import { dAppKit } from './dApp-kit.ts';

export default function ClientOnlyConnectButton() {
	return (
		<DAppKitProvider dAppKit={dAppKit}>
			<ConnectButton />
		</DAppKitProvider>
	);
}
