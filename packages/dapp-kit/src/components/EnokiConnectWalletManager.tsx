// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { SupportedNetwork } from '@mysten/enoki-connect';
import { registerEnokiConnectWallet } from '@mysten/enoki-connect';
import { useEffect } from 'react';

export type EnokiConnectWalletConfig = {
	publicAppSlug: string;
	dappName: string;
	enokiApiUrl?: string;
	network?: SupportedNetwork;
};

export type EnokiConnectWalletManagerProps = {
	enokiApiUrl?: string;
	network?: SupportedNetwork;
	publicAppSlugs: string[];
	dappName: string;
};

export function EnokiConnectWalletManager({
	publicAppSlugs,
	enokiApiUrl,
	network,
	dappName,
}: EnokiConnectWalletManagerProps) {
	const uniqueAppIds = new Set(publicAppSlugs);

	if (uniqueAppIds.size !== publicAppSlugs.length) {
		throw new Error('Duplicate publicAppSlugs are not allowed');
	}

	return publicAppSlugs.map((aPublicAppSlug) => (
		<EnokiConnectWallet
			key={aPublicAppSlug}
			publicAppSlug={aPublicAppSlug}
			enokiApiUrl={enokiApiUrl}
			network={network}
			dappName={dappName}
		/>
	));
}

function EnokiConnectWallet({
	publicAppSlug,
	enokiApiUrl,
	network,
	dappName,
}: EnokiConnectWalletConfig) {
	useEffect(() => {
		async function register() {
			try {
				const { unregister } = await registerEnokiConnectWallet({
					publicAppSlug,
					dappName,
					enokiApiUrl,
					network,
				});

				return unregister;
			} catch (error) {
				// ignore errors (could be network errors, etc.)
				console.log(
					`Failed to register Enoki Connect wallet ${dappName}. PublicAppSlug: ${publicAppSlug}`,
					error,
				);

				return null;
			}
		}

		const enokiConnect = register();

		return () => {
			enokiConnect.then((unregister) => {
				unregister?.();
			});
		};
	}, [publicAppSlug, enokiApiUrl, network, dappName]);

	return null;
}
