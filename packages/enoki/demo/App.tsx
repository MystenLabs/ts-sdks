// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	ConnectButton,
	useConnectWallet,
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSuiClientContext,
	useWallets,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';

import { isEnokiWallet } from '../src/wallet/index.js';

export function App() {
	const { mutate: connect } = useConnectWallet();
	const currentAccount = useCurrentAccount();
	const [result, setResult] = useState<any>();

	const wallets = useWallets().filter(isEnokiWallet);
	const googleWallet = wallets.find((wallet) => wallet.provider === 'google');

	const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
	const { selectNetwork, networks } = useSuiClientContext();

	return (
		<div>
			<ConnectButton walletFilter={(wallet) => !isEnokiWallet(wallet)} />

			{googleWallet ? (
				<button
					disabled={!!currentAccount}
					onClick={() => {
						connect({ wallet: googleWallet });
					}}
				>
					{currentAccount?.address ?? 'Sign in with Google'}
				</button>
			) : null}

			{currentAccount && (
				<button
					onClick={async () => {
						try {
							const transaction = new Transaction();
							transaction.moveCall({
								target:
									'0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access',
								arguments: [transaction.object('0x6')],
							});

							const result = await signAndExecute({ transaction });
							setResult(result.digest);
						} catch (e) {
							console.log(e);
							setResult({ error: (e as Error).stack });
						}
					}}
				>
					Sign transaction
				</button>
			)}

			{result && <div>{JSON.stringify(result)}</div>}

			<ul>
				{Object.keys(networks).map((network) => (
					<li key={network}>
						<button onClick={() => selectNetwork(network)}>{network}</button>
					</li>
				))}
			</ul>
		</div>
	);
}
