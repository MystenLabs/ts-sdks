// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectButton, useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';

import { isEnokiWallet, isGoogleWallet } from '../src/wallet/utils.js';
import { dAppKit } from './dapp-kit.js';

export function App() {
	const { connectWallet, signAndExecuteTransaction, switchNetwork } = useDAppKit();
	const currentAccount = useCurrentAccount();
	const [result, setResult] = useState<any>();

	const wallets = useWallets().filter(isEnokiWallet);
	const googleWallet = wallets.find(isGoogleWallet);

	return (
		<div>
			<ConnectButton modalOptions={{ filterFn: (wallet) => !isEnokiWallet(wallet) }} />

			{googleWallet ? (
				<button
					disabled={!!currentAccount}
					onClick={async () => {
						try {
							await connectWallet({ wallet: googleWallet });
						} catch (e) {
							console.log(e);
						}
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

							const txResult = await signAndExecuteTransaction({ transaction });
							const digest =
								txResult.$kind === 'Transaction'
									? txResult.Transaction.digest
									: txResult.FailedTransaction.digest;
							setResult(digest);
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
				{dAppKit.networks.map((network) => (
					<li key={network}>
						<button onClick={() => switchNetwork(network)}>{network}</button>
					</li>
				))}
			</ul>
		</div>
	);
}
