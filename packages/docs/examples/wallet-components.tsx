// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
	ConnectButton,
	ConnectModal,
	SuiClientProvider,
	useCurrentAccount,
	WalletProvider,
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import '@mysten/dapp-kit/dist/index.css';

export const ConnectButtonExample = withProviders(() => {
	return <ConnectButton />;
});

export const ControlledConnectModalExample = withProviders(() => {
	const currentAccount = useCurrentAccount();
	const [open, setOpen] = useState(false);

	return (
		<ConnectModal
			trigger={
				<button disabled={!!currentAccount}> {currentAccount ? 'Connected' : 'Connect'}</button>
			}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		/>
	);
});

export const UncontrolledConnectModalExample = withProviders(() => {
	const currentAccount = useCurrentAccount();

	return (
		<ConnectModal
			trigger={
				<button disabled={!!currentAccount}> {currentAccount ? 'Connected' : 'Connect'}</button>
			}
		/>
	);
});

function withProviders(Component: React.FunctionComponent<object>) {
	const queryClient = new QueryClient();
	const networks = {
		mainnet: { url: getFullnodeUrl('mainnet'), network: 'mainnet' as const },
	};

	return () => {
		return (
			<QueryClientProvider client={queryClient}>
				<SuiClientProvider networks={networks}>
					<WalletProvider
						slushWallet={{
							name: 'dApp Kit Docs',
						}}
					>
						<Component />
					</WalletProvider>
				</SuiClientProvider>
			</QueryClientProvider>
		);
	};
}
