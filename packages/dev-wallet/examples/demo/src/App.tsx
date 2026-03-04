// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import {
	InMemorySignerAdapter,
	PasskeySignerAdapter,
	WebCryptoSignerAdapter,
} from '@mysten/dev-wallet/adapters';
import { useDevWallet } from '@mysten/dev-wallet/react';
import { useCallback, useMemo, useState } from 'react';
import { BalanceDisplay } from './demos/BalanceDisplay.tsx';
import { FaucetButton } from './demos/FaucetButton.tsx';
import { MintNFT } from './demos/MintNFT.tsx';
import { SignMessage } from './demos/SignMessage.tsx';
import { StandaloneSetup } from './demos/StandaloneSetup.tsx';
import { TransactionDemo } from './demos/TransactionDemo.tsx';
import { Transfer } from './demos/Transfer.tsx';

const DEMOS = [
	{ id: 'transfer', label: 'Transfer', Component: Transfer },
	{ id: 'sign-message', label: 'Sign Message', Component: SignMessage },
	{ id: 'transaction', label: 'Transaction', Component: TransactionDemo },
	{ id: 'mint-nft', label: 'Mint NFT', Component: MintNFT },
] as const;

export function App() {
	const [activeDemo, setActiveDemo] = useState<string>('transfer');
	const [balanceKey, setBalanceKey] = useState(0);
	const account = useCurrentAccount();
	const client = useCurrentClient();
	const refreshBalance = useCallback(() => setBalanceKey((k) => k + 1), []);

	const adapters = useMemo(
		() => [new WebCryptoSignerAdapter(), new InMemorySignerAdapter(), new PasskeySignerAdapter()],
		[],
	);

	useDevWallet({
		adapters,
		name: 'Dev Wallet',
		createInitialAccount: true,
		mountUI: true,
		autoConnect: true,
	});

	const ActiveComponent = DEMOS.find((d) => d.id === activeDemo)?.Component ?? Transfer;

	return (
		<div className="max-w-3xl mx-auto px-4 py-6">
			<header className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-white">Dev Wallet Demo</h1>
					<p className="text-sm text-slate-400 mt-1">
						Connect a dev wallet via dapp-kit and test signing flows
					</p>
				</div>
				<div className="flex items-center gap-3">
					{account && <FaucetButton onSuccess={refreshBalance} />}
					<ConnectButton />
				</div>
			</header>

			{account ? (
				<>
					<div className="mb-6">
						<BalanceDisplay key={balanceKey} address={account.address} client={client} />
					</div>
					<nav className="flex gap-1 border-b border-slate-800 mb-6">
						{DEMOS.map((demo) => (
							<button
								key={demo.id}
								onClick={() => setActiveDemo(demo.id)}
								className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
									activeDemo === demo.id
										? 'text-indigo-400 border-indigo-400'
										: 'text-slate-500 border-transparent hover:text-slate-300'
								}`}
							>
								{demo.label}
							</button>
						))}
					</nav>
					<ActiveComponent key={activeDemo} />
				</>
			) : (
				<div className="text-center py-20">
					<p className="text-slate-400 text-lg mb-2">No wallet connected</p>
					<p className="text-slate-500 text-sm">
						Click the connect button above to select the Embedded Dev Wallet or register a
						standalone wallet below.
					</p>
				</div>
			)}

			<StandaloneSetup />
		</div>
	);
}
