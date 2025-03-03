// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { SupportedNetwork } from '@mysten/enoki-connect';
import { registerEnokiConnectWallet } from '@mysten/enoki-connect';
import { useEffect } from 'react';

export type EnokiConnectWalletConfig = {
	appId: string;
	dappName: string;
	enokiApiUrl?: string;
	network?: SupportedNetwork;
};

export type EnokiConnectWalletManagerProps = {
	enokiApiUrl?: string;
	network?: SupportedNetwork;
	appIds: string[];
	dappName: string;
};

export function EnokiConnectWalletManager({
	appIds,
	enokiApiUrl,
	network,
	dappName,
}: EnokiConnectWalletManagerProps) {
	const uniqueAppIds = new Set(appIds);

	if (uniqueAppIds.size !== appIds.length) {
		throw new Error('Duplicate appIds are not allowed');
	}

	return appIds.map((appId) => (
		<EnokiConnectWallet
			key={appId}
			appId={appId}
			enokiApiUrl={enokiApiUrl}
			network={network}
			dappName={dappName}
		/>
	));
}

function EnokiConnectWallet({ appId, enokiApiUrl, network, dappName }: EnokiConnectWalletConfig) {
	useEffect(() => {
		async function register() {
			try {
				const { unregister } = await registerEnokiConnectWallet({
					appId,
					dappName,
					enokiApiUrl,
					network,
				});
				return unregister;
			} catch (error) {
				// ignore errors (could be network errors, etc.)
				console.log(`Failed to register Enoki Connect wallet ${dappName}. AppId: ${appId}`, error);
				return null;
			}
		}

		const enokiConnect = register();

		return () => {
			enokiConnect.then((unregister) => {
				unregister?.();
			});
		};
	}, [appId, enokiApiUrl, network, dappName]);

	return null;
}
